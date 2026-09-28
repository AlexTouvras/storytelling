"""Freeze the grid-inertia evidence pack.

Usage: python3 scripts/freeze-grid-inertia.py [--scan scan.json] [first-month last-month]
       (default 2025-08 2026-07) → data/figures/how-much-fast-reserve.v1.json

Needs the Fingrid cache written by scripts/fetch-fingrid.py:
  260 (kinetic energy) 2020-01 → last month, 276 (FFR procured) 2020-01 → last month.
`--scan` reuses the output of scripts/scan-grid-events.py for the same months
instead of downloading the 10 Hz archives again.

Every block carries a `kind`: `observed` (operator data as published),
`calculated` (our arithmetic on observed data), `observed-published` (figures
quoted from a named report). Nothing here is modelled; the model's comparison
with these events lives in src/lib/sim/grid-validation.ts.
"""

import argparse
import bisect
import importlib.util
import json
import os
import shutil
import statistics
import tempfile
import urllib.request
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import numpy as np
import py7zr

HERE = os.path.dirname(os.path.abspath(__file__))


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, file))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


scan = load("scan", "scan-grid-events.py")
fetch = load("fetch", "fetch-fingrid.py")

OUT = os.path.join(HERE, "..", "data", "figures", "how-much-fast-reserve.v1.json")
BEFORE_S, AFTER_S = 60, 150
# The 10 Hz archive is in Finnish local time: 2026-03-29 has no 03:00 hour.
HELSINKI = ZoneInfo("Europe/Helsinki")
KPI_YEARS = [2020, 2021, 2022, 2023, 2024]
SUMMER = ("04", "05", "06", "07", "08", "09")
LARGE_LOSS_MW = 600

# What a lost generator looks like at 10 Hz, and what else a fixed threshold
# catches. Checked by eye on the traces of the borderline events.
CLASSES = {
    "trip": "falls at least 100 mHz below the pre-event level, bottoms out 2 s or more after onset, and is still at least 20% down 25–35 s later",
    "schedule-step": "within 20 s of the hour: a market-schedule step",
    "gap": "missing samples around the event",
    "step-artifact": "a filtered step steeper than 0.6 Hz/s, which no real loss produces; the reading holds, then jumps",
    "shallow": "less than 100 mHz below the pre-event level: a fall from a local peak",
    "snap-back": "less than 20% of the fall remains 25–35 s later; a lost generator leaves the frequency low for minutes",
    "fast-dip": "bottoms out within 2 s: a fault-driven swing at the measuring point dominates the reading, so its depth is not the system's",
}


def classify(e):
    if e["on_hour"]:
        return "schedule-step"
    if e["gap_samples"]:
        return "gap"
    if e["steepest_hz_s"] < -0.6:
        return "step-artifact"
    if e["pre"] - e["nadir"] < 0.1:
        return "shallow"
    if e["retained_30s"] is None or e["retained_30s"] < 0.2:
        return "snap-back"
    if e["nadir_s"] < 2.0:
        return "fast-dip"
    return "trip"

