"""Freeze the 'Where should the recovery time sit?' evidence pack.

Reads the raw day cache written by scripts/fetch-rail-days.py and emits one frozen JSON
pack. The engine never queries the API at render time.

  python scripts/fetch-rail-days.py --start 2025-09-26 --days 365 --dest /tmp/rail/year
  python scripts/freeze-rail-recovery.py --cache /tmp/rail/year

Decisions that live in the Decision Spec, restated here because the code enforces them:

  * Passenger services only. Freight is timetabled far slower over the same rails, and
    letting it into the scheduled-run-time median inflates apparent slack by minutes.
  * A line is a modal route signature - the stop sequence actually operated - never an
    average of stop positions across trains sharing two endpoints, which merges distinct
    physical routes into a path no train runs.
  * PADDING IS COMPUTED PER TIMETABLE PERIOD. Finnish timetables are re-cut in December
    and adjusted for summer; ~16% of legs move by half a minute or more across the
    December boundary, some by five minutes. A median scheduled run time pooled over a
    year describes no timetable that was ever operated. Periods are detected from the
    data, and the headline figures come from the most recent one.
  * A LEG IS PER SERVICE TYPE. Helsinki-Pasila is run by both commuter and long-distance
    trains at different scheduled run times; pooling them blends two timetables in exactly
    the way letting freight in did. The unit is (from, to, category) throughout.
  * Padding is reported beside a percentile-free check (share of runs beating schedule)
    so the finding does not rest on the 5th-percentile floor.
  * The counterfactual conserves each line's total scheduled run time, so it redistributes
    recovery margin without buying journey time, and is labelled `modelled`.

Streams: a year of raw JSON is ~7 GB and the pod has ~6 GB of RAM, so days are reduced to
compact accumulators as they are read, and the counterfactual replay takes a second pass
over the files rather than holding runs in memory.

See docs/decision-specs/rail-recovery-time.md.
"""

from __future__ import annotations

import argparse
import json
import statistics as st
from array import array
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "figures" / "where-should-the-recovery-time-sit.v1.json"
FMT = "%Y-%m-%dT%H:%M:%S.%f%z"

LATE = 5.0
HORIZON = 6
MIN_LEG_OBS = 60
MIN_LEG_LATE_EVENTS = 100
PASSENGER = ("Commuter", "Long-distance")
STRENGTHS = [0.0, 0.25, 0.5, 0.75, 1.0]

# A timetable period boundary: a day on which enough legs shift scheduled run time by at
# least half a minute. The threshold is derived from the data rather than guessed - week over
# week, an ordinary day moves a few percent of legs, and the December re-cut moves ~19%. A
# fixed 6% sat inside the noise and split the year into seven spurious periods.
PERIOD_SHIFT_MIN = 0.5
PERIOD_SHARE_FLOOR = 0.10
PERIOD_SHARE_MULTIPLE = 3.0
MIN_PERIOD_LENGTH = 21

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


def minutes(a: str | None, b: str | None) -> float | None:
    try:
        return (datetime.strptime(b, FMT) - datetime.strptime(a, FMT)).total_seconds() / 60
    except (ValueError, TypeError):
        return None


def read_runs(path: Path):
    """Yield one run at a time: ordered commercial stops with schedule and outcome."""
    for t in json.loads(path.read_bytes()):
        if t.get("cancelled") or t.get("trainCategory") not in PASSENGER:
            continue
        stops: list[dict] = []
        for r in t.get("timeTableRows", []):
            if r.get("cancelled") or not r.get("trainStopping") or not r.get("commercialStop"):
                continue
            code = r["stationShortCode"]
            if not stops or stops[-1]["code"] != code:
                stops.append(
                    {
                        "code": code,
                        "arr": None,
                        "dep": None,
                        "sched_arr": None,
                        "sched_dep": None,
                        "diff": None,
                    }
                )
            if r["type"] == "ARRIVAL":
                stops[-1]["arr"] = r.get("actualTime")
                stops[-1]["sched_arr"] = r.get("scheduledTime")
                stops[-1]["diff"] = r.get("differenceInMinutes")
            else:
                stops[-1]["dep"] = r.get("actualTime")
                stops[-1]["sched_dep"] = r.get("scheduledTime")
        if len(stops) >= 3:
            yield t["trainCategory"], stops


