/**
 * One minute of lane 2, replayed.
 *
 * The downstream-most car follows its observed path. Every car behind brakes
 * from the gap and the speed of the car ahead, one second late. The one
 * variant does not allow a follower to brake harder than the car ahead.
 *
 * It is drawn only when the slow cell still walks upstream at about the
 * measured 9 mph and the far end stays in the forties. A replay that stops
 * the cars is not that pocket, and is not drawn.
 */

import pack from "../../../data/figures/where-should-the-speed-be-held.v1.json";

const FT_S_TO_MPH = 3600 / 5280;

/** Frozen with the check. A re-tune is a new pack, not a quiet edit. */
export const JAM_MODEL = {
  alpha: 0.8,
  beta: 0.02,
  /** Seconds a follower waits before answering the car ahead. */
  lagS: 1,
  /** Standstill spacing, feet. */
  s0Ft: 25,
  /** Seconds of speed kept as a following gap. */
  timeGapS: 1.5,
  /** Left out of the gap, feet. A car is not a point. */
  lengthFt: 15,
  stepS: 0.25,
  fromS: 240,
  toS: 300,
  cellFt: 100,
  /** Downstream cells start here. */
  downstreamFt: 1800,
} as const;

export type JamSample = {
  t: number;
  /** Upstream edge of the slowest 100-ft cell. */
  yFt: number;
  slowMph: number;
  downstreamMph: number | null;
};

export type JamRun = {
  /** Against the traffic, from the first sample to the last. */
  walkMph: number;
  samples: JamSample[];
  /** The slow cell walks back, stays moving, and leaves the far end fast. */
  passes: boolean;
};

type Sample = { y: number; v: number };
type Vehicle = { id: number; t0: number; t1: number; byT: Map<number, Sample> };
type State = { y: number; v: number; a: number };
type Hist = { t: number; y: number; v: number; a: number };

function roundHalfEven(x: number): number {
  const f = Math.floor(x);
  const frac = x - f;
  if (Math.abs(frac - 0.5) < 1e-8) return f % 2 === 0 ? f : f + 1;
  return Math.round(x);
}

function vehicles(): Vehicle[] {
  return pack.trajectories.vehicles.map((v) => {
    const byT = new Map<number, Sample>();
    for (const s of v.samples) byT.set(s.t, { y: s.y, v: s.v });
    return { id: v.id, t0: v.samples[0].t, t1: v.samples[v.samples.length - 1].t, byT };
  });
}

function observed(v: Vehicle, t: number): Sample | null {
  const exact = v.byT.get(t);
  if (exact) return exact;
  let best: Sample | null = null;
  let bestDt = 3;
  for (const [k, s] of v.byT) {
    const dt = Math.abs(k - t);
    if (dt < bestDt) {
      bestDt = dt;
      best = s;
    }
  }
  return bestDt <= 2 ? best : null;
}

function field(hist: Map<number, Hist[]>, tq: number): JamSample | null {
  const cells = new Map<number, number[]>();
  for (const h of hist.values()) {
    let row = h[0];
    let best = Math.abs(row.t - tq);
    for (const r of h) {
      const d = Math.abs(r.t - tq);
      if (d < best) {
        best = d;
        row = r;
      }
    }
    if (best > 0.6 || row.y < 0 || row.y > 2300) continue;
    const bin = Math.floor(row.y / JAM_MODEL.cellFt);
    const list = cells.get(bin);
    const mph = row.v * FT_S_TO_MPH;
    if (list) list.push(mph);
    else cells.set(bin, [mph]);
  }
  if (cells.size === 0) return null;
  let slowBin = 0;
  let slowMph = Infinity;
  const down: number[] = [];
  for (const [bin, vs] of cells) {
    const mean = vs.reduce((s, x) => s + x, 0) / vs.length;
    if (mean < slowMph) {
      slowMph = mean;
      slowBin = bin;
    }
    if (bin * JAM_MODEL.cellFt >= JAM_MODEL.downstreamFt) down.push(mean);
  }
  return {
    t: tq,
    yFt: slowBin * JAM_MODEL.cellFt,
    slowMph,
    downstreamMph: down.length ? down.reduce((s, x) => s + x, 0) / down.length : null,
  };
}

