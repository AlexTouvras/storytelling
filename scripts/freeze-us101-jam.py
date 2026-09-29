#!/usr/bin/env python3
"""Freeze the US-101 pocket pack from the FHWA NGSIM SODA API.

Reads location='us-101' only. Writes data/figures/where-should-the-speed-be-held.v1.json.
No key. Numbers in the film and on the card are read from this file.
"""

from __future__ import annotations

import json
import math
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

BASE = "https://data.transportation.gov/resource/8ect-6jqj.json"
OUT = Path("data/figures/where-should-the-speed-be-held.v1.json")
LOCATION = "us-101"
# Study window, milliseconds. Confirmed against min/max(global_time) before write.
START = 1_118_846_979_700
END = 1_118_849_752_200
FT_S_TO_MPH = 3600 / 5280
LENGTH_FT = 2200
FEATURED_T0 = 240
FEATURED_T1 = 300
# NGSIM acceleration jitters through zero. A lamp on every negative sample
# lights most of the road, so the pocket does not read. About −2 mph/s.
LAMP_ACC = -3.0


def soda(params: dict, limit: int = 50000) -> list:
    q = dict(params)
    q.setdefault("$limit", str(limit))
    url = BASE + "?" + urllib.parse.urlencode(q)
    req = urllib.request.Request(url, headers={"User-Agent": "orbit-flagship-freeze/1.0"})
    with urllib.request.urlopen(req, timeout=180) as res:
        return json.loads(res.read().decode())


def fnum(row: dict, key: str) -> float:
    return float(row[key])


def mph(ft_s: float) -> float:
    return ft_s * FT_S_TO_MPH


def is_braking(acc: float) -> bool:
    return acc < LAMP_ACC


def ms_at(seconds: int) -> int:
    return START + seconds * 1000


def mean(xs: list[float]) -> float | None:
    return sum(xs) / len(xs) if xs else None


def round1(x: float | None) -> float | None:
    if x is None:
        return None
    return round(x, 1)


def lane_extents() -> list[dict]:
    rows = soda(
        {
            "$select": "lane_id, min(local_y) as y0, max(local_y) as y1, avg(v_vel) as v, count(*) as n",
            "$where": f"location='{LOCATION}'",
            "$group": "lane_id",
            "$order": "lane_id",
        }
    )
    out = []
    for row in rows:
        out.append(
            {
                "lane": int(row["lane_id"]),
                "y0_ft": round(fnum(row, "y0"), 1),
                "y1_ft": round(fnum(row, "y1"), 1),
                "mean_mph": round1(mph(fnum(row, "v"))),
                "rows": int(row["n"]),
            }
        )
    return out


def coverage() -> dict:
    rows = soda(
        {
            "$select": "count(*) as n, min(global_time) as t0, max(global_time) as t1",
            "$where": f"location='{LOCATION}'",
        }
    )
    row = rows[0]
    return {"rows": int(row["n"]), "t0": int(float(row["t0"])), "t1": int(float(row["t1"]))}


def bands() -> list[dict]:
    """Five-minute means, lanes 1–5. Upstream y<500, downstream y>1700."""
    rows = soda(
        {
            "$select": (
                f"floor((global_time - {START}) / 300000) as band, "
                "avg(case(local_y < 500, v_vel)) as up, "
                "avg(case(local_y >= 500 and local_y <= 1700, v_vel)) as mid, "
                "avg(case(local_y > 1700, v_vel)) as down, "
                "count(*) as n"
            ),
            "$where": f"location='{LOCATION}' AND lane_id in ('1','2','3','4','5')",
            "$group": "band",
            "$order": "band",
        }
    )
    out = []
    for row in rows:
        band = int(float(row["band"]))
        # The recording ends at 46.2 minutes, so the last band is short.
        to_min = min((band + 1) * 5, 46.2)
        out.append(
            {
                "from_min": band * 5,
                "to_min": to_min,
                "upstream_mph": round1(mph(fnum(row, "up"))) if row.get("up") else None,
                "middle_mph": round1(mph(fnum(row, "mid"))) if row.get("mid") else None,
                "downstream_mph": round1(mph(fnum(row, "down"))) if row.get("down") else None,
                "rows": int(row["n"]),
            }
        )
    return out