def band(values: list[float]) -> dict:
    vals = sorted(v for v in values if v is not None)
    if not vals:
        return {}
    return {
        "median": round(st.median(vals), 4),
        "low": round(vals[0], 4),
        "high": round(vals[-1], 4),
        "days": len(vals),
    }


def pct(sorted_vals, q: float) -> float:
    return sorted_vals[max(0, min(len(sorted_vals) - 1, int(q * len(sorted_vals))))]


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


class Accum:
    """Everything the pack needs, reduced from the raw days in one streaming pass."""

    def __init__(self, days: list[str]) -> None:
        self.days = days
        self.day_index = {d: i for i, d in enumerate(days)}
        self.rows = 0
        self.with_actual = 0
        self.with_diff = 0
        self.runs = 0
        self.by_category: Counter = Counter()
        self.arrivals_per_day: Counter = Counter()
        self.late_per_day: Counter = Counter()
        # survival: scope -> day -> k -> [kept, base]
        self.surv: dict = defaultdict(
            lambda: defaultdict(lambda: [[0, 0] for _ in range(HORIZON + 1)])
        )
        # per-leg run times, kept flat with a parallel day index so any window can be sliced.
        # key is (from, to, category): a leg run by two service types is two legs.
        self.leg_sched: dict[tuple, array] = defaultdict(lambda: array("f"))
        self.leg_obs: dict[tuple, array] = defaultdict(lambda: array("f"))
        self.leg_day: dict[tuple, array] = defaultdict(lambda: array("H"))
        # leg -> day -> [still late, entered late]
        self.leg_carry: dict = defaultdict(lambda: defaultdict(lambda: [0, 0]))
        self.line_stops: dict[str, Counter] = defaultdict(Counter)

    # ---------------------------------------------------------------- pass one

    def add_day(self, day: str, path: Path, lines: dict | None) -> None:
        di = self.day_index[day]
        for category, stops in read_runs(path):
            self.runs += 1
            self.by_category[category] += 1
            codes = tuple(s["code"] for s in stops)

            if lines is None:
                self._collect_signatures(category, codes)

            for s in stops:
                self.rows += 1
                self.with_actual += s["arr"] is not None
                if s["diff"] is not None:
                    self.with_diff += 1
                    self.arrivals_per_day[day] += 1
                    self.late_per_day[day] += s["diff"] >= LATE

            seq = [s for s in stops if s["diff"] is not None]
            self._survival(day, category, seq, lines)

            for a, b in zip(stops, stops[1:]):
                sched = minutes(a["sched_dep"], b["sched_arr"])
                obs = minutes(a["dep"], b["arr"])
                if sched is None or obs is None:
                    continue
                if not (0 < sched < 120 and 0 < obs < 120):
                    continue
                leg = (a["code"], b["code"], category)
                self.leg_sched[leg].append(sched)
                self.leg_obs[leg].append(obs)
                self.leg_day[leg].append(di)

            for a, b in zip(seq, seq[1:]):
                if a["diff"] >= LATE:
                    cell = self.leg_carry[(a["code"], b["code"], category)][day]
                    cell[1] += 1
                    cell[0] += b["diff"] >= LATE

    def _collect_signatures(self, category: str, codes: tuple) -> None:
        for key, (_, cat, (a, b)) in LINE_ENDPOINTS.items():
            if category != cat:
                continue
            if key == "ring-rail":
                if len(codes) >= 15 and codes[0] in ("HKI", "PSL") and codes[-1] in ("HKI", "PSL"):
                    self.line_stops[key][codes] += 1
                continue
            if a in codes and b in codes:
                i, j = codes.index(a), codes.index(b)
                span = codes[min(i, j) : max(i, j) + 1]
                if len(span) >= 4:
                    self.line_stops[key][span if i <= j else span[::-1]] += 1

    def _survival(self, day: str, category: str, seq: list[dict], lines: dict | None) -> None:
        scopes = ["all", f"cat:{category}"]
        if lines:
            for key, line in lines.items():
                if line["category"] == category:
                    scopes.append(f"line:{key}")
        for i, s in enumerate(seq[:-1]):
            if s["diff"] < LATE:
                continue
            for scope in scopes:
                if scope.startswith("line:"):
                    line = lines[scope[5:]]
                    if not on_line(line, seq[i]["code"], seq[i + 1]["code"]):
                        continue
                tally = self.surv[scope][day]
                for k in range(1, HORIZON + 1):
                    if i + k >= len(seq):
                        break
                    tally[k][1] += 1
                    tally[k][0] += seq[i + k]["diff"] >= LATE

    # ------------------------------------------------------------------ derive

    def curve(self, scope: str, days: set[str] | None = None) -> list[dict]:
        per_day = self.surv.get(scope, {})
        out = []
        for k in range(1, HORIZON + 1):
            shares, n = [], 0
            for day, tally in per_day.items():
                if days is not None and day not in days:
                    continue
                if tally[k][1] >= 20:
                    shares.append(tally[k][0] / tally[k][1])
                n += tally[k][1]
            out.append({"stops_on": k, "n": n, **band(shares)})
        return out

    def periods(self, verbose: bool = False) -> list[dict]:
        """Detect timetable periods from shifts in scheduled run time.

        Compared week over week, not day over day: a Friday and a Saturday run different
        timetables, so consecutive days are the wrong baseline. Day i against day i-7 is the
        same weekday, which isolates a re-cut from the ordinary weekly pattern. A re-cut on
        date D then shows up for the seven comparisons D..D+6, so a period opens at the first
        flagged day of a run.
        """
        per_day: list[dict[tuple, float]] = [dict() for _ in self.days]
        for leg, sched in self.leg_sched.items():
            acc: dict[int, list[float]] = defaultdict(list)
            for value, di in zip(sched, self.leg_day[leg]):
                acc[di].append(value)
            for di, vals in acc.items():
                if len(vals) >= 2:
                    per_day[di][leg] = st.median(vals)

        share: list[float | None] = [None] * len(self.days)
        for i in range(7, len(self.days)):
            prev, cur = per_day[i - 7], per_day[i]
            common = prev.keys() & cur.keys()
            if len(common) < 100:
                continue
            moved = sum(1 for l in common if abs(cur[l] - prev[l]) >= PERIOD_SHIFT_MIN)
            share[i] = moved / len(common)

        observed = [s for s in share if s is not None]
        baseline = st.median(observed) if observed else 0.0
        threshold = max(PERIOD_SHARE_FLOOR, PERIOD_SHARE_MULTIPLE * baseline)
        self.period_threshold = threshold
        self.period_baseline = baseline

        flagged = [s is not None and s >= threshold for s in share]
        boundaries = [0] + [
            i for i in range(len(self.days)) if flagged[i] and not flagged[i - 1]
        ] + [len(self.days)]
        boundaries = sorted(set(boundaries))

        if verbose:
            print(
                f"  week-over-week shift: median {baseline:.1%} of legs, "
                f"boundary threshold {threshold:.1%}",
                flush=True,
            )
            top = sorted(
                (i for i in range(len(self.days)) if share[i] is not None),
                key=lambda i: -share[i],
            )[:6]
            for i in top:
                print(f"    {self.days[i]}  {share[i]:.1%} of legs moved", flush=True)

        out = []
        for a, b in zip(boundaries, boundaries[1:]):
            if b - a < MIN_PERIOD_LENGTH:  # too short to carry a padding figure of its own
                if out:
                    out[-1]["last"] = self.days[b - 1]
                    out[-1]["day_indices"] = range(out[-1]["_start"], b)
                    out[-1]["days"] = b - out[-1]["_start"]
                    continue
            out.append(
                {
                    "first": self.days[a],
                    "last": self.days[b - 1],
                    "days": b - a,
                    "day_indices": range(a, b),
                    "_start": a,
                    "shift_share_at_start": round(share[a], 4) if share[a] is not None else None,
                }
            )
        for p in out:
            p.pop("_start", None)
        return out

    def padding(self, day_indices: range, keep=None) -> list[dict]:
        lo, hi = day_indices.start, day_indices.stop
        out = []
        for leg, sched in self.leg_sched.items():
            if keep and not keep(leg):
                continue
            days_arr = self.leg_day[leg]
            obs_arr = self.leg_obs[leg]
            s_sel = [v for v, d in zip(sched, days_arr) if lo <= d < hi]
            if len(s_sel) < MIN_LEG_OBS:
                continue
            o_sel = sorted(v for v, d in zip(obs_arr, days_arr) if lo <= d < hi)
            median_sched = st.median(s_sel)
            floor = pct(o_sel, 0.05)
            out.append(
                {
                    "from": leg[0],
                    "to": leg[1],
                    "category": leg[2],
                    "scheduled_min": round(median_sched, 2),
                    "floor_min": round(floor, 2),
                    "padding_min": round(median_sched - floor, 2),
                    "beats_schedule": round(
                        sum(1 for x in o_sel if x < median_sched) / len(o_sel), 4
                    ),
                    "n": len(s_sel),
                }
            )
        out.sort(key=lambda r: -r["padding_min"])
        return out

    def leg_carry_in(self, days: set[str]) -> dict[tuple, tuple[float, int]]:
        out = {}
        for leg, per_day in self.leg_carry.items():
            kept = base = 0
            for day, cell in per_day.items():
                if day in days:
                    kept += cell[0]
                    base += cell[1]
            if base:
                out[leg] = (kept / base, base)
        return out