PUBLISHED = [
    {"id": "floor", "text": "After the reference incident the instantaneous frequency minimum shall stay at or above 49.0 Hz; indiscriminate load shedding starts at 48.8 Hz.", "value": {"floor_hz": 49.0, "shedding_hz": 48.8}, "source": "nordic-tsos-2025"},
    {"id": "reference-incident", "text": "The reference incident is the loss of Oskarshamn 3 at 1,450 MW. Olkiluoto 3 counts as 1,300 MW because its protection scheme sheds 300 MW of load when it trips.", "value": {"mw": 1450, "olkiluoto3_mw": 1300}, "source": "nordic-tsos-2025"},
    {"id": "design-kinetic", "text": "FCR-D alone keeps the frequency above 49.0 Hz after the reference incident down to 150 GWs.", "value": {"gws": 150}, "source": "nordic-tsos-2025"},
    {"id": "stability-kinetic", "text": "120 GWs is the stability design level; stability is challenged around 90 GWs.", "value": {"gws": 120, "challenged_gws": 90}, "source": "nordic-tsos-2025"},
    {"id": "low-inertia-ffr", "text": "At 100 GWs, roughly 300 MW of FFR in the Nordic system keeps the frequency minimum above 49.0 Hz after the reference incident. Procurement adds a margin for model and forecast error.", "value": {"gws": 100, "ffr_mw": 300}, "source": "nordic-tsos-2025"},
    {"id": "mass-for-tenth", "text": "The extra kinetic energy needed to raise the frequency minimum by 0.1 Hz in an 80 GWs system is 20 GWs.", "value": {"at_gws": 80, "extra_gws": 20, "hz": 0.1}, "source": "orum-2017"},
    {"id": "inertia-kpis", "text": "Nordic kinetic energy, pre-disturbance, per year.", "value": {"years": KPI_YEARS, "max_gws": [256, 256, 255, 260, 270], "min_gws": [135, 110, 138, 127, 131], "mean_gws": [190, 195, 193, 194, 194], "sd_gws": [25, 31, 24, 25, 27], "hours_below_150": [243, 559, 88, 237, 339], "hours_below_120": [0, 52, 0, 0, 0]}, "source": "nordic-tsos-2025"},
    {"id": "ffr-product", "text": "FFR activates fully within 1.3 s at 49.7 Hz, 1.0 s at 49.6 Hz or 0.7 s at 49.5 Hz. Fingrid procures 0–60 MW, only in low-inertia hours, mostly spring to autumn.", "value": {"options": [[49.7, 1.3], [49.6, 1.0], [49.5, 0.7]], "fingrid_mw": [0, 60]}, "source": "fingrid-ffr"},
]

SOURCES = {
    "fingrid-339": {"name": "Fingrid open data, Frequency – historical data (dataset 339)", "url": "https://data.fingrid.fi/en/datasets/339", "licence": "CC BY 4.0", "attribution": "Source: Fingrid, data.fingrid.fi, licence CC BY 4.0"},
    "fingrid-260": {"name": "Fingrid open data, Kinetic energy of the Nordic power system – real time data (dataset 260)", "url": "https://data.fingrid.fi/en/datasets/260", "licence": "CC BY 4.0", "attribution": "Source: Fingrid, data.fingrid.fi, licence CC BY 4.0"},
    "fingrid-276": {"name": "Fingrid open data, Fast Frequency Reserve FFR, procured volume (dataset 276)", "url": "https://data.fingrid.fi/en/datasets/276", "licence": "CC BY 4.0", "attribution": "Source: Fingrid, data.fingrid.fi, licence CC BY 4.0"},
    "nordic-tsos-2025": {"name": "Nordic TSOs, Requirements for minimum inertia in the Nordic power system, 28 August 2025", "url": "https://eepublicdownloads.blob.core.windows.net/public-cdn-container/clean-documents/SOC%20documents/Nordic/2025/2025_-_Requirements_for_minimum_inertia_in_the_Nordic_power_system.pdf"},
    "ffr-design-2024": {"name": "Nordic TSOs, FFR Design of Requirements, external document v1.0", "url": "https://eepublicdownloads.blob.core.windows.net/public-cdn-container/clean-documents/SOC%20documents/Nordic/2024/1c_-_FFR_Design_Requirements_v1.0_-_external_document.pdf"},
    "orum-2017": {"name": "Ørum et al. 2017, Future System Inertia 2, p. 101, as cited in Energinet's FFR methodology", "url": "https://www.energinet.dk/media/iiolq115/method-for-technical-requirements-for-and-new-procurement-of-ffr.pdf"},
    "fingrid-ffr": {"name": "Fingrid, Fast Frequency Reserve FFR", "url": "https://www.fingrid.fi/en/electricity-market/reserves/reserve-products/fast-frequency-reserve-ffr/"},
}


