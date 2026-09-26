"""Freeze the 'Where should the recovery time sit?' evidence pack.

Reads the raw day cache written by scripts/fetch-rail-days.py and emits one frozen JSON
pack. The engine never queries the API at render time.

  python scripts/fetch-rail-days.py --start 2026-07-28 --days 60
  python scripts/freeze-rail-recovery.py

Decisions that live in the Decision Spec, restated here because the code enforces them:

  * Passenger services only. Freight is timetabled far slower over the same rails, and
    letting it into the scheduled-run-time median inflates apparent slack by minutes.
  * A line is a modal route signature - the stop sequence actually operated - never an
    average of stop positions across trains sharing two endpoints, which merges distinct
    physical routes into a path no train runs.
  * Padding is reported beside a percentile-free check (share of runs beating schedule)
    so the finding does not rest on the 5th-percentile floor.
  * The counterfactual conserves each line's total scheduled run time, so it redistributes
    recovery margin without buying journey time, and is labelled `modelled`.

See docs/decision-specs/rail-recovery-time.md.
"""

from __future__ import annotations

import argparse
import json
import statistics as st
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "figures" / "where-should-the-recovery-time-sit.v1.json"
FMT = "%Y-%m-%dT%H:%M:%S.%f%z"

LATE = 5.0
HORIZON = 6
MIN_LEG_OBS = 60
PASSENGER = ("Commuter", "Long-distance")
STRENGTHS = [0.0, 0.25, 0.5, 0.75, 1.0]

# Lines offered to the reader. Each cleared the sample bar on 24 verification days:
# 1,000+ next-stop late arrivals and 30+ days carrying 20+, inside a 60-day pack.
LINE_ENDPOINTS = {
    "north-main": ("Helsinki - Rovaniemi north main line", "Long-distance", ("HKI", "ROI")),
    "riihimaki-trunk": ("Helsinki - Riihimaki trunk", "Commuter", ("HKI", "RI")),
    "ring-rail": ("Ring Rail Line", "Commuter", ("HKI", "HKI")),
    "tampere-commuter": ("Helsinki - Tampere", "Commuter", ("HKI", "TPE")),
    "coastal": ("Helsinki - Siuntio coastal", "Commuter", ("HKI", "STI")),
    "oulu": ("Helsinki - Oulu", "Long-distance", ("HKI", "OL")),
    "joensuu": ("Helsinki - Joensuu", "Long-distance", ("HKI", "JNS")),
}
FOCUS = "north-main"


# --------------------------------------------------------------------------- reading


def minutes(a: str, b: str) -> float | None:
    try:
        return (datetime.strptime(b, FMT) - datetime.strptime(a, FMT)).total_seconds() / 60
    except (ValueError, TypeError):
        return None


def load_day(path: Path) -> list[dict]:
    """One day as a list of runs: ordered commercial stops with schedule and outcome."""
    runs = []
    for t in json.loads(path.read_bytes()):
        if t.get("cancelled") or t.get("trainCategory") not in PASSENGER:
            continue
        by_stop: dict[int, dict] = {}
        order: list[int] = []
        for r in t.get("timeTableRows", []):
            if r.get("cancelled") or not r.get("trainStopping") or not r.get("commercialStop"):
                continue
            key = len(order) if not order else None
            code = r["stationShortCode"]
            if not order or by_stop[order[-1]]["code"] != code:
                idx = len(order)
                order.append(idx)
                by_stop[idx] = {"code": code, "arr": None, "dep": None, "diff": None}
            idx = order[-1]
            if r["type"] == "ARRIVAL":
                by_stop[idx]["arr"] = r.get("actualTime")
                by_stop[idx]["sched_arr"] = r.get("scheduledTime")
                by_stop[idx]["diff"] = r.get("differenceInMinutes")
            else:
                by_stop[idx]["dep"] = r.get("actualTime")
                by_stop[idx]["sched_dep"] = r.get("scheduledTime")
        stops = [by_stop[i] for i in order]
        if len(stops) >= 3:
            runs.append(
                {
                    "category": t["trainCategory"],
                    "line_id": t.get("commuterLineID"),
                    "stops": stops,
                }
            )
    return runs


# ------------------------------------------------------------------- line definition


def subsequence(short: tuple, long: tuple) -> bool:
    it = iter(long)
    return all(c in it for c in short)


