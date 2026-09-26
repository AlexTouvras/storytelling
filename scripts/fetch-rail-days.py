"""Pull raw Digitraffic Railway train days into a local cache.

Separate from the freeze step because the pull is slow and the aggregation is iterated.
One JSON file per departure date, ~20 MB each. The API asks for gzip and an identifying
header; without both it answers 406.

  python scripts/fetch-rail-days.py --start 2026-07-28 --days 60

Source: https://rata.digitraffic.fi/api/v1/trains/{date}  (Fintraffic, CC BY 4.0)
"""

from __future__ import annotations

import argparse
import gzip
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import date, timedelta
from pathlib import Path

API = "https://rata.digitraffic.fi/api/v1/trains/{date}"
CACHE = Path(os.environ.get("RAIL_CACHE", "/tmp/rail/pack"))
UA = os.environ.get("DIGITRAFFIC_USER", "orbit-ids/rail-recovery-time")


def fetch_day(day: date, dest: Path, attempts: int = 4) -> tuple[bool, str]:
    out = dest / f"{day.isoformat()}.json"
    if out.exists() and out.stat().st_size > 1_000:
        return True, "cached"
    req = urllib.request.Request(
        API.format(date=day.isoformat()),
        headers={
            "Accept-Encoding": "gzip",
            "Digitraffic-User": UA,
            "Accept": "application/json",
        },
    )
    delay = 4
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                raw = resp.read()
                if resp.headers.get("Content-Encoding") == "gzip":
                    raw = gzip.decompress(raw)
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            if attempt == attempts - 1:
                return False, f"failed: {exc}"
            time.sleep(delay)
            delay *= 2
            continue
        if len(raw) < 1_000:
            return False, f"suspiciously small ({len(raw)} bytes)"
        out.write_bytes(raw)
        return True, f"{len(raw)/1e6:.1f} MB"
    return False, "exhausted retries"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", required=True, help="first departure date, YYYY-MM-DD")
    ap.add_argument("--days", type=int, default=60)
    ap.add_argument("--dest", default=str(CACHE))
    args = ap.parse_args()

    dest = Path(args.dest)
    dest.mkdir(parents=True, exist_ok=True)
    start = date.fromisoformat(args.start)

    ok = 0
    for i in range(args.days):
        day = start + timedelta(days=i)
        good, note = fetch_day(day, dest)
        ok += good
        print(f"  {day}  {'ok ' if good else 'ERR'}  {note}", flush=True)
        if note != "cached":
            time.sleep(1.1)  # 60 requests/minute per IP

    print(f"\n{ok}/{args.days} days in {dest}", flush=True)
    if ok < args.days:
        sys.exit(1)


if __name__ == "__main__":
    main()