def subsequence(short: tuple, long: tuple) -> bool:
    it = iter(long)
    return all(c in it for c in short)


def derive_lines(signatures: dict[str, Counter], min_runs: int = 5) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for key, counter in signatures.items():
        if not counter:
            continue
        frequent = [s for s, n in counter.items() if n >= min_runs] or [
            counter.most_common(1)[0][0]
        ]
        frequent.sort(key=len, reverse=True)
        best = frequent[0]
        label, cat, _ = LINE_ENDPOINTS[key]
        out[key] = {
            "id": key,
            "label": label,
            "category": cat,
            "stops": list(best),
            "index": {c: i for i, c in enumerate(best)},
            "runs_in_window": sum(n for s, n in counter.items() if subsequence(s, best)),
        }
    return out


def on_line(line: dict, a: str, b: str) -> bool:
    idx = line["index"]
    return a in idx and b in idx and abs(idx[a] - idx[b]) <= 3


PADDING_BUCKETS = [(-99.0, 0.0), (0.0, 0.5), (0.5, 1.0), (1.0, 2.0), (2.0, 4.0), (4.0, 99.0)]


def mechanism(legs: list[dict], carry: dict, lines: list[dict]) -> dict:
    """Does margin predict survival, or is the service-type split doing the work?

    Margin and survival are read from the SAME timetable period; comparing a leg's padding
    under one timetable against its delays under another would be measuring nothing.
    """
    rows = []
    for leg in legs:
        c = carry.get((leg["from"], leg["to"], leg["category"]))
        if c and c[1] >= MIN_LEG_LATE_EVENTS:
            rows.append({"leg": leg, "carry": c[0], "events": c[1]})

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