def derive_lines(days: dict[str, list[dict]]) -> dict[str, dict]:
    """Modal route signature per configured line, taken from operated stop sequences."""
    sigs: dict[tuple[str, str], Counter] = defaultdict(Counter)
    for runs in days.values():
        for run in runs:
            codes = tuple(s["code"] for s in run["stops"])
            for key, (_, cat, (a, b)) in LINE_ENDPOINTS.items():
                if run["category"] != cat:
                    continue
                if key == "ring-rail":
                    # A loop: leaves the centre and returns to it.
                    if len(codes) >= 15 and codes[0] in ("HKI", "PSL") and codes[-1] in ("HKI", "PSL"):
                        sigs[(key, cat)][codes] += 1
                    continue
                if a in codes and b in codes:
                    i, j = codes.index(a), codes.index(b)
                    span = codes[min(i, j) : max(i, j) + 1]
                    if len(span) >= 4:
                        sigs[(key, cat)][span if i <= j else span[::-1]] += 1

    out: dict[str, dict] = {}
    for (key, cat), counter in sigs.items():
        frequent = [s for s, n in counter.items() if n >= 5] or [counter.most_common(1)[0][0]]
        # the longest signature no other frequent signature extends
        frequent.sort(key=len, reverse=True)
        best = frequent[0]
        carried = sum(n for s, n in counter.items() if subsequence(s, best))
        label, _, _ = LINE_ENDPOINTS[key]
        out[key] = {
            "id": key,
            "label": label,
            "category": cat,
            "stops": list(best),
            "index": {c: i for i, c in enumerate(best)},
            "runs_in_window": carried,
        }
    return out


def on_line(line: dict, a: str, b: str) -> bool:
    idx = line["index"]
    return a in idx and b in idx and abs(idx[a] - idx[b]) <= 3


# ------------------------------------------------------------------------ measures


def band(values: list[float]) -> dict:
    vals = sorted(values)
    if not vals:
        return {}
    return {
        "median": round(st.median(vals), 4),
        "low": round(vals[0], 4),
        "high": round(vals[-1], 4),
        "days": len(vals),
    }


def survival(days: dict[str, list[dict]], keep) -> dict:
    """Share of 5+ minute late arrivals still 5+ late N stops on, with a day band."""
    per_day: dict[str, list[list[int]]] = {}
    for day, runs in days.items():
        tally = [[0, 0] for _ in range(HORIZON + 1)]
        for run in runs:
            stops = [s for s in run["stops"] if s["diff"] is not None]
            for i, s in enumerate(stops[:-1]):
                if s["diff"] < LATE or not keep(run, stops, i):
                    continue
                for k in range(1, HORIZON + 1):
                    if i + k >= len(stops):
                        break
                    tally[k][1] += 1
                    tally[k][0] += stops[i + k]["diff"] >= LATE
        per_day[day] = tally
    curve = []
    for k in range(1, HORIZON + 1):
        shares = [t[k][0] / t[k][1] for t in per_day.values() if t[k][1] >= 20]
        n = sum(t[k][1] for t in per_day.values())
        curve.append({"stops_on": k, "n": n, **band(shares)})
    return {"curve": curve}


def leg_padding(days: dict[str, list[dict]], keep) -> list[dict]:
    sched: dict[tuple, list[float]] = defaultdict(list)
    obs: dict[tuple, list[float]] = defaultdict(list)
    cat: dict[tuple, str] = {}
    for runs in days.values():
        for run in runs:
            stops = run["stops"]
            for i in range(len(stops) - 1):
                a, b = stops[i], stops[i + 1]
                if not keep(run, stops, i):
                    continue
                s = minutes(a.get("sched_dep"), b.get("sched_arr"))
                v = minutes(a.get("dep"), b.get("arr"))
                if s is None or v is None or not (0 < s < 120 and 0 < v < 120):
                    continue
                leg = (a["code"], b["code"])
                sched[leg].append(s)
                obs[leg].append(v)
                cat.setdefault(leg, run["category"])
    out = []
    for leg, s in sched.items():
        if len(s) < MIN_LEG_OBS:
            continue
        v = sorted(obs[leg])
        floor = v[max(0, int(0.05 * len(v)))]
        median_sched = st.median(s)
        out.append(
            {
                "from": leg[0],
                "to": leg[1],
                "category": cat[leg],
                "scheduled_min": round(median_sched, 2),
                "floor_min": round(floor, 2),
                "padding_min": round(median_sched - floor, 2),
                "beats_schedule": round(sum(1 for x in v if x < median_sched) / len(v), 4),
                "n": len(s),
            }
        )
    out.sort(key=lambda r: -r["padding_min"])
    return out