def frame(seconds: int, lane: int = 2) -> list[dict]:
    t = ms_at(seconds)
    rows = soda(
        {
            "$select": "vehicle_id, local_y, v_vel, v_acc, lane_id",
            "$where": f"location='{LOCATION}' AND lane_id='{lane}' AND global_time={t}",
            "$order": "local_y",
            "$limit": "500",
        }
    )
    # One row per vehicle. A 100 ms boundary can still double; keep the first.
    seen = set()
    cars = []
    for row in rows:
        vid = int(row["vehicle_id"])
        if vid in seen:
            continue
        seen.add(vid)
        cars.append(
            {
                "id": vid,
                "y": round(fnum(row, "local_y"), 1),
                "mph": round(mph(fnum(row, "v_vel")), 1),
                "acc": round(fnum(row, "v_acc"), 2),
            }
        )
    cars.sort(key=lambda c: c["y"])
    return cars


def section_snapshot(seconds: int) -> list[dict]:
    t = ms_at(seconds)
    rows = soda(
        {
            "$select": "vehicle_id, lane_id, local_y, v_vel, v_acc",
            "$where": (
                f"location='{LOCATION}' AND global_time={t} "
                "AND lane_id in ('1','2','3','4','5')"
            ),
            "$limit": "2000",
        }
    )
    seen = set()
    cars = []
    for row in rows:
        vid = int(row["vehicle_id"])
        if vid in seen:
            continue
        seen.add(vid)
        cars.append(
            {
                "id": vid,
                "lane": int(row["lane_id"]),
                "y": round(fnum(row, "local_y"), 1),
                "mph": round(mph(fnum(row, "v_vel")), 1),
                "braking": is_braking(fnum(row, "v_acc")),
            }
        )
    return cars


def cells(lane: int, t0_s: int, t1_s: int, y_ft: int, dt_s: int) -> dict[tuple[int, int], float]:
    rows = soda(
        {
            "$select": (
                f"floor((global_time - {START}) / {dt_s * 1000}) as tbin, "
                f"floor(local_y / {y_ft}) as ybin, "
                "avg(v_vel) as v"
            ),
            "$where": (
                f"location='{LOCATION}' AND lane_id='{lane}' "
                f"AND global_time >= {ms_at(t0_s)} AND global_time < {ms_at(t1_s)}"
            ),
            "$group": "tbin, ybin",
            "$limit": "50000",
        }
    )
    out = {}
    for row in rows:
        if row.get("v") is None:
            continue
        out[(int(float(row["tbin"])), int(float(row["ybin"])))] = mph(fnum(row, "v"))
    return out


def slowest_cell(grid: dict[tuple[int, int], float], tbin: int) -> tuple[int, float] | None:
    cells_t = [(y, v) for (t, y), v in grid.items() if t == tbin]
    if not cells_t:
        return None
    y, v = min(cells_t, key=lambda p: p[1])
    return y, v


def featured_walk(grid: dict[tuple[int, int], float]) -> dict:
    """100-ft by 10-s cells. Track the slowest cell from 240 s to 300 s."""
    t0 = FEATURED_T0 // 10
    t1 = FEATURED_T1 // 10
    a = slowest_cell(grid, t0)
    b = slowest_cell(grid, t1)
    if not a or not b:
        raise SystemExit("featured cells missing")
    y0 = a[0] * 100
    y1 = b[0] * 100
    walk_ft = y0 - y1
    walk_mph = walk_ft / ((FEATURED_T1 - FEATURED_T0) / 3600) / 5280
    return {
        "cell_ft": 100,
        "cell_s": 10,
        "from_y_ft": y0,
        "to_y_ft": y1,
        "from_mph": round1(a[1]),
        "to_mph": round1(b[1]),
        "walk_ft": int(round(walk_ft)),
        "walk_mph": round1(walk_mph),
    }


def upstream_edge(grid: dict[tuple[int, int], float], tbin: int, y_ft: int, slow_mph: float = 25) -> int | None:
    """Smallest cell slower than `slow_mph`. That is the back of the pocket."""
    ys = [y for (t, y), v in grid.items() if t == tbin and v < slow_mph]
    if not ys:
        return None
    return min(ys) * y_ft


def downstream_mph_at(grid: dict[tuple[int, int], float], tbin: int, y_ft: int) -> float | None:
    vals = [v for (t, y), v in grid.items() if t == tbin and y * y_ft > 1700]
    return mean(vals)


