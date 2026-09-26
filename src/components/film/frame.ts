import { type FieldPoint } from "@/lib/sim/book-field";
import { clamp01, lerp, smoothstep } from "@/components/film/craft";
import { checkCueTable, holdAt } from "@/components/film/cue-table";

export type FilmFrame = {
  beat: number;
  featuredShock: number;
  bookShock: number;
  /** 0–1 visibility of loans other than the featured name */
  population: number;
  /** 0–1 dimming of loans outside the floating ∩ thin sleeve */
  sleeve: number;
  line: number;
  cut: number;
  /** View width in residual-income-share units */
  spanX: number;
  cx: number;
  /** 0 = full balance axis, 1 = locked on the featured loan */
  focusY: number;
  /** 0–1 how far into a span where no drawn channel moves */
  hold: number;
};

type Pose = {
  at: number;
  beat: number;
  featuredShock: number;
  bookShock: number;
  population: number;
  sleeve: number;
  line: number;
  cut: number;
  spanX: number;
  /** NaN = track the featured loan's current share */
  cx: number;
  focusY: number;
};

const POSES: Pose[] = [
  {
    at: 0,
    beat: 0,
    featuredShock: 0,
    bookShock: 0,
    population: 0.62,
    sleeve: 0,
    line: 0,
    cut: 0,
    spanX: 0.78,
    cx: 0.16,
    focusY: 0,
  },
  {
    at: 0.1,
    beat: 1,
    featuredShock: 0,
    bookShock: 0,
    population: 0,
    sleeve: 0,
    line: 0.45,
    cut: 0,
    spanX: 0.22,
    cx: Number.NaN,
    focusY: 1,
  },
  {
    at: 0.18,
    beat: 1,
    featuredShock: 0,
    bookShock: 0,
    population: 0,
    sleeve: 0,
    line: 0.55,
    cut: 0,
    spanX: 0.22,
    cx: Number.NaN,
    focusY: 1,
  },
  {
    at: 0.34,
    beat: 2,
    featuredShock: 1,
    bookShock: 0,
    population: 0,
    sleeve: 0,
    line: 1,
    cut: 0,
    spanX: 0.2,
    cx: Number.NaN,
    focusY: 1,
  },
  {
    at: 0.42,
    beat: 2,
    featuredShock: 1,
    bookShock: 0,
    population: 0,
    sleeve: 0,
    line: 1,
    cut: 0,
    spanX: 0.2,
    cx: Number.NaN,
    focusY: 1,
  },
  {
    at: 0.56,
    beat: 3,
    featuredShock: 1,
    bookShock: 0,
    population: 1,
    sleeve: 0,
    line: 1,
    cut: 0,
    spanX: 0.74,
    cx: 0.14,
    focusY: 0,
  },
  {
    at: 0.64,
    beat: 4,
    featuredShock: 1,
    bookShock: 0,
    population: 1,
    sleeve: 0,
    line: 1,
    cut: 0,
    spanX: 0.74,
    cx: 0.14,
    focusY: 0,
  },
  {
    at: 0.76,
    beat: 4,
    featuredShock: 1,
    bookShock: 1,
    population: 1,
    sleeve: 0,
    line: 1,
    cut: 0,
    spanX: 0.72,
    cx: 0.1,
    focusY: 0,
  },
  {
    at: 0.84,
    beat: 5,
    featuredShock: 1,
    bookShock: 1,
    population: 1,
    sleeve: 1,
    line: 1,
    cut: 0,
    spanX: 0.68,
    cx: 0.06,
    focusY: 0,
  },
  {
    at: 0.92,
    beat: 6,
    featuredShock: 1,
    bookShock: 1,
    population: 1,
    sleeve: 1,
    line: 1,
    cut: 1,
    spanX: 0.68,
    cx: 0.06,
    focusY: 0,
  },
];

/** `cut` drives DOM chrome only, so it cannot rescue a still canvas. */
export const RATE_HOLDS = checkCueTable("when-rates-rise", POSES, {
  rendered: [
    "featuredShock",
    "bookShock",
    "population",
    "sleeve",
    "line",
    "spanX",
    "cx",
    "focusY",
  ],
  tracked: ["cx"],
});

function featuredShare(point: Pick<FieldPoint, "shareBefore" | "shareAfter">, shock: number) {
  return point.shareBefore + (point.shareAfter - point.shareBefore) * shock;
}

function resolveCx(
  pose: Pose,
  point: Pick<FieldPoint, "shareBefore" | "shareAfter">,
): number {
  return Number.isNaN(pose.cx) ? featuredShare(point, pose.featuredShock) : pose.cx;
}

function poseIndex(progress: number): number {
  const p = clamp01(progress);
  let index = 0;
  for (let i = 0; i < POSES.length; i++) {
    if (p >= POSES[i].at) index = i;
  }
  return index;
}

export function beatAt(progress: number): number {
  return POSES[poseIndex(progress)].beat;
}

export function frameAt(
  progress: number,
  featured: Pick<FieldPoint, "shareBefore" | "shareAfter">,
  reduced = false,
): FilmFrame {
  const p = clamp01(progress);

  if (reduced) {
    const pose = POSES[poseIndex(p)];
    return {
      beat: pose.beat,
      featuredShock: pose.featuredShock,
      bookShock: pose.bookShock,
      population: pose.population,
      sleeve: pose.sleeve,
      line: pose.line,
      cut: pose.cut,
      spanX: pose.spanX,
      cx: resolveCx(pose, featured),
      focusY: pose.focusY,
      hold: 0,
    };
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
    beat: beatAt(p),
    featuredShock: lerp(a.featuredShock, b.featuredShock, t),
    bookShock: lerp(a.bookShock, b.bookShock, t),
    population: lerp(a.population, b.population, t),
    sleeve: lerp(a.sleeve, b.sleeve, t),
    line: lerp(a.line, b.line, t),
    cut: lerp(a.cut, b.cut, t),
    spanX: lerp(a.spanX, b.spanX, t),
    cx: lerp(resolveCx(a, featured), resolveCx(b, featured), t),
    focusY: lerp(a.focusY, b.focusY, t),
    hold: holdAt(RATE_HOLDS, p),
  };
}