def spearman(xs: list[float], ys: list[float]) -> float:
    def rank(v: list[float]) -> list[float]:
        order = sorted(range(len(v)), key=lambda i: v[i])
        out = [0.0] * len(v)
        for pos, i in enumerate(order):
            out[i] = float(pos)
        return out

    rx, ry = rank(xs), rank(ys)
    mx, my = st.mean(rx), st.mean(ry)
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    den = (sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry)) ** 0.5
    return num / den if den else 0.0


PADDING_BUCKETS = [(-99.0, 0.0), (0.0, 0.5), (0.5, 1.0), (1.0, 2.0), (2.0, 4.0), (4.0, 99.0)]


def mechanism(days: dict[str, list[dict]], legs: list[dict], lines: list[dict]) -> dict:
    """Does margin predict survival, or is the service-type split doing the work?

    This is the story's spine, so it is measured rather than asserted. If it holds within
    each service type separately, the claim is about recovery margin - which a timetable
    planner controls directly - rather than about commuter versus long-distance, which they
    do not.
    """
    padding_of = {(l["from"], l["to"]): l for l in legs}
    tally: dict[tuple, list[int]] = defaultdict(lambda: [0, 0])
    for runs in days.values():
        for run in runs:
            stops = [s for s in run["stops"] if s["diff"] is not None]
            for a, b in zip(stops, stops[1:]):
                leg = (a["code"], b["code"])
                if leg in padding_of and a["diff"] >= LATE:
                    tally[leg][1] += 1
                    tally[leg][0] += b["diff"] >= LATE

    rows = [
        {"leg": padding_of[leg], "carry": k / n, "events": n}
        for leg, (k, n) in tally.items()
        if n >= 100
    ]

    def buckets(sel: list[dict]) -> list[dict]:
        out = []
        for lo, hi in PADDING_BUCKETS:
            b = [r for r in sel if lo <= r["leg"]["padding_min"] < hi]
            if not b:
                continue
            events = sum(r["events"] for r in b)
            out.append(
                {
                    "from_min": None if lo < -90 else lo,
                    "to_min": hi,
                    "legs": len(b),
                    "carry": round(sum(r["carry"] * r["events"] for r in b) / events, 4),
                    "events": events,
                }
            )
        return out

    def rho(sel: list[dict]) -> dict:
        if len(sel) < 10:
            return {}
        return {
            "spearman": round(
                spearman([r["leg"]["padding_min"] for r in sel], [r["carry"] for r in sel]), 3
            ),
            "legs": len(sel),
        }

    return {
        "kind": "calculated",
        "claim": "Delay survival across a leg falls as that leg's recovery margin rises.",
        "across_lines": {
            "spearman": round(
                spearman(
                    [l["padding_summary"]["median_min"] for l in lines],
                    [l["survival"][0]["median"] for l in lines],
                ),
                3,
            ),
            "lines": len(lines),
        },
        "across_legs": rho(rows),
        "within_category": {
            cat: rho([r for r in rows if r["leg"]["category"] == cat]) for cat in PASSENGER
        },
        "buckets": buckets(rows),
        "buckets_by_category": {
            cat: buckets([r for r in rows if r["leg"]["category"] == cat]) for cat in PASSENGER
        },
        "note": (
            "The trend is strong but not monotonic bucket to bucket; read the correlation "
            "and the end points, not each step."
        ),
    }


def category_head_to_head(days: dict[str, list[dict]]) -> dict:
    """On how many days is commuter carry-over above long-distance?

    The story's spine, so it is measured into the pack rather than carried in prose.
    """
    per_day: dict[str, dict[str, list[int]]] = defaultdict(lambda: defaultdict(lambda: [0, 0]))
    for day, runs in days.items():
        for run in runs:
            stops = [s for s in run["stops"] if s["diff"] is not None]
            for i in range(len(stops) - 1):
                if stops[i]["diff"] >= LATE:
                    per_day[run["category"]][day][1] += 1
                    per_day[run["category"]][day][0] += stops[i + 1]["diff"] >= LATE
    a, b = "Commuter", "Long-distance"
    shared = [
        d for d in per_day[a] if d in per_day[b] and per_day[a][d][1] >= 20 and per_day[b][d][1] >= 20
    ]
    wins = sum(
        (per_day[a][d][0] / per_day[a][d][1]) > (per_day[b][d][0] / per_day[b][d][1]) for d in shared
    )
    return {
        "kind": "observed",
        "higher": a,
        "days_higher": wins,
        "shared_days": len(shared),
    }