def crossings(lane: int, grid: dict[tuple[int, int], float], y_ft: int, dt_s: int) -> list[dict]:
    """Track the back of the slow cells.

    A crossing counts when that edge moves at least 400 ft upstream at 5–12 mph
    while the downstream end stays above 35 mph. Faster than 12 mph is a bin
    jumping to a different car, not a pocket walking, and is not counted.
    """
    tbins = sorted({t for t, _ in grid})
    found = []
    start: tuple[int, int] | None = None
    prev_y: int | None = None
    for t in tbins:
        edge = upstream_edge(grid, t, y_ft)
        down = downstream_mph_at(grid, t, y_ft)
        if edge is None or down is None or down <= 35:
            start = None
            prev_y = None
            continue
        if prev_y is not None and edge > prev_y:
            start = (t, edge)
        if start is None:
            start = (t, edge)
        prev_y = edge
        moved = start[1] - edge
        seconds = (t - start[0]) * dt_s
        if moved >= 400 and seconds > 0:
            walk = moved / (seconds / 3600) / 5280
            if 5 <= walk <= 12:
                found.append(
                    {
                        "lane": lane,
                        "from_s": start[0] * dt_s,
                        "to_s": t * dt_s,
                        "from_y_ft": start[1],
                        "to_y_ft": edge,
                        "walk_mph": round1(walk),
                        "downstream_mph": round1(down),
                    }
                )
            start = (t, edge)
    return found


def lane_roles(sample_ids: dict[int, list[int]]) -> dict:
    """Where short-lane vehicles also appear, so entrance and exit are assigned from movement."""
    return {str(lane): ids for lane, ids in sample_ids.items()}


def vehicle_lanes(vehicle_id: int) -> list[int]:
    rows = soda(
        {
            "$select": "lane_id, min(global_time) as t0, max(global_time) as t1, min(local_y) as y0, max(local_y) as y1",
            "$where": f"location='{LOCATION}' AND vehicle_id={vehicle_id}",
            "$group": "lane_id",
        }
    )
    rows.sort(key=lambda r: float(r["t0"]))
    return [int(r["lane_id"]) for r in rows]


def sample_lane_vehicles(lane: int, n: int = 12) -> list[int]:
    rows = soda(
        {
            "$select": "vehicle_id",
            "$where": f"location='{LOCATION}' AND lane_id='{lane}'",
            "$group": "vehicle_id",
            "$limit": str(n),
        }
    )
    return [int(r["vehicle_id"]) for r in rows]


def classify_ramps() -> dict:
    """Lane 7 sits at the upstream end and lane 8 further down. Confirm by where those vehicles go."""
    roles = {}
    samples = {}
    for lane in (6, 7, 8):
        ids = sample_lane_vehicles(lane, 8)
        paths = []
        for vid in ids[:6]:
            lanes = vehicle_lanes(vid)
            paths.append({"id": vid, "lanes": lanes})
        samples[str(lane)] = paths
    # A lane is an entrance when its vehicles later appear in a through lane.
    # A lane is an exit when its vehicles arrive from a through lane and do not continue past it.
    def later_through(paths: list[dict], lane: int) -> int:
        n = 0
        for p in paths:
            seq = p["lanes"]
            if lane in seq and any(L in (1, 2, 3, 4, 5, 6) and seq.index(L) > seq.index(lane) for L in seq if L != lane):
                n += 1
        return n

    def earlier_through(paths: list[dict], lane: int) -> int:
        n = 0
        for p in paths:
            seq = p["lanes"]
            if lane in seq and any(L in (1, 2, 3, 4, 5, 6) and seq.index(L) < seq.index(lane) for L in seq if L != lane):
                n += 1
        return n

    note_parts = []
    for lane, name_if_enter, name_if_exit in (
        (7, "entrance", "exit"),
        (8, "entrance", "exit"),
        (6, "auxiliary", "auxiliary"),
    ):
        paths = samples[str(lane)]
        enter = later_through(paths, lane)
        leave = earlier_through(paths, lane)
        if lane == 6:
            role = "auxiliary"
        elif enter > leave:
            role = "entrance"
        elif leave > enter:
            role = "exit"
        else:
            role = "unresolved"
        roles[str(lane)] = {
            "role": role,
            "sample": len(paths),
            "later_through": enter,
            "earlier_through": leave,
        }
        note_parts.append(f"lane {lane}: {role} ({enter} continue into a through lane, {leave} arrive from one)")
    return {"lanes": roles, "note": "; ".join(note_parts)}


def downstream_mean(cars: list[dict], y0: float = 1800) -> float | None:
    ahead = [c["mph"] for c in cars if c["y"] > y0]
    return round1(mean(ahead))


