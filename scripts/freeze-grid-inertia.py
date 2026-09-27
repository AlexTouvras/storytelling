"""Freeze the keyless part of the grid-inertia evidence pack.

Usage: python3 scripts/freeze-grid-inertia.py [first-month last-month]
       (default 2025-08 2026-07) → data/figures/how-much-fast-reserve.v0.json

v0 is partial on purpose. Hourly kinetic energy (Fingrid 260) and FFR volumes
(276/278) need a Fingrid API key and are listed under `pending`; v1 adds them.
Every block carries a `kind`.
"""

import csv
import importlib.util
import json
import os
import shutil
import sys
import tempfile
import urllib.request
from datetime import date

import numpy as np
import py7zr

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("scan", os.path.join(HERE, "scan-grid-events.py"))
scan = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scan)

OUT = os.path.join(HERE, "..", "data", "figures", "how-much-fast-reserve.v0.json")
BEFORE_S, AFTER_S = 60, 150

PUBLISHED = [
    {"id": "floor", "text": "After the reference incident the instantaneous frequency minimum shall stay at or above 49.0 Hz; indiscriminate load shedding starts at 48.8 Hz.", "value": {"floor_hz": 49.0, "shedding_hz": 48.8}, "source": "nordic-tsos-2025"},
    {"id": "reference-incident", "text": "The reference incident is the loss of Oskarshamn 3 at 1,450 MW. Olkiluoto 3 counts as 1,300 MW because its protection scheme sheds 300 MW of load when it trips.", "value": {"mw": 1450, "olkiluoto3_mw": 1300}, "source": "nordic-tsos-2025"},
    {"id": "design-kinetic", "text": "FCR-D alone keeps the frequency above 49.0 Hz after the reference incident down to 150 GWs.", "value": {"gws": 150}, "source": "nordic-tsos-2025"},
    {"id": "stability-kinetic", "text": "120 GWs is the stability design level; stability is challenged around 90 GWs.", "value": {"gws": 120, "challenged_gws": 90}, "source": "nordic-tsos-2025"},
    {"id": "low-inertia-ffr", "text": "At 100 GWs, roughly 300 MW of FFR in the Nordic system keeps the frequency minimum above 49.0 Hz after the reference incident. Procurement adds a margin for model and forecast error.", "value": {"gws": 100, "ffr_mw": 300}, "source": "nordic-tsos-2025"},
    {"id": "mass-for-tenth", "text": "The extra kinetic energy needed to raise the frequency minimum by 0.1 Hz in an 80 GWs system is 20 GWs.", "value": {"at_gws": 80, "extra_gws": 20, "hz": 0.1}, "source": "orum-2017"},
    {"id": "inertia-kpis", "text": "Nordic kinetic energy, pre-disturbance, per year.", "value": {"years": [2020, 2021, 2022, 2023, 2024], "max_gws": [256, 256, 255, 260, 270], "min_gws": [135, 110, 138, 127, 131], "mean_gws": [190, 195, 193, 194, 194], "sd_gws": [25, 31, 24, 25, 27], "hours_below_150": [243, 559, 88, 237, 339], "hours_below_120": [0, 52, 0, 0, 0]}, "source": "nordic-tsos-2025"},
    {"id": "ffr-product", "text": "FFR activates fully within 1.3 s at 49.7 Hz, 1.0 s at 49.6 Hz or 0.7 s at 49.5 Hz. Fingrid procures 0–60 MW, only in low-inertia hours, mostly spring to autumn.", "value": {"options": [[49.7, 1.3], [49.6, 1.0], [49.5, 0.7]], "fingrid_mw": [0, 60]}, "source": "fingrid-ffr"},
]

SOURCES = {
    "fingrid-339": {"name": "Fingrid open data, Frequency – historical data (dataset 339)", "url": "https://data.fingrid.fi/en/datasets/339", "licence": "CC BY 4.0", "attribution": "Source: Fingrid, data.fingrid.fi, licence CC BY 4.0"},
    "nordic-tsos-2025": {"name": "Nordic TSOs, Requirements for minimum inertia in the Nordic power system, 28 August 2025", "url": "https://eepublicdownloads.blob.core.windows.net/public-cdn-container/clean-documents/SOC%20documents/Nordic/2025/2025_-_Requirements_for_minimum_inertia_in_the_Nordic_power_system.pdf"},
    "ffr-design-2024": {"name": "Nordic TSOs, FFR Design of Requirements, external document v1.0", "url": "https://eepublicdownloads.blob.core.windows.net/public-cdn-container/clean-documents/SOC%20documents/Nordic/2024/1c_-_FFR_Design_Requirements_v1.0_-_external_document.pdf"},
    "orum-2017": {"name": "Ørum et al. 2017, Future System Inertia 2, p. 101, as cited in Energinet's FFR methodology", "url": "https://www.energinet.dk/media/iiolq115/method-for-technical-requirements-for-and-new-procurement-of-ffr.pdf"},
    "fingrid-ffr": {"name": "Fingrid, Fast Frequency Reserve FFR", "url": "https://www.fingrid.fi/en/electricity-market/reserves/reserve-products/fast-frequency-reserve-ffr/"},
}


def months_between(first, last):
    y, m = int(first[:4]), int(first[5:])
    while f"{y:04d}-{m:02d}" <= last:
        yield f"{y:04d}-{m:02d}"
        m += 1
        if m == 13:
            y, m = y + 1, 1