def counterfactual(days: dict[str, list[dict]], line: dict) -> dict:
    """Redistribute a line's padding toward legs where delay survives, then replay.

    Conserves the line's total scheduled run time, so journey time is not bought - only
    moved. Replay holds each train's observed running behaviour fixed and shifts only the
    scheduled run time, which is the modelling assumption to state on screen: taking slack
    off a leg cannot make that leg generate delay in this arithmetic, though it would in
    the world.
    """
    keep = lambda run, stops, i: on_line(line, stops[i]["code"], stops[i + 1]["code"])
    legs = {(r["from"], r["to"]): r for r in leg_padding(days, keep)}
    if len(legs) < 4:
        return {}

    # survival weight per leg: how often a delay entering the leg is still late leaving it
    surv: dict[tuple, list[int]] = defaultdict(lambda: [0, 0])
    chains: list[list[tuple]] = []
    for runs in days.values():
        for run in runs:
            stops = [s for s in run["stops"] if s["diff"] is not None]
            chain = []
            for i in range(len(stops) - 1):
                leg = (stops[i]["code"], stops[i + 1]["code"])
                if leg not in legs:
                    if chain:
                        chains.append(chain)
                        chain = []
                    continue
                chain.append((leg, stops[i]["diff"], stops[i + 1]["diff"]))
                if stops[i]["diff"] >= LATE:
                    surv[leg][1] += 1
                    surv[leg][0] += stops[i + 1]["diff"] >= LATE
            if chain:
                chains.append(chain)

    weight = {
        leg: (surv[leg][0] / surv[leg][1] if surv[leg][1] >= 10 else 0.0) for leg in legs
    }
    total_w = sum(weight.values())
    total_pad = sum(r["padding_min"] for r in legs.values())
    if total_w <= 0 or not chains:
        return {}
    target = {leg: total_pad * weight[leg] / total_w for leg in legs}

    variants = []
    for s in STRENGTHS:
        shift = {
            leg: s * (target[leg] - legs[leg]["padding_min"]) for leg in legs
        }
        tally = [[0, 0] for _ in range(HORIZON + 1)]
        for chain in chains:
            for start in range(len(chain)):
                if chain[start][1] < LATE:
                    continue
                delay = chain[start][1]
                for k in range(1, HORIZON + 1):
                    j = start + k - 1
                    if j >= len(chain):
                        break
                    leg, d_in, d_out = chain[j]
                    delay = max(0.0, delay + (d_out - d_in) - shift[leg])
                    tally[k][1] += 1
                    tally[k][0] += delay >= LATE
        variants.append(
            {
                "strength": s,
                "curve": [
                    {
                        "stops_on": k,
                        "share": round(tally[k][0] / tally[k][1], 4) if tally[k][1] else None,
                        "n": tally[k][1],
                    }
                    for k in range(1, HORIZON + 1)
                ],
                "legs_made_tighter": sum(1 for v in shift.values() if v < -0.05),
                "legs_made_slacker": sum(1 for v in shift.values() if v > 0.05),
                "max_shift_min": round(max((abs(v) for v in shift.values()), default=0), 2),
                "journey_time_change_min": round(sum(shift.values()), 3),
            }
        )
    return {
        "kind": "modelled",
        "method": (
            "Redistribute the line's total padding across legs in proportion to measured "
            "delay survival, conserving total scheduled run time, then replay observed "
            "delay deltas through the new schedule."
        ),
        "assumes": (
            "Each train's running behaviour is unchanged. Taking slack off a leg cannot "
            "make that leg generate delay in this arithmetic, though it would in the world."
        ),
        "variants": variants,
    }


