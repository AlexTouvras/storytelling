"""Scan Fingrid 10 Hz Nordic frequency archives (dataset 339) for sustained falls.

Usage: python3 scripts/scan-grid-events.py 2025-08 2025-09 ... > events.json

Keyless: the monthly .7z archives are public (CC BY 4.0, Fingrid). Needs `py7zr`
and `numpy`. Each month is downloaded, scanned and deleted, so disk use stays
under ~1 GB.

The raw series has 1-2 sample spikes (e.g. 48.86 Hz between two 50.07 Hz
readings), so it is median-filtered over 9 samples before looking for a fall;
a raw minimum reports near-misses that never happened. Out-of-range samples
(gaps are written as 0) hold the last good value, and each event counts the
gap samples around it.

An event is a fall of more than 100 mHz within 5 s, at least 2 minutes after
the previous one. Falls within 20 s of the hour are flagged `on_hour`: they are
market-schedule steps, not trips. `t` is the start of the 5 s window the fall
is detected in; `onset` is where the fall itself begins.
"""

import csv
import json
import os
import shutil
import sys
import tempfile
import urllib.request

import numpy as np
import py7zr
from numpy.lib.stride_tricks import sliding_window_view

SAMPLES_PER_SECOND = 10
FALL_HZ = 0.1
FALL_WINDOW = 5 * SAMPLES_PER_SECOND
MIN_GAP = 120 * SAMPLES_PER_SECOND
NADIR_WINDOW = 20 * SAMPLES_PER_SECOND
# Onset: the first sample 15 mHz below the pre-event mean, backed off 0.2 s to
# where the fall began. `rocof_1s` is the mean slope over the first second
# from there, which is what backs out the size of the loss.
ONSET_HZ = 0.015
ONSET_BACK = 2
# Share of the fall still there 25–35 s after onset. A lost generator leaves
# the frequency low until slower reserves restore it over minutes; a
# measurement transient (a nearby fault disturbing the reading) snaps back.
RETAIN_FROM = 25 * SAMPLES_PER_SECOND
RETAIN_TO = 35 * SAMPLES_PER_SECOND


def read_day(path):
    times, values = [], []
    with open(path) as fh:
        reader = csv.reader(fh)
        next(reader)
        for row in reader:
            if len(row) < 2 or not row[1]:
                continue
            times.append(row[0])
            values.append(float(row[1]))
    return times, np.array(values)


def on_hour(ts):
    minute, second = ts[14:16], ts[17:19]
    return (minute == "00" and second < "20") or (minute == "59" and second > "40")


def fill_gaps(values):
    """Out-of-range samples (gaps are written as 0) hold the last good value.
    Reading them as 50 Hz fakes a fall whenever a gap lands in a high hour."""
    bad = (values < 49) | (values > 51)
    good = np.where(~bad, np.arange(len(values)), 0)
    np.maximum.accumulate(good, out=good)
    clean = values[good]
    if bad.all():
        clean = np.full_like(values, 50.0)
    elif bad[0]:
        first = int(np.argmax(~bad))
        clean[:first] = values[first]
    return clean, bad


def smooth_day(values):
    clean, bad = fill_gaps(values)
    return np.median(sliding_window_view(np.pad(clean, 4, mode="edge"), 9), axis=1), bad


def scan_day(times, values):
    smooth, bad = smooth_day(values)
    fall = smooth[FALL_WINDOW:] - smooth[:-FALL_WINDOW]
    events, last = [], -(10**9)
    for i in np.where(fall < -FALL_HZ)[0]:
        if i - last > MIN_GAP:
            j = i + int(np.argmin(smooth[i : i + NADIR_WINDOW]))
            before = float(smooth[max(0, i - FALL_WINDOW) : i].mean())
            below = np.where(smooth[i : j + 1] < before - ONSET_HZ)[0]
            k = i + int(below[0]) if len(below) else i
            start = max(0, k - ONSET_BACK)
            steps = np.diff(smooth[start : j + 1]) if j > start else np.zeros(1)
            slope = (smooth[min(start + SAMPLES_PER_SECOND, len(smooth) - 1)] - smooth[start])
            late = smooth[start + RETAIN_FROM : start + RETAIN_TO]
            depth = before - float(smooth[j])
            retained = (before - float(late.mean())) / depth if len(late) and depth > 0 else None
            events.append(
                {
                    "t": times[i][:21],
                    "onset": times[start][:21],
                    "pre": round(before, 3),
                    "nadir": round(float(smooth[j]), 3),
                    "nadir_s": round((j - start) / SAMPLES_PER_SECOND, 1),
                    "depth_mHz": round((float(smooth[j]) - before) * 1000),
                    "steepest_hz_s": round(float(steps.min()) * SAMPLES_PER_SECOND, 3),
                    "rocof_1s": round(float(slope), 3),
                    "retained_30s": None if retained is None else round(retained, 2),
                    "gap_samples": int(bad[max(0, start - FALL_WINDOW) : start + RETAIN_TO].sum()),
                    "on_hour": on_hour(times[i]),
                }
            )
        last = i
    return events, int(bad.sum()), len(values)


def scan_month(month):
    work = tempfile.mkdtemp(prefix=f"fingrid-{month}-")
    try:
        archive = os.path.join(work, f"{month}.7z")
        urllib.request.urlretrieve(f"https://data.fingrid.fi/files/339/{month[:4]}/{month}.7z", archive)
        with py7zr.SevenZipFile(archive) as z:
            z.extractall(work)
        events, gaps, samples = [], 0, 0
        for root, _, files in os.walk(work):
            for name in sorted(f for f in files if f.endswith(".csv")):
                day_events, day_gaps, day_samples = scan_day(*read_day(os.path.join(root, name)))
                events += day_events
                gaps += day_gaps
                samples += day_samples
        return {"month": month, "samples": samples, "gap_share": gaps / max(samples, 1), "events": events}
    finally:
        for root, dirs, files in os.walk(work):
            for name in dirs + files:
                os.chmod(os.path.join(root, name), 0o700)
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    months = [scan_month(m) for m in sys.argv[1:]]
    for m in months:
        trips = [e for e in m["events"] if not e["on_hour"]]
        print(f"{m['month']}: {len(m['events'])} events, {len(trips)} off the hour", file=sys.stderr)
    json.dump(months, sys.stdout, indent=1)