function passes(samples: JamSample[]): boolean {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last || last.downstreamMph === null) return false;
  const walk = ((first.yFt - last.yFt) / (last.t - first.t)) * FT_S_TO_MPH;
  const upstream = samples.every((s, i) => i === 0 || s.yFt <= samples[i - 1].yFt + JAM_MODEL.cellFt);
  return walk >= 7 && walk <= 11 && last.slowMph >= 5 && last.downstreamMph >= 40 && last.yFt <= first.yFt - 400 && upstream;
}

/** `cap` is the one variant: a follower's braking cannot exceed the car ahead. */
export function replayMinute(cap: boolean): JamRun {
  const fleet = vehicles();
  const st = new Map<number, State>();
  const hist = new Map<number, Hist[]>();
  const { stepS: dt, lagS: tau, alpha, beta, s0Ft: s0, timeGapS: T, lengthFt } = JAM_MODEL;

  for (let t = JAM_MODEL.fromS; t <= JAM_MODEL.toS + 0.01; t += dt) {
    const ti = roundHalfEven(t);
    const present: Vehicle[] = [];
    for (const v of fleet) {
      if (t + 1e-6 < v.t0 || t > v.t1 + 0.5) continue;
      if (!st.has(v.id)) {
        const o = observed(v, v.t0);
        if (!o) continue;
        st.set(v.id, { y: o.y, v: Math.max(0, o.v), a: 0 });
      }
      present.push(v);
    }
    present.sort((a, b) => st.get(a.id)!.y - st.get(b.id)!.y);
    if (present.length < 2) continue;
    const lead = present[present.length - 1];
    const leadState = st.get(lead.id)!;
    const seen = observed(lead, ti);
    if (seen) {
      const prev = leadState.v;
      leadState.y = seen.y;
      leadState.v = Math.max(0, seen.v);
      leadState.a = (leadState.v - prev) / dt;
    }
    const past = (id: number, fallback: State): State => {
      const h = hist.get(id);
      if (!h || h.length === 0) return fallback;
      const target = t - tau;
      let row = h[0];
      let best = Math.abs(row.t - target);
      for (const r of h) {
        const d = Math.abs(r.t - target);
        if (d < best) {
          best = d;
          row = r;
        }
      }
      if (row.t > t - dt) return fallback;
      return row;
    };
    for (let i = 0; i < present.length - 1; i++) {
      const me = st.get(present[i].id)!;
      const aheadId = present[i + 1].id;
      const ls = past(aheadId, st.get(aheadId)!);
      const ms = past(present[i].id, me);
      const gap = ls.y - ms.y - lengthFt;
      const desired = s0 + T * ms.v;
      let acc = alpha * (ls.v - ms.v) + beta * (gap - desired);
      acc = Math.max(-10, Math.min(6, acc));
      if (cap) acc = Math.max(acc, ls.a);
      me.a = acc;
    }
    for (const v of present) {
      const me = st.get(v.id)!;
      if (v.id !== lead.id) {
        me.v = Math.max(0, me.v + me.a * dt);
        me.y += me.v * dt;
      }
      const list = hist.get(v.id);
      const row = { t: Math.round(t * 100) / 100, y: me.y, v: me.v, a: me.a };
      if (list) list.push(row);
      else hist.set(v.id, [row]);
    }
  }

  const samples = [240, 260, 280, 300]
    .map((tq) => field(hist, tq))
    .filter((s): s is JamSample => s !== null);
  const first = samples[0];
  const last = samples[samples.length - 1];
  const walkMph =
    first && last && last.t > first.t ? ((first.yFt - last.yFt) / (last.t - first.t)) * FT_S_TO_MPH : 0;
  return { walkMph, samples, passes: passes(samples) };
}

let cached: { base: JamRun; variant: JamRun } | null = null;

/** Base replay, and the one variant. Memoised: the trajectories do not change. */
export function jamModel(): { base: JamRun; variant: JamRun } {
  if (!cached) cached = { base: replayMinute(false), variant: replayMinute(true) };
  return cached;
}

/** The film draws the variant only when the base replay passes. */
export function jamModelDrawn(): boolean {
  return jamModel().base.passes;
}