def separation(days: dict[str, list[dict]], lines: dict[str, dict]) -> list[dict]:
    """Do two lines of the same service type separate day after day, or cross?

    Lines are counted independently rather than each leg being assigned to one line: the
    question is how line A behaves versus line B, and legs they share are part of both.
    """
    per_day: dict[str, dict[str, list[int]]] = defaultdict(lambda: defaultdict(lambda: [0, 0]))
    for day, runs in days.items():
        for run in runs:
            stops = [s for s in run["stops"] if s["diff"] is not None]
            for key, line in lines.items():
                if line["category"] != run["category"]:
                    continue
                for i in range(len(stops) - 1):
                    if not on_line(line, stops[i]["code"], stops[i + 1]["code"]):
                        continue
                    if stops[i]["diff"] >= LATE:
                        per_day[key][day][1] += 1
                        per_day[key][day][0] += stops[i + 1]["diff"] >= LATE
    keys = list(lines)
    out = []
    for i, a in enumerate(keys):
        for b in keys[i + 1 :]:
            if lines[a]["category"] != lines[b]["category"]:
                continue
            shared = [
                d
                for d in per_day[a]
                if d in per_day[b] and per_day[a][d][1] >= 15 and per_day[b][d][1] >= 15
            ]
            if len(shared) < 5:
                continue
            wins = sum(
                (per_day[a][d][0] / per_day[a][d][1]) > (per_day[b][d][0] / per_day[b][d][1])
                for d in shared
            )
            out.append(
                {
                    "a": a,
                    "b": b,
                    "category": lines[a]["category"],
                    "a_higher_days": wins,
                    "shared_days": len(shared),
                    "separates": abs(wins / len(shared) - 0.5) > 0.3,
                }
            )
    return out


