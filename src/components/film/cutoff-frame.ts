import { clamp01, lerp, smoothstep } from "@/components/film/craft";
import { checkCueTable, holdAt } from "@/components/film/cue-table";
import { beatStarts } from "@/components/film/subtitles";

export type CutoffFrame = {
  beat: number;
  /** 0–1 visibility of apps other than featured */
  population: number;
  /** 0 = full PD axis, 1 = lock on featured */
  focusY: number;
  /** View width in PD units */
  spanX: number;
  /** Camera center on PD axis */
  cx: number;
  /** Gate line opacity */
  gate: number;
  /** PD threshold drawn / used for filter */
  gatePd: number;
  /** 0–1 dim rejected side */
  filter: number;
  /** 0–1 frontier chart overlay */
  frontier: number;
  /** 0–1 decision chrome */
  cut: number;
  /** 0–1 how far into a span where no drawn channel moves */
  hold: number;
};

type Pose = {
  at: number;
  beat: number;
  population: number;
  focusY: number;
  spanX: number;
  cx: number;
  gate: number;
  gatePd: number;
  filter: number;
  frontier: number;
  cut: number;
};

const OPERATING = 0.075;

/** Beats 0–7 match docs/decision-specs/home-credit-cutoff.md */
const POSES: Pose[] = [
  {
    at: 0,
    beat: 0,
    population: 0.55,
    focusY: 0,
    spanX: 0.42,
    cx: 0.12,
    gate: 0.25,
    gatePd: 0.22,
    filter: 0,
    frontier: 0,
    cut: 0,
  },
  {
    at: 0.08,
    beat: 1,
    population: 0,
    focusY: 1,
    spanX: 0.12,
    cx: OPERATING,
    gate: 0.4,
    gatePd: OPERATING,
    filter: 0,
    frontier: 0,
    cut: 0,
  },
  {
    at: 0.16,
    beat: 2,
    population: 0,
    focusY: 1,
    spanX: 0.12,
    cx: OPERATING,
    gate: 0.55,
    gatePd: OPERATING,
    filter: 0,
    frontier: 0,
    cut: 0,
  },
  {
    at: 0.28,
    beat: 3,
    population: 1,
    focusY: 0,
    spanX: 0.4,
    cx: 0.11,
    gate: 0.35,
    gatePd: 0.18,
    filter: 0,
    frontier: 0,
    cut: 0,
  },
  {
    at: 0.42,
    beat: 4,
    population: 1,
    focusY: 0,
    spanX: 0.38,
    cx: 0.1,
    gate: 0.5,
    gatePd: 0.12,
    filter: 0.15,
    frontier: 1,
    cut: 0,
  },
  {
    at: 0.56,
    beat: 5,
    population: 1,
    focusY: 0,
    spanX: 0.36,
    cx: 0.09,
    gate: 1,
    gatePd: OPERATING,
    filter: 1,
    frontier: 0.35,
    cut: 0,
  },
  {
    at: 0.7,
    beat: 5,
    population: 1,
    focusY: 0,
    spanX: 0.36,
    cx: 0.09,
    gate: 1,
    gatePd: OPERATING,
    filter: 1,
    frontier: 0.25,
    cut: 0,
  },
  {
    at: 0.82,
    beat: 6,
    population: 1,
    focusY: 0,
    spanX: 0.36,
    cx: 0.09,
    gate: 1,
    gatePd: OPERATING,
    filter: 1,
    frontier: 0.2,
    cut: 0.4,
  },
  {
    at: 0.92,
    beat: 7,
    population: 1,
    focusY: 0,
    spanX: 0.36,
    cx: 0.09,
    gate: 1,
    gatePd: OPERATING,
    filter: 1,
    frontier: 0.15,
    cut: 1,
  },
];

export const CUTOFF_BEAT_STARTS: readonly number[] = beatStarts(POSES);

/** `frontier` and `cut` drive the chart and the DOM, never the canvas. */
export const CUTOFF_HOLDS = checkCueTable("where-should-the-cutoff-sit", POSES, {
  rendered: ["population", "focusY", "spanX", "cx", "gate", "gatePd", "filter"],
});

function poseIndex(progress: number): number {
  const p = clamp01(progress);
  let index = 0;
  for (let i = 0; i < POSES.length; i++) {
    if (p >= POSES[i].at) index = i;
  }
  return index;
}

export function cutoffBeatAt(progress: number): number {
  return POSES[poseIndex(progress)].beat;
}

export function cutoffFrameAt(progress: number, reduced = false): CutoffFrame {
  const p = clamp01(progress);

  if (reduced) {
    const pose = POSES[poseIndex(p)];
    return { ...pose, hold: 0 };
  }

  let i = 0;
  for (let k = 0; k < POSES.length - 1; k++) {
    if (p >= POSES[k].at) i = k;
  }
  const a = POSES[i];
  const b = POSES[Math.min(i + 1, POSES.length - 1)];
  const span = b.at - a.at;
  const t = span <= 0 || a === b ? 0 : smoothstep((p - a.at) / span);

  return {
    beat: cutoffBeatAt(p),
    population: lerp(a.population, b.population, t),
    focusY: lerp(a.focusY, b.focusY, t),
    spanX: lerp(a.spanX, b.spanX, t),
    cx: lerp(a.cx, b.cx, t),
    gate: lerp(a.gate, b.gate, t),
    gatePd: lerp(a.gatePd, b.gatePd, t),
    filter: lerp(a.filter, b.filter, t),
    frontier: lerp(a.frontier, b.frontier, t),
    cut: lerp(a.cut, b.cut, t),
    hold: holdAt(CUTOFF_HOLDS, p),
  };
}