def category_head_to_head(acc: Accum, days: set[str]) -> dict:
    a, b = "Commuter", "Long-distance"
    pa, pb = acc.surv[f"cat:{a}"], acc.surv[f"cat:{b}"]
    shared = [
        d for d in pa if d in pb and d in days and pa[d][1][1] >= 20 and pb[d][1][1] >= 20
    ]
    wins = sum(
        (pa[d][1][0] / pa[d][1][1]) > (pb[d][1][0] / pb[d][1][1]) for d in shared
    )
    return {"kind": "observed", "higher": a, "days_higher": wins, "shared_days": len(shared)}


def separation(acc: Accum, lines: dict, days: set[str]) -> list[dict]:
    """Do two lines of the same service type separate day after day, or cross?"""
    keys = list(lines)
    out = []
    for i, a in enumerate(keys):
        for b in keys[i + 1 :]:
            if lines[a]["category"] != lines[b]["category"]:
                continue
            pa, pb = acc.surv[f"line:{a}"], acc.surv[f"line:{b}"]
            shared = [
                d
                for d in pa
                if d in pb and d in days and pa[d][1][1] >= 15 and pb[d][1][1] >= 15
            ]
            if len(shared) < 5:
                continue
            wins = sum((pa[d][1][0] / pa[d][1][1]) > (pb[d][1][0] / pb[d][1][1]) for d in shared)
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