def parse_utc(ts):
    return datetime.strptime(ts[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)


def local_to_utc(ts):
    """Archive time (Finnish local, 'YYYY-MM-DD HH:MM:SS.s') → UTC."""
    return datetime.strptime(ts[:19], "%Y-%m-%d %H:%M:%S").replace(tzinfo=HELSINKI).astimezone(timezone.utc)


class Series:
    """A Fingrid series from the cache, as (UTC start, value) sorted by time."""

    def __init__(self, dataset, first, last):
        rows = [r for m in fetch.months_between(first, last) for r in fetch.load_month(dataset, m)]
        rows.sort(key=lambda r: r[0])
        self.times = [parse_utc(r[0]) for r in rows]
        self.values = [float(r[1]) for r in rows]
        self.months = sorted({r[0][:7] for r in rows})

    def at(self, t, max_age=timedelta(minutes=15)):
        i = bisect.bisect_right(self.times, t) - 1
        if i < 0 or t - self.times[i] > max_age:
            return None
        return self.values[i]

    def hourly(self):
        sums = {}
        for t, v in zip(self.times, self.values):
            key = t.replace(minute=0, second=0, microsecond=0)
            s = sums.setdefault(key, [0.0, 0])
            s[0] += v
            s[1] += 1
        return {k: s / n for k, (s, n) in sums.items()}


def hour_range(start, end):
    t = start
    while t < end:
        yield t
        t += timedelta(hours=1)


def year_stats(hourly, year):
    vals = [v for k, v in hourly.items() if k.year == year]
    if not vals:
        return None
    return {
        "year": year,
        "hours": len(vals),
        "min_gws": round(min(vals)),
        "mean_gws": round(statistics.fmean(vals)),
        "sd_gws": round(statistics.pstdev(vals)),
        "max_gws": round(max(vals)),
        "hours_below_150": sum(v < 150 for v in vals),
        "hours_below_120": sum(v < 120 for v in vals),
    }


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
    smooth = scan.smooth_day(values)[0][lo:hi]
    return {
        "start": times[lo][:21],
        "event_index": BEFORE_S * 10,
        "sample_seconds": 0.1,
        "raw_hz": [round(float(v), 4) for v in raw],
        "filtered_hz": [round(float(v), 4) for v in smooth],
    }


def median(xs):
    return round(statistics.median(xs), 1) if xs else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scan")
    ap.add_argument("months", nargs="*", default=["2025-08", "2026-07"])
    args = ap.parse_args()
    first, last = args.months

    if args.scan:
        months = json.load(open(args.scan))
        assert [m["month"] for m in months] == list(fetch.months_between(first, last)), "scan covers other months"
    else:
        months = [scan.scan_month(m) for m in fetch.months_between(first, last)]

    kinetic = Series(260, "2020-01", last)
    ffr = Series(276, "2020-01", last)
    k_hourly = kinetic.hourly()
    f_hourly = ffr.hourly()

    w_start = datetime(int(first[:4]), int(first[5:]), 1, tzinfo=timezone.utc)
    w_end = datetime(*map(int, fetch.next_month(last).split("-")), 1, tzinfo=timezone.utc)
    hours = list(hour_range(w_start, w_end))
    hour_index = {h: i for i, h in enumerate(hours)}
    k_window = [k_hourly.get(h) for h in hours]
    f_window = [f_hourly.get(h) for h in hours]

    events = []
    for m in months:
        for e in m["events"]:
            onset = local_to_utc(e["onset"])
            ek = kinetic.at(onset)
            hour = onset.replace(minute=0, second=0, microsecond=0)
            loss = round(2 * ek * 1000 * -e["rocof_1s"] / 50, -1) if ek and e["rocof_1s"] < 0 else None
            events.append({**e, "class": classify(e), "onset_utc": onset.strftime("%Y-%m-%dT%H:%M:%SZ"), "hour_index": hour_index.get(hour), "kinetic_gws": ek, "ffr_mw": f_hourly.get(hour), "loss_est_mw": loss})
    trips = [e for e in events if e["class"] == "trip"]
    featured = min(trips, key=lambda e: e["nadir"])

    known = [v for v in k_window if v is not None]
    k_median = statistics.median(known)

    def season(summer):
        hs = [v for h, v in zip(hours, k_window) if v is not None and (h.strftime("%m") in SUMMER) == summer]
        ts = [e for e in trips if (e["t"][5:7] in SUMMER) == summer]
        losses = [e["loss_est_mw"] for e in ts if e["loss_est_mw"] is not None]
        return {
            "hours": len(hs),
            "median_kinetic_gws": median(hs),
            "trips": len(ts),
            "trips_per_1000_hours": round(1000 * len(ts) / max(len(hs), 1), 2),
            "median_kinetic_at_trips_gws": median([e["kinetic_gws"] for e in ts if e["kinetic_gws"]]),
            "median_loss_est_mw": median(losses),
            "trips_loss_est_at_least_large": sum(x >= LARGE_LOSS_MW for x in losses),
        }

    years = [s for y in range(2020, date.today().year + 1) if (s := year_stats(k_hourly, y))]
    kpi = next(f for f in PUBLISHED if f["id"] == "inertia-kpis")["value"]
    ffr_years = []
    for y in range(2020, date.today().year + 1):
        vals = [v for k, v in f_hourly.items() if k.year == y]
        if vals:
            bought = [v for v in vals if v > 0]
            ffr_years.append({"year": y, "hours": len(vals), "hours_procured": len(bought), "max_mw": round(max(vals)), "mwh": round(sum(bought))})

    def ffr_by_kinetic(hour_keys):
        bands = []
        for lo in range(80, 300, 20):
            sel = [f_hourly[h] for h in hour_keys if h in f_hourly and lo <= k_hourly[h] < lo + 20]
            if sel:
                bands.append({"from_gws": lo, "to_gws": lo + 20, "hours": len(sel), "share_procured": round(sum(v > 0 for v in sel) / len(sel), 3), "mean_mw": round(statistics.fmean(sel), 1)})
        return bands

    pack = {
        "id": "how-much-fast-reserve",
        "version": 1,
        "generated": date.today().isoformat(),
        "status": "complete for the film: frequency events, hourly kinetic energy and FFR procured",
        "sources": SOURCES,
        "method": {
            "window": {"first_month": first, "last_month": last, "hours_utc": [hours[0].strftime("%Y-%m-%dT%H:%MZ"), hours[-1].strftime("%Y-%m-%dT%H:%MZ")]},
            "filter": "median over 9 samples (0.9 s); samples outside 49–51 Hz are gaps and read as 50 Hz",
            "event": "fall of more than 100 mHz within 5 s, at least 2 min after the previous one; nadir is the minimum within 20 s",
            "event_time": "`t` is the start of the 5 s window the fall is detected in; `onset` is where the fall begins (first sample 15 mHz below the pre-event mean, less 0.2 s). Both are Finnish local time, as in the archive; `onset_utc` is UTC",
            "on_hour": "a fall within 20 s of the hour is a market-schedule step, not a trip, and is excluded from trip counts",
            "classes": CLASSES,
            "why_filter": "the raw series has 1–2-sample spikes (one reads 48.86 Hz between two 50.07 Hz samples); a raw minimum would report near-misses that never happened",
            "kinetic_at_event": "the latest dataset-260 value at or before the onset, at most 15 min old",
            "hourly": "clock-hour (UTC) mean of dataset 260 (1 min until 2023, 15 min since) and dataset 276",
            "loss_estimate": "loss ≈ 2 × kinetic energy × |mean slope over the first second| / 50 Hz. A lower bound: reserves and load relief already push back within that second, and the 0.9 s filter softens the first slope",
        },
        "coverage": {
            "kind": "observed",
            "source": "fingrid-339",
            "months": [{"month": m["month"], "samples": m["samples"], "gap_share": round(m["gap_share"], 6)} for m in months],
            "samples": sum(m["samples"] for m in months),
            "kinetic_months": len(kinetic.months),
            "kinetic_hours_in_window": len(known),
            "ffr_hours_in_window": sum(v is not None for v in f_window),
        },
        "events": {
            "kind": "observed",
            "source": "fingrid-339",
            "paired_with": ["fingrid-260", "fingrid-276"],
            "all": events,
            "summary": {
                "sustained_falls": len(events),
                "by_class": {c: sum(e["class"] == c for e in events) for c in CLASSES},
                "trips": len(trips),
                "trips_apr_sep": sum(1 for e in trips if e["t"][5:7] in SUMMER),
                "trips_below_49_8": sum(1 for e in trips if e["nadir"] < 49.8),
                "deepest_hz": min(e["nadir"] for e in trips),
                "any_below_49_6": any(e["nadir"] < 49.6 for e in trips),
            },
        },
        "pairing": {
            "kind": "calculated",
            "sources": ["fingrid-339", "fingrid-260"],
            "window_median_kinetic_gws": round(k_median, 1),
            "trips_in_hours_below_median": sum(1 for e in trips if e["kinetic_gws"] is not None and e["kinetic_gws"] < k_median),
            "trips_paired": sum(1 for e in trips if e["kinetic_gws"] is not None),
            "large_loss_mw": LARGE_LOSS_MW,
            "apr_sep": season(True),
            "oct_mar": season(False),
        },
        "featured_event": {"kind": "observed", "source": "fingrid-339", "event": featured, "trace": featured_trace(featured["t"])},
        "hours": {
            "kind": "observed",
            "sources": ["fingrid-260", "fingrid-276"],
            "start_utc": hours[0].strftime("%Y-%m-%dT%H:%MZ"),
            "kinetic_gws": [None if v is None else round(v, 1) for v in k_window],
            "ffr_procured": [[i, round(v, 1)] for i, v in enumerate(f_window) if v],
        },
        "years": {
            "kind": "calculated",
            "source": "fingrid-260",
            "note": "Hourly means of the real-time estimate. The published KPIs use the operators' own pre-disturbance series, so small differences are expected. 2020's minimum is one outlying hour in March (58 GWs) in the real-time series; the published minimum is 135. The latest year is partial",
            "kinetic": years,
            "published_hours_below_150": dict(zip(map(str, KPI_YEARS), kpi["hours_below_150"])),
            "ffr": ffr_years,
        },
        "ffr_by_kinetic": {
            "kind": "calculated",
            "sources": ["fingrid-260", "fingrid-276"],
            "note": "Fingrid's FFR procured in each clock hour against that hour's mean kinetic energy, in 20 GWs bands",
            "window": ffr_by_kinetic([h for h in hours if h in k_hourly]),
            "since_2020": ffr_by_kinetic(list(k_hourly)),
        },
        "published": {"kind": "observed-published", "figures": PUBLISHED},
        "limitations": [
            "Which unit tripped is not in the open data; events are unattributed, and their size is estimated from the first second of the fall.",
            "Event classes are a rule, not a label from the operator. The rule was checked by eye on the borderline traces; 19 trips is too few to settle the seasonal question.",
            "Frequency is measured at Finnish 400 kV substations; the Nordic system shares one frequency, but local oscillation is not separated.",
            "Kinetic energy is itself an operator estimate, updated every 15 minutes.",
            "Finland's FFR is one share of a Nordic need.",
            "Our model is one-bus and fitted to published design points; it draws shapes and is never quoted as a figure.",
            "No event in the window came near 49.0 Hz; the story is about margin, not a near-miss.",
        ],
    }
    with open(OUT, "w") as fh:
        json.dump(pack, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    print(f"wrote {OUT} ({os.path.getsize(OUT)} bytes)")


if __name__ == "__main__":
    main()