def featured_trace(event_t):
    """10 Hz window around the event, raw and median-filtered, from its day's file."""
    month, day = event_t[:7], event_t[:10]
    work = tempfile.mkdtemp(prefix="fingrid-trace-")
    try:
        archive = os.path.join(work, "m.7z")
        urllib.request.urlretrieve(f"https://data.fingrid.fi/files/339/{month[:4]}/{month}.7z", archive)
        with py7zr.SevenZipFile(archive) as z:
            z.extract(path=work, targets=[f"{month}/Taajuusdata{day}.csv"])
        times, values = scan.read_day(os.path.join(work, month, f"Taajuusdata{day}.csv"))
    finally:
        for root, dirs, files in os.walk(work):
            for name in dirs + files:
                os.chmod(os.path.join(root, name), 0o700)
        shutil.rmtree(work, ignore_errors=True)
    start = next(i for i, t in enumerate(times) if t[:21] >= event_t[:21])
    lo, hi = start - BEFORE_S * 10, start + AFTER_S * 10
    raw = values[lo:hi]
    clean = raw.copy()
    clean[(clean < 49) | (clean > 51)] = 50.0
    smooth = np.median(scan.sliding_window_view(np.pad(clean, 4, mode="edge"), 9), axis=1)
    return {
        "start": times[lo][:21],
        "event_index": BEFORE_S * 10,
        "sample_seconds": 0.1,
        "raw_hz": [round(float(v), 4) for v in raw],
        "filtered_hz": [round(float(v), 4) for v in smooth],
    }


def main():
    first, last = (sys.argv[1], sys.argv[2]) if len(sys.argv) > 2 else ("2025-08", "2026-07")
    months = []
    for m in months_between(first, last):
        months.append(scan.scan_month(m))
        print(f"{m}: {len(months[-1]['events'])} events", file=sys.stderr)
    events = [e for m in months for e in m["events"]]
    trips = [e for e in events if not e["on_hour"]]
    featured = min(trips, key=lambda e: e["nadir"])
    pack = {
        "id": "how-much-fast-reserve",
        "version": 0,
        "generated": date.today().isoformat(),
        "status": "partial: kinetic energy and FFR volumes pending a Fingrid API key",
        "sources": SOURCES,
        "method": {
            "window": {"first_month": first, "last_month": last},
            "filter": "median over 9 samples (0.9 s); samples outside 49–51 Hz are gaps and read as 50 Hz",
            "event": "fall of more than 100 mHz within 5 s, at least 2 min after the previous one; nadir is the minimum within 20 s",
            "event_time": "`t` is the start of the 5 s window the fall is detected in, so the fall itself begins up to 5 s later; the featured trace's `event_index` is `t`",
            "on_hour": "a fall within 20 s of the hour is a market-schedule step, not a trip, and is excluded from trip counts",
            "why_filter": "the raw series has 1–2-sample spikes (one reads 48.86 Hz between two 50.07 Hz samples); a raw minimum would report near-misses that never happened",
        },
        "coverage": {
            "kind": "observed",
            "source": "fingrid-339",
            "months": [{"month": m["month"], "samples": m["samples"], "gap_share": round(m["gap_share"], 6)} for m in months],
            "samples": sum(m["samples"] for m in months),
        },
        "events": {
            "kind": "observed",
            "source": "fingrid-339",
            "all": events,
            "summary": {
                "sustained_falls": len(events),
                "on_hour": len(events) - len(trips),
                "trips": len(trips),
                "trips_apr_sep": sum(1 for e in trips if e["t"][5:7] in ("04", "05", "06", "07", "08", "09")),
                "trips_below_49_8": sum(1 for e in trips if e["nadir"] < 49.8),
                "deepest_hz": min(e["nadir"] for e in trips),
                "any_below_49_6": any(e["nadir"] < 49.6 for e in trips),
            },
            "caveat": "A fixed threshold counts more events when inertia is low, because the same loss falls further; the spring–summer cluster cannot be split between low inertia and more trips until each event is paired with its hour's kinetic energy.",
        },
        "featured_event": {"kind": "observed", "source": "fingrid-339", "event": featured, "trace": featured_trace(featured["t"])},
        "published": {"kind": "observed-published", "figures": PUBLISHED},
        "pending": [
            {"dataset": 260, "name": "Kinetic energy of the Nordic power system, 15 min", "needs": "FINGRID_API_KEY"},
            {"dataset": 276, "name": "FFR procured volume, 1 h", "needs": "FINGRID_API_KEY"},
            {"dataset": 278, "name": "FFR procurement forecast, 1 h", "needs": "FINGRID_API_KEY"},
        ],
        "limitations": [
            "Which unit tripped is not in the open data; events are unattributed.",
            "Frequency is measured at Finnish 400 kV substations; the Nordic system shares one frequency, but local oscillation is not separated.",
            "Kinetic energy is itself an operator estimate.",
            "Finland's FFR is one share of a Nordic need.",
            "Our model is one-bus and fitted to published design points; it draws shapes and is never quoted as a figure.",
            "No event in the window came near 49.0 Hz; the story is about margin, not a near-miss.",
        ],
    }
    with open(OUT, "w") as fh:
        json.dump(pack, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    print(f"wrote {OUT} ({os.path.getsize(OUT)} bytes)", file=sys.stderr)


if __name__ == "__main__":
    main()