def seasonality(acc: Accum) -> dict:
    """Month by month, so a pack covering a year says what a season does to the mechanism."""
    months: dict[str, list[str]] = defaultdict(list)
    for day in acc.days:
        months[day[:7]].append(day)
    out = []
    for month, days in sorted(months.items()):
        if len(days) < 14:
            continue
        dayset = set(days)
        row = {"month": month, "days": len(days)}
        late = sum(acc.late_per_day[d] for d in days)
        arr = sum(acc.arrivals_per_day[d] for d in days)
        row["late_share"] = round(late / arr, 5) if arr else None
        for scope, name in (("all", "all"), ("cat:Commuter", "commuter"), ("cat:Long-distance", "long_distance")):
            c = acc.curve(scope, dayset)
            row[f"carry_{name}"] = c[0].get("median")
        out.append(row)
    return {
        "kind": "observed",
        "per_month": out,
        "note": (
            "Lateness volume swings far more across the year than what happens to a delay "
            "once it exists. Compare late_share against carry_all."
        ),
    }


def counterfactual_shifts(legs: list[dict], carry: dict) -> dict | None:
    """Target padding per leg: same total, redistributed toward where delay survives."""
    weight, pad = {}, {}
    for leg in legs:
        key = (leg["from"], leg["to"], leg["category"])
        c = carry.get(key)
        weight[key] = c[0] if c and c[1] >= 10 else 0.0
        pad[key] = leg["padding_min"]
    total_w = sum(weight.values())
    if len(pad) < 4 or total_w <= 0:
        return None
    total_pad = sum(pad.values())
    return {
        key: {
            s: s * (total_pad * weight[key] / total_w - pad[key]) for s in STRENGTHS
        }
        for key in pad
    }


def replay(paths: list[Path], lines: dict, shifts: dict[str, dict], day_filter: set[str]) -> dict:
    """Second pass: replay observed delay deltas through each counterfactual schedule."""
    tally = {
        key: {s: [[0, 0] for _ in range(HORIZON + 1)] for s in STRENGTHS} for key in shifts
    }
    for path in paths:
        if path.stem not in day_filter:
            continue
        for category, stops in read_runs(path):
            seq = [s for s in stops if s["diff"] is not None]
            for key, shift in shifts.items():
                line = lines[key]
                if line["category"] != category:
                    continue
                chain = []
                for a, b in zip(seq, seq[1:]):
                    leg = (a["code"], b["code"], category)
                    if leg in shift and on_line(line, a["code"], b["code"]):
                        chain.append((leg, a["diff"], b["diff"]))
                    elif chain:
                        _replay_chain(chain, shift, tally[key])
                        chain = []
                if chain:
                    _replay_chain(chain, shift, tally[key])
    return tally