def main() -> None:
    print("coverage")
    cov = coverage()
    if cov["t0"] != START or cov["t1"] != END:
        raise SystemExit(f"window moved: {cov}")
    print("lanes", cov["rows"])
    lanes = lane_extents()
    print("bands")
    band_rows = bands()
    print("frames")
    now = frame(FEATURED_T0)
    later = frame(FEATURED_T1)
    print("cells")
    fine = cells(2, 0, 15 * 60, 100, 10)
    walk = featured_walk(fine)
    print("walk", walk)
    pocket_rows = []
    for lane in (1, 2, 3, 4, 5):
        print("pocket lane", lane)
        grid = cells(lane, 0, 46 * 60, 200, 20)
        pocket_rows.extend(crossings(lane, grid, 200, 20))
    print("ramps")
    ramps = classify_ramps()
    print(ramps["note"])

    # Featured car: upstream edge of the slow stretch at 240 s.
    # The slow stretch on the fine cells starts at from_y_ft. Take the slowest
    # car within 150 ft downstream of that edge — the first slow car the camera opens.
    edge = walk["from_y_ft"]
    near = [c for c in now if edge - 50 <= c["y"] <= edge + 150]
    if not near:
        near = now
    featured = min(near, key=lambda c: c["mph"])

    print("snapshots")
    # The first seconds of the file are almost empty: vehicles enter the
    # cameras over the opening minute. The featured instant is 240 s.
    snaps = []
    for seconds in (240, 600, 900, 1200, 1800, 2400):
        cars = section_snapshot(seconds)
        print(" ", seconds, len(cars))
        snaps.append({"seconds": seconds, "cars": cars})

    # 10-second steps across the featured minute, lane 2, for the trace.
    steps = []
    for s in range(FEATURED_T0, FEATURED_T1 + 1, 10):
        cars = frame(s)
        steps.append(
            {
                "seconds": s,
                "downstream_mph": downstream_mean(cars),
                "cars": [{"id": c["id"], "y": c["y"], "mph": c["mph"], "braking": is_braking(c["acc"])} for c in cars],
            }
        )

    # 1 Hz trajectories of lane 2 across the featured minute, for the model.
    # Kept as feet and ft/s so the model does not inherit a display rounding.
    print("trajectories")
    traj_rows = soda(
        {
            "$select": "vehicle_id, global_time, local_y, v_vel, v_acc",
            "$where": (
                f"location='{LOCATION}' AND lane_id='2' "
                f"AND global_time >= {ms_at(FEATURED_T0)} AND global_time <= {ms_at(FEATURED_T1)}"
            ),
            "$order": "global_time",
            "$limit": "50000",
        }
    )
    by_id: dict[int, list] = defaultdict(list)
    for row in traj_rows:
        vid = int(row["vehicle_id"])
        t = int(float(row["global_time"]))
        # Keep one sample per second.
        sec = (t - START) // 1000
        series = by_id[vid]
        if series and series[-1]["t"] == sec:
            continue
        series.append(
            {
                "t": sec,
                "y": round(fnum(row, "local_y"), 2),
                "v": round(fnum(row, "v_vel"), 3),
            }
        )
    trajectories = [
        {"id": vid, "samples": samples}
        for vid, samples in sorted(by_id.items())
        if len(samples) >= 5
    ]

    pack = {
        "id": "where-should-the-speed-be-held",
        "version": 1,
        "generated": "2026-09-29",
        "recording": {
            "kind": "observed",
            "source": "ngsim-us-101",
            "location": LOCATION,
            "when": "15 June 2005",
            "clock": "07:50–08:35",
            "global_time": [START, END],
            "rows": cov["rows"],
            "length_ft": LENGTH_FT,
            "lanes": lanes,
            "ramp_lanes": ramps,
        },
        "bands": {
            "kind": "calculated",
            "source": "ngsim-us-101",
            "rule": "Mean speed, lanes 1–5. Upstream is local_y under 500 ft. Downstream is local_y over 1,700 ft. Miles per hour.",
            "rows": band_rows,
        },
        "featured": {
            "kind": "calculated",
            "source": "ngsim-us-101",
            "lane": 2,
            "from_s": FEATURED_T0,
            "to_s": FEATURED_T1,
            "global_time": [ms_at(FEATURED_T0), ms_at(FEATURED_T1)],
            "walk": walk,
            "frames": [
                {
                    "seconds": FEATURED_T0,
                    "downstream_mph": downstream_mean(now),
                    "cars": now,
                },
                {
                    "seconds": FEATURED_T1,
                    "downstream_mph": downstream_mean(later),
                    "cars": later,
                },
            ],
            "steps": steps,
            "car": featured,
        },
        "pockets": {
            "kind": "calculated",
            "source": "ngsim-us-101",
            "rule": "200-ft by 20-second cells on lanes 1–5. The back of the pocket is the upstream-most cell slower than 25 mph. A crossing is that edge moving at least 400 ft upstream at 5–12 mph while the downstream end, over 1,700 ft, stays above 35 mph. A faster jump is a different car becoming the slowest, and is not counted.",
            "crossings": pocket_rows,
        },
        "trajectories": {
            "kind": "observed",
            "source": "ngsim-us-101",
            "lane": 2,
            "from_s": FEATURED_T0,
            "to_s": FEATURED_T1,
            "sample_s": 1,
            "note": "One sample a second, lane 2, the featured minute. Feet and feet per second.",
            "vehicles": trajectories,
        },
        "morning": {
            "kind": "observed",
            "source": "ngsim-us-101",
            "note": "One instant of lanes 1–5. The first is the featured moment, 240 s. The opening seconds of the file hold almost no vehicles, so the pullback starts there.",
            "snapshots": snaps,
        },
        "sources": {
            "ngsim-us-101": {
                "name": "FHWA NGSIM vehicle trajectories, US-101",
                "url": "https://data.transportation.gov/Automobiles/Next-Generation-Simulation-NGSIM-Vehicle-Trajector/8ect-6jqj",
                "licence": "CC BY-SA 3.0",
                "api": BASE,
            }
        },
        "method": {
            "window": "location='us-101', the full study period",
            "cells": "Featured walk: 100-ft by 10-s cells on lane 2. Pocket rule: 200-ft by 20-s cells, lanes 1–5.",
            "command": "python3 scripts/freeze-us101-jam.py",
            "lamp": "A road lamp is on when acceleration is below −3 ft/s². A negative sign alone is noise in this file, and would light most of the road.",
        },
        "limitations": [
            "One morning, about 2,100 feet, 15 June 2005.",
            "Positions are noisy. A 100-foot cell is the resolution of the walk.",
            "Whether an incident sat just outside the cameras is not in this recording.",
            "Lanes 6–8 are the entrance, the auxiliary lane and the exit. They are drawn from the lane map and not modelled, so the film does not say they caused the pocket and does not say they did not.",
            "No variable speed limit was operating on this morning, so the film does not claim one would have worked.",
            "The film does not say why any particular driver braked.",
            "I-24 MOTION is a different road and is not this pack.",
        ],
    }
    OUT.write_text(json.dumps(pack, indent=2) + "\n")
    print("wrote", OUT, "bytes", OUT.stat().st_size)
    print("featured car", featured["id"], featured["y"], featured["mph"])
    print("downstream", downstream_mean(now), downstream_mean(later))
    print("crossings", len(pocket_rows))


