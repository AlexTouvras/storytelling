import { clamp01, lerp, smoothstep } from "@/components/film/craft";
import { checkCueTable, holdAt } from "@/components/film/cue-table";

/**
 * Visual states for *Why don't delays die?* — ten acts plus the open.
 *
 * Beats match the act briefs in `docs/decision-specs/rail-recovery-time.md`:
 *
 *   0  Open                 the whole network, dim and unlabelled
 *   1  Settle on a line     the film's one long camera move
 *   2  One train            a single run, marks made in stop order
 *   3  It carries           the delay is handed to the next stop
 *   4  Every late train     the survival curve emerges from the same marks
 *   5  Two services         one population divides in two
 *   6  A year of it         seasonality; the shortest beat, canvas held
 *   7  Where the slack is   margin per leg, then the legs with none
 *   8  Your line            the reader's line replaces the focus line
 *   9  Move the budget      the counterfactual scrub
 *  10  What it costs        the decision, canvas held
 *
 * The field is never redrawn between beats. A mark is one train at one stop,
 * placed by position in the run against minutes late, and every beat is that
 * same field under a different camera, filter or overlay.
 */
export type RecoveryFrame = {
  beat: number;
  /** 0–1 share of the field written on, in arrival order. */
  population: number;
  /** 0–1 how hard everything outside the selected line is pushed down. */
  lineFocus: number;
  /** 0–1 how hard everything outside the one illustrative run is pushed down. */
  run: number;
  /** 0–1 the hand-off along the run; drives the lead/lag wave. */
  carry: number;
  /** 0–1 the survival curve drawn out of the marks. */
  curve: number;
  /** 0–1 separation of commuter from long-distance. */
  split: number;
  /** 0–1 the margin profile along the stop axis. */
  margin: number;
  /** Counterfactual strength. Figures snap to a frozen variant; marks do not. */
  budget: number;
  /** Visible share of the stop axis. Below 1 is a push in. */
  spanX: number;
  /** Camera centre on the stop axis. */
  cx: number;
  /** 0 = the whole delay axis, 1 = locked on the featured run. */
  focusY: number;
  /** 0–1 the twelve-month panel. Chart, not canvas. */
  season: number;
  /** 0–1 the line picker. DOM, not canvas. */
  picker: number;
  /** 0–1 the decision chrome. DOM, not canvas. */
  decide: number;
  /** 0–1 how far into a span where no drawn channel moves. */
  hold: number;
};

type Pose = Omit<RecoveryFrame, "hold"> & { at: number };

/**
 * Strengths the evidence pack froze. The scrub moves continuously between them
 * so the field keeps living, but a printed figure snaps — see
 * `recoveryVariantIndex`.
 */
export const BUDGET_STRENGTHS = [0, 0.25, 0.5, 0.75, 1] as const;

/**
 * Act I is the only long camera move in the film, and the brief asks for travel
 * that increases and then stops rather than easing out early. Three poses do
 * that: each covers more ground than the last, and the final one arrives and
 * plants. Two poses would have eased out halfway through the move.
 *
 * Act IX is spaced the other way round. Most of the counterfactual's effect
 * lands by quarter strength, so quarter strength arrives early in the beat and
 * the remaining three variants are given the rest — otherwise the first third of
 * the drag would do nearly all the visible work and the rest would feel inert.
 */