def _replay_chain(chain: list[tuple], shift: dict, tally: dict) -> None:
    for s in STRENGTHS:
        for start in range(len(chain)):
            if chain[start][1] < LATE:
                continue
            delay = float(chain[start][1])
            for k in range(1, HORIZON + 1):
                j = start + k - 1
                if j >= len(chain):
                    break
                leg, d_in, d_out = chain[j]
                delay = max(0.0, delay + (d_out - d_in) - shift[leg][s])
                tally[s][k][1] += 1
                tally[s][k][0] += delay >= LATE


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default="/tmp/rail/year")
    ap.add_argument("--out", default=str(OUT))
    ap.add_argument("--stations", default="/tmp/rail_stations.json")
    args = ap.parse_args()

    paths = sorted(Path(args.cache).glob("*.json"))
    if len(paths) < 20:
        raise SystemExit(f"only {len(paths)} day files in {args.cache}; run fetch-rail-days.py")

    names = {}
    sp = Path(args.stations)
    if sp.exists():
        names = {s["stationShortCode"]: s["stationName"] for s in json.loads(sp.read_bytes())}

    days = [p.stem for p in paths]
    print(f"pass 1: reading {len(paths)} days from {args.cache}", flush=True)

    # Signatures must exist before per-line survival can be tallied, so a sample of days
    # seeds them and the rest use them. Sampled across the window rather than taken from
    # the front: ten consecutive days missed the Ring Rail Line, whose loop runs under many
    # stop-list variants and needs a wider look to reach the frequency threshold.
    step = max(1, len(paths) // 20)
    seed_paths = paths[::step][:20]
    seed = Accum(days)
    for p in seed_paths:
        seed.add_day(p.stem, p, None)
    lines = derive_lines(seed.line_stops, min_runs=3)
    missing = set(LINE_ENDPOINTS) - set(lines)
    print(f"  {len(lines)} lines derived from {len(seed_paths)} sampled days", flush=True)
    if missing:
        print(f"  WARNING: no route signature for {sorted(missing)}", flush=True)

    acc = Accum(days)
    for i, p in enumerate(paths, 1):
        acc.add_day(p.stem, p, lines)
        if i % 30 == 0 or i == len(paths):
            print(f"  {i}/{len(paths)} days, {acc.runs:,} runs", flush=True)

    periods = acc.periods(verbose=True)
    print(f"\ntimetable periods detected: {len(periods)}", flush=True)
    for p in periods:
        print(
            f"  {p['first']} -> {p['last']}  {p['days']:>3} days"
            f"  (shift at start: {p['shift_share_at_start']})",
            flush=True,
        )
    # A planner acts on the current timetable, so prefer the most recent period - but a
    # short period makes a noisy percentile floor, so require a usable length and fall back
    # to the longest available.
    MIN_PERIOD_DAYS = 45
    usable = [p for p in periods if p["days"] >= MIN_PERIOD_DAYS]
    current = usable[-1] if usable else max(periods, key=lambda p: p["days"])
    print(
        f"padding period: {current['first']} -> {current['last']} ({current['days']} days)"
        + ("" if current is periods[-1] else "  [not the latest: latest is too short]"),
        flush=True,
    )
    current_days = {days[i] for i in current["day_indices"]}
    all_days = set(days)

    legs = acc.padding(current["day_indices"])
    for leg in legs:
        leg["from_name"] = names.get(leg["from"], leg["from"])
        leg["to_name"] = names.get(leg["to"], leg["to"])
    carry_current = acc.leg_carry_in(current_days)

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
            "padding": (
                "median scheduled leg run time minus 5th percentile of observed run times, "
                "computed within one timetable period"
            ),
            "line": "modal route signature (operated stop sequence), expresses absorbed as subsequences",
            "window": {"days": len(paths), "first": days[0], "last": days[-1]},
            "timetable_periods": [
                {k: v for k, v in p.items() if k != "day_indices"} for p in periods
            ],
            "padding_period": {
                "first": current["first"],
                "last": current["last"],
                "days": current["days"],
                "is_latest": current is periods[-1],
                "chosen_because": (
                    "most recent period of at least 45 days; a planner acts on the current "
                    "timetable, and a shorter period makes the percentile floor noisy"
                ),
            },
            "period_detection": {
                "rule": (
                    f"comparing each day with the same weekday a week earlier, a day on which "
                    f"the share of legs shifting scheduled run time by >={PERIOD_SHIFT_MIN} min "
                    f"exceeds the threshold opens a new period"
                ),
                "weekly_shift_baseline": round(acc.period_baseline, 4),
                "threshold": round(acc.period_threshold, 4),
                "threshold_rule": f"max({PERIOD_SHARE_FLOOR:.0%}, {PERIOD_SHARE_MULTIPLE:g} x baseline)",
                "min_period_days": MIN_PERIOD_LENGTH,
            },
        },
        "coverage": {
            "kind": "observed",
            "timetable_rows": acc.rows,
            "with_actual_time": round(acc.with_actual / acc.rows, 4),
            "with_delay_minutes": round(acc.with_diff / acc.rows, 4),
            "runs": acc.runs,
            "runs_by_category": dict(acc.by_category),
        },
        "baseline": {
            "kind": "observed",
            "per_day": {
                d: {
                    "arrivals": acc.arrivals_per_day[d],
                    "late_share": round(acc.late_per_day[d] / acc.arrivals_per_day[d], 5)
                    if acc.arrivals_per_day[d]
                    else None,
                }
                for d in days
            },
            "late_share": band(
                [
                    acc.late_per_day[d] / acc.arrivals_per_day[d]
                    for d in days
                    if acc.arrivals_per_day[d]
                ]
            ),
        },
        "survival": {
            "kind": "observed",
            "all": acc.curve("all"),
            "by_category": {cat: acc.curve(f"cat:{cat}") for cat in PASSENGER},
        },
        "seasonality": seasonality(acc),
        "padding": {"kind": "calculated", "legs": legs},
        "category_head_to_head": category_head_to_head(acc, all_days),
        "line_separation": {"kind": "observed", "pairs": separation(acc, lines, all_days)},
        "focus_line": FOCUS,
        "lines": [],
    }

    by_cat: dict[str, list[float]] = defaultdict(list)
    for leg in legs:
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
    neg = [l for l in legs if l["padding_min"] < 0]
    pack["padding"]["negative_legs"] = len(neg)
    pack["padding"]["negative_legs_beating_schedule"] = sum(
        1 for l in neg if l["beats_schedule"] > 0.5
    )
    pack["padding"]["period"] = {"first": current["first"], "last": current["last"]}

    # how much the timetable itself moved between periods
    idx = periods.index(current)
    if idx > 0:
        prev = acc.padding(periods[idx - 1]["day_indices"])
        prev_map = {(l["from"], l["to"], l["category"]): l for l in prev}
        deltas = [
            l["scheduled_min"] - prev_map[(l["from"], l["to"], l["category"])]["scheduled_min"]
            for l in legs
            if (l["from"], l["to"], l["category"]) in prev_map
        ]
        pack["padding"]["timetable_change"] = {
            "kind": "observed",
            "from_period": {"first": periods[idx - 1]["first"], "last": periods[idx - 1]["last"]},
            "legs_compared": len(deltas),
            "legs_changed_half_min": sum(1 for d in deltas if abs(d) >= 0.5),
            "median_change_min": round(st.median(deltas), 3) if deltas else None,
            "range_min": [round(min(deltas), 2), round(max(deltas), 2)] if deltas else None,
            "note": "Why padding is computed inside one period rather than pooled over the year.",
        }

    shifts_per_line = {}
    for key, line in lines.items():
        keep = lambda leg, L=line: leg[2] == L["category"] and on_line(L, leg[0], leg[1])
        line_legs = acc.padding(current["day_indices"], keep)
        for leg in line_legs:
            leg["from_name"] = names.get(leg["from"], leg["from"])
            leg["to_name"] = names.get(leg["to"], leg["to"])
        pads = [l["padding_min"] for l in line_legs]
        pack["lines"].append(
            {
                "id": key,
                "label": line["label"],
                "category": line["category"],
                "stops": [{"code": c, "name": names.get(c, c)} for c in line["stops"]],
                "runs_in_window": line["runs_in_window"],
                "survival": acc.curve(f"line:{key}"),
                "legs": line_legs,
                "padding_summary": {
                    "legs": len(line_legs),
                    "median_min": round(st.median(pads), 3) if pads else None,
                    "low_min": round(min(pads), 2) if pads else None,
                    "high_min": round(max(pads), 2) if pads else None,
                    "negative_legs": sum(1 for p in pads if p < 0),
                },
            }
        )
        s = counterfactual_shifts(line_legs, carry_current)
        if s:
            shifts_per_line[key] = s

    pack["mechanism"] = mechanism(legs, carry_current, pack["lines"])
    # Robustness: the same test inside each timetable period, each using its own padding and
    # its own delays. A relationship that only appears in one period is a property of one
    # timetable, not of margin.
    per_period = []
    for p in periods:
        p_days = {days[i] for i in p["day_indices"]}
        p_legs = acc.padding(p["day_indices"])
        p_m = mechanism(p_legs, acc.leg_carry_in(p_days), pack["lines"])
        per_period.append(
            {
                "first": p["first"],
                "last": p["last"],
                "days": p["days"],
                "legs": len(p_legs),
                "across_legs": p_m["across_legs"],
                "within_category": p_m["within_category"],
            }
        )
    pack["mechanism"]["by_timetable_period"] = per_period
    m = pack["mechanism"]
    print("  mechanism by timetable period:", flush=True)
    for r in per_period:
        print(
            f"    {r['first']} -> {r['last']}  legs={r['legs']:>3}  "
            f"all={r['across_legs'].get('spearman')}  "
            + "  ".join(f"{c[:4]}={v.get('spearman')}" for c, v in r["within_category"].items() if v),
            flush=True,
        )
    print(
        f"\nmechanism: rho={m['across_lines']['spearman']} across lines, "
        f"{m['across_legs'].get('spearman')} across legs, "
        + ", ".join(f"{c}={v.get('spearman')}" for c, v in m["within_category"].items() if v),
        flush=True,
    )

    print(f"\npass 2: counterfactual replay over {len(current_days)} days of the current timetable", flush=True)
    tallies = replay(paths, lines, shifts_per_line, current_days)
    for entry in pack["lines"]:
        t = tallies.get(entry["id"])
        if not t:
            entry["counterfactual"] = {}
            continue
        shift = shifts_per_line[entry["id"]]
        entry["counterfactual"] = {
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
            "variants": [
                {
                    "strength": s,
                    "curve": [
                        {
                            "stops_on": k,
                            "share": round(t[s][k][0] / t[s][k][1], 4) if t[s][k][1] else None,
                            "n": t[s][k][1],
                        }
                        for k in range(1, HORIZON + 1)
                    ],
                    "legs_made_tighter": sum(1 for v in shift.values() if v[s] < -0.05),
                    "legs_made_slacker": sum(1 for v in shift.values() if v[s] > 0.05),
                    "max_shift_min": round(max((abs(v[s]) for v in shift.values()), default=0), 2),
                    "journey_time_change_min": round(sum(v[s] for v in shift.values()), 3),
                }
                for s in STRENGTHS
            ],
        }
        c = entry["counterfactual"]["variants"]
        print(
            f"  {entry['id']:<18} {c[0]['curve'][0]['share']:.0%} -> {c[-1]['curve'][0]['share']:.0%}"
            f"  (journey time {c[-1]['journey_time_change_min']:+.2f} min)",
            flush=True,
        )

    pack["limitations"] = [
        "Cause attribution covers ~1% of rows: we can say a delay survived a leg, mostly not why.",
        "The technical minimum run time is a 5th-percentile proxy, not an engineering figure.",
        "Samples thin beyond about four stops.",
        "Padding describes one timetable period; the timetable is re-cut roughly annually.",
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
