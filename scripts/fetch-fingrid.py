"""Pull Fingrid open-data time series into a local cache, one file per month.

Separate from the freeze step because the pull is slow (the API pages at 20,000
rows, stops paging at 40,000, and is paced here to one request every 7 s) and
the freeze is iterated. Each month is requested in three ~10-day ranges.

  FINGRID_API_KEY=... python3 scripts/fetch-fingrid.py 260 2020-01 2026-07
  FINGRID_API_KEY=... python3 scripts/fetch-fingrid.py 276 2025-08 2026-07

Datasets used by the grid-inertia story:
  260  Kinetic energy of the Nordic power system, GWs. 1 min until about 2023, 15 min since
  276  FFR procured volume, MW, 1 h
  278  FFR procurement forecast, MW, 1 h

The key is free from https://data.fingrid.fi (developer portal). It is read from
the environment and never written anywhere. Source: Fingrid, data.fingrid.fi,
licence CC BY 4.0.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://data.fingrid.fi/api/datasets/{dataset}/data"
CACHE = Path(os.environ.get("FINGRID_CACHE", "/tmp/fingrid"))
PAGE = 20_000
PACE_SECONDS = 7.0
_last = 0.0


def months_between(first: str, last: str):
    y, m = int(first[:4]), int(first[5:])
    while f"{y:04d}-{m:02d}" <= last:
        yield f"{y:04d}-{m:02d}"
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)


def next_month(month: str) -> str:
    y, m = int(month[:4]), int(month[5:])
    return f"{y + 1:04d}-01" if m == 12 else f"{y:04d}-{m + 1:02d}"


def get(url: str, key: str, attempts: int = 5) -> dict:
    global _last
    for attempt in range(attempts):
        wait = PACE_SECONDS - (time.monotonic() - _last)
        if wait > 0:
            time.sleep(wait)
        _last = time.monotonic()
        req = urllib.request.Request(url, headers={"x-api-key": key, "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=120) as res:
                return json.load(res)
        except urllib.error.HTTPError as e:
            if e.code in (401, 403):
                raise SystemExit(f"Fingrid refused the key ({e.code}); check FINGRID_API_KEY") from e
            if attempt == attempts - 1:
                raise
            time.sleep(PACE_SECONDS * 2 ** (attempt + 1))
        except urllib.error.URLError:
            if attempt == attempts - 1:
                raise
            time.sleep(PACE_SECONDS * 2 ** (attempt + 1))
    raise AssertionError("unreachable")


def fetch_range(dataset: int, start: str, end: str, key: str) -> tuple[list[list], int]:
    """Rows with start ≤ startTime < end. The API stops paging at 40,000 rows, so
    callers keep ranges under one page and this refuses a full one."""
    rows: list[list] = []
    page = 1
    while True:
        query = urllib.parse.urlencode(
            {
                "startTime": start,
                "endTime": end,
                "format": "json",
                "pageSize": PAGE,
                "page": page,
                "sortBy": "startTime",
                "sortOrder": "asc",
            }
        )
        body = get(f"{API.format(dataset=dataset)}?{query}", key)
        rows += [[r["startTime"], r["value"]] for r in body["data"]]
        nxt = body.get("pagination", {}).get("nextPage")
        if not nxt:
            break
        page = nxt
    if len(rows) >= PAGE:
        raise SystemExit(f"{dataset} {start}: {len(rows)} rows fills a page; shorten CHUNK_DAYS")
    # endTime is inclusive, so the next range's first row can appear here too.
    return [r for r in rows if start[:19] <= r[0][:19] < end[:19]], page


# 1-minute data is 14,400 rows per 10 days, under one 20,000-row page.
CHUNK_DAYS = (1, 11, 21)


def fetch_month(dataset: int, month: str, key: str, dest: Path = CACHE) -> tuple[Path, str]:
    """Rows of one calendar month (UTC) as [startTime, value], oldest first."""
    out = dest / str(dataset) / f"{month}.json"
    if out.exists():
        return out, "cached"
    bounds = [f"{month}-{d:02d}T00:00:00Z" for d in CHUNK_DAYS] + [f"{next_month(month)}-01T00:00:00Z"]
    rows: list[list] = []
    pages = 0
    for start, end in zip(bounds, bounds[1:]):
        chunk, n = fetch_range(dataset, start, end, key)
        rows += chunk
        pages += n
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".part")
    tmp.write_text(json.dumps({"dataset": dataset, "month": month, "rows": rows}))
    tmp.rename(out)
    return out, f"{len(rows)} rows, {pages} request(s)"


def load_month(dataset: int, month: str, dest: Path = CACHE) -> list[list]:
    return json.loads((dest / str(dataset) / f"{month}.json").read_text())["rows"]


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    key = os.environ.get("FINGRID_API_KEY")
    if not key:
        raise SystemExit("set FINGRID_API_KEY (free, https://data.fingrid.fi)")
    dataset, first, last = int(sys.argv[1]), sys.argv[2], sys.argv[3]
    for month in months_between(first, last):
        _, note = fetch_month(dataset, month, key)
        print(f"{dataset} {month}: {note}", file=sys.stderr, flush=True)


if __name__ == "__main__":
    main()