const POSES: Pose[] = [
  {
    at: 0,
    beat: 0,
    population: 0.45,
    lineFocus: 0,
    run: 0,
    carry: 0,
    curve: 0,
    split: 0,
    margin: 0,
    budget: 0,
    spanX: 1,
    cx: 0.5,
    focusY: 0,
    season: 0,
    picker: 0,
    decide: 0,
  },
  {
    at: 0.055,
    beat: 1,
    population: 1,
    lineFocus: 0.1,
    run: 0,
    carry: 0,
    curve: 0,
    split: 0,
    margin: 0,
    budget: 0,
    spanX: 0.96,
    cx: 0.5,
    focusY: 0.06,
    season: 0,
    picker: 0,
    decide: 0,
  },
  {
    at: 0.105,
    beat: 1,
    population: 1,
    lineFocus: 0.35,
    run: 0,
    carry: 0,
    curve: 0,
    split: 0,
    margin: 0,
    budget: 0,
    spanX: 0.88,
    cx: 0.5,
    focusY: 0.2,
    season: 0,
    picker: 0,
    decide: 0,
  },
  {
    at: 0.15,
    beat: 1,
    population: 1,
    lineFocus: 0.62,
    run: 0,
    carry: 0,
    curve: 0,
    split: 0,
    margin: 0,
    budget: 0,
    spanX: 0.78,
    cx: 0.5,
    focusY: 0.34,
    season: 0,
    picker: 0,
    decide: 0,
  },
  {
    at: 0.215,
    beat: 2,
    population: 1,
    lineFocus: 1,
    run: 0,
    carry: 0,
    curve: 0,
    split: 0,
    margin: 0,
    budget: 0,
    spanX: 0.62,
    cx: 0.5,
    focusY: 0.55,
    season: 0,
    picker: 0,
    decide: 0,
  },
  {
    at: 0.29,
    beat: 3,
    population: 1,
    lineFocus: 1,
    run: 1,
    carry: 0,
    curve: 0,
    split: 0,
    margin: 0,
    budget: 0,
    spanX: 0.56,
    cx: 0.4,
    focusY: 0.8,
    season: 0,
    picker: 0,
    decide: 0,
  },
  {
    at: 0.365,
    beat: 4,
    population: 1,
    lineFocus: 1,
    run: 1,
    carry: 1,
    curve: 0,
    split: 0,
    margin: 0,
    budget: 0,
    spanX: 0.56,
    cx: 0.64,
    focusY: 0.78,
    season: 0,
    picker: 0,
    decide: 0,
  },
  {
    at: 0.455,
    beat: 5,
    population: 1,
    lineFocus: 1,
    run: 0,
    carry: 1,
    curve: 1,
    split: 0,
    margin: 0,
    budget: 0,
    spanX: 0.68,
    cx: 0.5,
    focusY: 0.44,
    season: 0,
    picker: 0,
    decide: 0,
  },
  {
    at: 0.52,
    beat: 6,
    population: 1,
    lineFocus: 1,
    run: 0,
    carry: 1,
    curve: 1,
    split: 1,
    margin: 0,
    budget: 0,
    spanX: 0.72,
    cx: 0.5,
    focusY: 0.4,
    season: 0,
    picker: 0,
    decide: 0,
  },
  // Act VI moves nothing on the canvas — the panel is the whole beat. The cue
  // table reports the hold and the film creeps the camera through it.
  {
    at: 0.55,
    beat: 6,
    population: 1,
    lineFocus: 1,
    run: 0,
    carry: 1,
    curve: 1,
    split: 1,
    margin: 0,
    budget: 0,
    spanX: 0.72,
    cx: 0.5,
    focusY: 0.4,
    season: 1,
    picker: 0,
    decide: 0,
  },
  {
    at: 0.58,
    beat: 7,
    population: 1,
    lineFocus: 1,
    run: 0,
    carry: 1,
    curve: 1,
    split: 1,
    margin: 0,
    budget: 0,
    spanX: 0.72,
    cx: 0.5,
    focusY: 0.4,
    season: 1,
    picker: 0,
    decide: 0,
  },
  {
    at: 0.64,
    beat: 7,
    population: 1,
    lineFocus: 1,
    run: 0,
    carry: 1,
    curve: 1,
    split: 1,
    margin: 0.55,
    budget: 0,
    spanX: 0.66,
    cx: 0.5,
    focusY: 0.4,
    season: 0.55,
    picker: 0,
    decide: 0,
  },
  {
    at: 0.7,
    beat: 8,
    population: 1,
    lineFocus: 1,
    run: 0,
    carry: 1,
    curve: 1,
    split: 1,
    margin: 1,
    budget: 0,
    spanX: 0.46,
    cx: 0.74,
    focusY: 0.38,
    season: 0.1,
    // The picker is the whole of Act VIII, so it has to be up when the beat
    // starts rather than arriving over it.
    picker: 1,
    decide: 0,
  },
  {
    at: 0.775,
    beat: 9,
    population: 1,
    lineFocus: 1,
    run: 0,
    carry: 1,
    curve: 1,
    split: 1,
    margin: 1,
    budget: 0,
    spanX: 0.66,
    cx: 0.5,
    focusY: 0.4,
    season: 0,
    picker: 1,
    decide: 0,
  },
  {
    at: 0.81,
    beat: 9,
    population: 1,
    lineFocus: 1,
    run: 0,
    carry: 1,
    curve: 1,
    split: 1,
    margin: 1,
    budget: 0.25,
    spanX: 0.66,
    cx: 0.5,
    focusY: 0.4,
    season: 0,
    picker: 1,
    decide: 0,
  },
  {
    at: 0.845,
    beat: 9,
    population: 1,
    lineFocus: 1,
    run: 0,
    carry: 1,
    curve: 1,
    split: 1,
    margin: 1,
    budget: 0.5,
    spanX: 0.66,
    cx: 0.5,
    focusY: 0.4,
    season: 0,
    picker: 1,
    decide: 0,
  },
  {
    at: 0.875,
    beat: 9,
    population: 1,
    lineFocus: 1,
    run: 0,
    carry: 1,
    curve: 1,
    split: 1,
    margin: 1,
    budget: 0.75,
    spanX: 0.66,
    cx: 0.5,
    focusY: 0.4,
    season: 0,
    picker: 1,
    decide: 0,
  },
  {
    at: 0.9,
    beat: 10,
    population: 1,
    lineFocus: 1,
    run: 0,
    carry: 1,
    curve: 1,
    split: 1,
    margin: 1,
    budget: 1,
    spanX: 0.66,
    cx: 0.5,
    focusY: 0.4,
    season: 0,
    picker: 1,
    decide: 0,
  },
  // The decision card rises over a held field, which is the second declared
  // hold in the film.
  {
    at: 0.95,
    beat: 10,
    population: 1,
    lineFocus: 1,
    run: 0,
    carry: 1,
    curve: 1,
    split: 1,
    margin: 1,
    budget: 1,
    spanX: 0.66,
    cx: 0.5,
    focusY: 0.4,
    season: 0,
    picker: 1,
    decide: 1,
  },
];