# ---------------------------------------------------------------------------- main


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default="/tmp/rail/pack")
    ap.add_argument("--out", default=str(OUT))
    ap.add_argument("--stations", default="/tmp/rail_stations.json")
    args = ap.parse_args()

    paths = sorted(Path(args.cache).glob("*.json"))
    if len(paths) < 20:
        raise SystemExit(f"only {len(paths)} day files in {args.cache}; run fetch-rail-days.py")

    names = {}
    sp = Path(args.stations)
    if sp.exists():
        names = {
            s["stationShortCode"]: s["stationName"] for s in json.loads(sp.read_bytes())
        }

    print(f"reading {len(paths)} days from {args.cache}", flush=True)
    days = {}
    for p in paths:
        days[p.stem] = load_day(p)
    runs_total = sum(len(v) for v in days.values())
    print(f"  {runs_total:,} passenger runs", flush=True)

    lines = derive_lines(days)
    print(f"  {len(lines)} lines derived", flush=True)

    all_rows = 0
    with_actual = 0
    with_diff = 0
    late_by_day = {}
    cats = Counter()
    for day, runs in days.items():
        late = arr = 0
        for run in runs:
            cats[run["category"]] += 1
            for s in run["stops"]:
                all_rows += 1
                with_actual += s["arr"] is not None
                if s["diff"] is not None:
                    with_diff += 1
                    arr += 1
                    late += s["diff"] >= LATE
        late_by_day[day] = {"arrivals": arr, "late_share": round(late / arr, 5) if arr else None}

    everything = lambda run, stops, i: True
    pack = {
        "id": "where-should-the-recovery-time-sit",
        "version": 1,
        "generated": datetime.now().date().isoformat(),
        "source": {
            "name": "Fintraffic Digitraffic Railway",
            "endpoint": "https://rata.digitraffic.fi/api/v1/trains/{departure_date}",
            "licence": "CC BY 4.0",
            "attribution": "Traffic data source Fintraffic / digitraffic.fi, licence CC BY 4.0",
            "note": "Public operational feed. This analysis does not speak for Fintraffic or any operator.",
        },
        "method": {
            "late_threshold_min": LATE,
            "horizon_stops": HORIZON,
            "min_leg_observations": MIN_LEG_OBS,
            "services": list(PASSENGER),
            "excluded": "Cargo, shunting, locomotive, on-track machines, test drives",
            "padding": "median scheduled leg run time minus 5th percentile of observed run times",
            "line": "modal route signature (operated stop sequence), expresses absorbed as subsequences",
            "window": {"days": len(paths), "first": paths[0].stem, "last": paths[-1].stem},
        },
        "coverage": {
            "kind": "observed",
            "timetable_rows": all_rows,
            "with_actual_time": round(with_actual / all_rows, 4),
            "with_delay_minutes": round(with_diff / all_rows, 4),
            "runs": runs_total,
            "runs_by_category": dict(cats),
        },
        "baseline": {
            "kind": "observed",
            "per_day": late_by_day,
            "late_share": band([v["late_share"] for v in late_by_day.values() if v["late_share"]]),
        },
        "survival": {
            "kind": "observed",
            "all": survival(days, everything)["curve"],
            "by_category": {
                cat: survival(days, lambda run, stops, i, c=cat: run["category"] == c)["curve"]
                for cat in PASSENGER
            },
        },
        "padding": {"kind": "calculated", "legs": leg_padding(days, everything)},
        "category_head_to_head": category_head_to_head(days),
        "line_separation": {"kind": "observed", "pairs": separation(days, lines)},
        "focus_line": FOCUS,
        "lines": [],
    }

    by_cat: dict[str, list[float]] = defaultdict(list)
    for leg in pack["padding"]["legs"]:
        leg["from_name"] = names.get(leg["from"], leg["from"])
        leg["to_name"] = names.get(leg["to"], leg["to"])
        by_cat[leg["category"]].append(leg["padding_min"])
    pack["padding"]["by_category"] = {
        cat: {
            "legs": len(v),
            "median_min": round(st.median(v), 3),
            "low_min": round(min(v), 2),
            "high_min": round(max(v), 2),
            "negative_legs": sum(1 for x in v if x < 0),
            "negative_share": round(sum(1 for x in v if x < 0) / len(v), 4),
        }
        for cat, v in by_cat.items()
    }
    neg = [l for l in pack["padding"]["legs"] if l["padding_min"] < 0]
    pack["padding"]["negative_legs_beating_schedule"] = sum(
        1 for l in neg if l["beats_schedule"] > 0.5
    )
    pack["padding"]["negative_legs"] = len(neg)

    for key, line in lines.items():
        keep = lambda run, stops, i, L=line: L["category"] == run["category"] and on_line(
            L, stops[i]["code"], stops[i + 1]["code"]
        )
        legs = leg_padding(days, keep)
        for leg in legs:
            leg["from_name"] = names.get(leg["from"], leg["from"])
            leg["to_name"] = names.get(leg["to"], leg["to"])
        pads = [l["padding_min"] for l in legs]
        entry = {
            "id": key,
            "label": line["label"],
            "category": line["category"],
            "stops": [{"code": c, "name": names.get(c, c)} for c in line["stops"]],
            "runs_in_window": line["runs_in_window"],
            "survival": survival(days, keep)["curve"],
            "legs": legs,
            "padding_summary": {
                "legs": len(legs),
                "median_min": round(st.median(pads), 3) if pads else None,
                "low_min": round(min(pads), 2) if pads else None,
                "high_min": round(max(pads), 2) if pads else None,
                "negative_legs": sum(1 for p in pads if p < 0),
            },
            "counterfactual": counterfactual(days, line),
        }
        pack["lines"].append(entry)
        print(
            f"  {key:<18} {len(legs):>3} legs, "
            f"n@1={entry['survival'][0].get('n', 0):>6,}, "
            f"carry {entry['survival'][0].get('median', 0):.0%}",
            flush=True,
        )

    pack["mechanism"] = mechanism(days, pack["padding"]["legs"], pack["lines"])
    m = pack["mechanism"]
    print(
        f"\n  mechanism: rho={m['across_lines']['spearman']} across lines, "
        f"{m['across_legs'].get('spearman')} across legs, "
        + ", ".join(
            f"{c}={v.get('spearman')}" for c, v in m["within_category"].items() if v
        ),
        flush=True,
    )

    pack["limitations"] = [
        "Cause attribution covers ~1% of rows: we can say a delay survived a leg, mostly not why.",
        "The technical minimum run time is a 5th-percentile proxy, not an engineering figure.",
        "Samples thin beyond about four stops.",
        "Lines separate when their recovery margin differs and not otherwise; the picker must not rank lines by quality.",
        "Margin predicting survival is an association measured across legs, not a controlled experiment.",
        "Finland only. No capacity, rolling-stock, crew or cost model.",
        "The counterfactual is arithmetic on observed delays, not an operational plan.",
    ]

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(pack, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"\nwrote {out} ({out.stat().st_size/1024:.0f} KB)")


if __name__ == "__main__":
    main()