def refresh_lamps() -> None:
    """Re-read acceleration at the instants the film draws, and rewrite only the lamps.

    Leaves every other frozen number where it is.
    """
    pack = json.loads(OUT.read_text())
    seconds = sorted(
        {step["seconds"] for step in pack["featured"]["steps"]}
        | {snap["seconds"] for snap in pack["morning"]["snapshots"]}
    )
    acc_at: dict[int, dict[int, float]] = {}
    for s in seconds:
        rows = soda(
            {
                "$select": "vehicle_id, v_acc",
                "$where": (
                    f"location='{LOCATION}' AND global_time={ms_at(s)} "
                    "AND lane_id in ('1','2','3','4','5')"
                ),
                "$limit": "5000",
            }
        )
        acc: dict[int, float] = {}
        for row in rows:
            acc[int(row["vehicle_id"])] = fnum(row, "v_acc")
        acc_at[s] = acc
        print(" ", s, "cars", len(acc))

    def apply(cars: list[dict], s: int) -> tuple[int, int]:
        on = 0
        missing = 0
        for car in cars:
            acc = acc_at[s].get(car["id"])
            if acc is None:
                missing += 1
                car["braking"] = False
                continue
            car["braking"] = is_braking(acc)
            on += int(car["braking"])
        return on, missing

    for step in pack["featured"]["steps"]:
        on, missing = apply(step["cars"], step["seconds"])
        print("step", step["seconds"], "lamps", on, "of", len(step["cars"]), "missing", missing)
    for snap in pack["morning"]["snapshots"]:
        on, missing = apply(snap["cars"], snap["seconds"])
        print("snap", snap["seconds"], "lamps", on, "of", len(snap["cars"]), "missing", missing)
    pack["method"]["lamp"] = (
        "A road lamp is on when acceleration is below −3 ft/s². "
        "A negative sign alone is noise in this file, and would light most of the road."
    )
    OUT.write_text(json.dumps(pack, indent=2) + "\n")
    print("wrote", OUT)


if __name__ == "__main__":
    import sys

    if "--lamps" in sys.argv:
        refresh_lamps()
    else:
        main()