/**
 * `season`, `picker` and `decide` drive the chart and the DOM, never the canvas,
 * so they are not listed: a beat that only moves them is a genuine hold and the
 * film needs to be told so.
 */
export const RECOVERY_HOLDS = checkCueTable("why-dont-delays-die", POSES, {
  rendered: [
    "population",
    "lineFocus",
    "run",
    "carry",
    "curve",
    "split",
    "margin",
    "budget",
    "spanX",
    "cx",
    "focusY",
  ],
});

function poseIndex(progress: number): number {
  const p = clamp01(progress);
  let index = 0;
  for (let i = 0; i < POSES.length; i++) {
    if (p >= POSES[i].at) index = i;
  }
  return index;
}

export function recoveryBeatAt(progress: number): number {
  return POSES[poseIndex(progress)].beat;
}

/**
 * Nearest frozen counterfactual variant. The marks may sit between two
 * strengths mid-scrub; a number on screen may not, because the pack only froze
 * five of them.
 */
export function recoveryVariantIndex(budget: number): number {
  const b = clamp01(budget);
  let best = 0;
  for (let i = 1; i < BUDGET_STRENGTHS.length; i++) {
    if (Math.abs(BUDGET_STRENGTHS[i] - b) < Math.abs(BUDGET_STRENGTHS[best] - b)) {
      best = i;
    }
  }
  return best;
}

export function recoveryFrameAt(progress: number, reduced = false): RecoveryFrame {
  const p = clamp01(progress);

  let i = 0;
  for (let k = 0; k < POSES.length - 1; k++) {
    if (p >= POSES[k].at) i = k;
  }
  const a = POSES[i];
  // Reduced motion snaps to the pose the film is standing on, so every channel
  // lands on an authored value and the craft layer collapses to a still picture.
  const b = reduced ? a : POSES[Math.min(i + 1, POSES.length - 1)];
  const span = b.at - a.at;
  const t = span <= 0 || a === b ? 0 : smoothstep((p - a.at) / span);

  return {
    beat: recoveryBeatAt(p),
    population: lerp(a.population, b.population, t),
    lineFocus: lerp(a.lineFocus, b.lineFocus, t),
    run: lerp(a.run, b.run, t),
    carry: lerp(a.carry, b.carry, t),
    curve: lerp(a.curve, b.curve, t),
    split: lerp(a.split, b.split, t),
    margin: lerp(a.margin, b.margin, t),
    budget: lerp(a.budget, b.budget, t),
    spanX: lerp(a.spanX, b.spanX, t),
    cx: lerp(a.cx, b.cx, t),
    focusY: lerp(a.focusY, b.focusY, t),
    season: lerp(a.season, b.season, t),
    picker: lerp(a.picker, b.picker, t),
    decide: lerp(a.decide, b.decide, t),
    hold: reduced ? 0 : holdAt(RECOVERY_HOLDS, p),
  };
}
