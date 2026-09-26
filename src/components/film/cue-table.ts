/**
 * The cue table is the timeline a reviewer reads, so it gets checked at load.
 *
 * The check that matters is the last one: a segment where every channel the
 * canvas actually reads is unchanged is a hold, and a hold is only legitimate if
 * something else keeps living through it. Listing holds here is what lets the
 * films ask for camera creep in exactly those spans — and what stopped us
 * shipping two films whose canvas was frozen through their closing beats.
 */

import { clamp01, smoothstep } from "@/components/film/craft";

export type Cue = {
  at: number;
  beat: number;
};

export type Hold = {
  from: number;
  to: number;
  /** Beat the hold opens on. */
  beat: number;
};

export type CueTableOptions<T extends Cue> = {
  /**
   * Channels the canvas reads. A hold is a span where all of these are equal.
   *
   * One surface per call. Handing in the union of two canvases' channels reports
   * no hold whenever *either* moves, which hides a frozen surface behind a moving
   * one — the same mistake as counting a DOM-only channel as motion.
   */
  rendered: ReadonlyArray<Exclude<keyof T & string, "at" | "beat">>;
  /** Channels allowed to be NaN because the renderer resolves them per frame. */
  tracked?: ReadonlyArray<keyof T & string>;
};

/** Smallest hold worth creeping through, as a share of the film. */
const HOLD_FLOOR = 0.03;
/** Share of a hold spent easing creep in and out. */
const HOLD_EDGE = 0.3;

function sameChannel(a: number, b: number): boolean {
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  return Math.abs(a - b) < 1e-9;
}

export function cueTableProblems<T extends Cue>(
  poses: readonly T[],
  options: CueTableOptions<T>,
): string[] {
  const problems: string[] = [];
  const tracked = new Set<string>(options.tracked ?? []);

  if (poses.length < 2) {
    problems.push("needs at least two poses");
    return problems;
  }
  if (poses[0].at !== 0) problems.push(`first pose is at ${poses[0].at}, not 0`);
  if (poses[0].beat !== 0) problems.push(`first beat is ${poses[0].beat}, not 0`);

  for (let i = 0; i < poses.length; i++) {
    const pose = poses[i];
    if (pose.at < 0 || pose.at > 1) problems.push(`pose ${i} is at ${pose.at}, outside 0–1`);
    if (i > 0 && pose.at <= poses[i - 1].at) {
      problems.push(`pose ${i} at ${pose.at} does not advance past ${poses[i - 1].at}`);
    }
    if (i > 0) {
      const step = pose.beat - poses[i - 1].beat;
      if (step < 0) problems.push(`beat goes backwards at pose ${i}`);
      if (step > 1) problems.push(`beat skips from ${poses[i - 1].beat} to ${pose.beat}`);
    }
    for (const key of options.rendered) {
      const value = pose[key] as unknown;
      if (typeof value !== "number") {
        problems.push(`pose ${i} channel ${key} is not a number`);
      } else if (Number.isNaN(value) && !tracked.has(key)) {
        problems.push(`pose ${i} channel ${key} is NaN but not tracked`);
      }
    }
  }

  return problems;
}

/** Spans where no rendered channel changes. Adjacent spans merge into one. */
export function cueTableHolds<T extends Cue>(
  poses: readonly T[],
  options: CueTableOptions<T>,
): Hold[] {
  const holds: Hold[] = [];
  const open = (from: number, to: number, beat: number) => {
    const last = holds[holds.length - 1];
    if (last && Math.abs(last.to - from) < 1e-9) last.to = to;
    else holds.push({ from, to, beat });
  };

  for (let i = 0; i < poses.length - 1; i++) {
    const a = poses[i];
    const b = poses[i + 1];
    const still = options.rendered.every((key) =>
      sameChannel(a[key] as number, b[key] as number),
    );
    if (still) open(a.at, b.at, a.beat);
  }

  const tail = poses[poses.length - 1];
  if (tail.at < 1) open(tail.at, 1, tail.beat);

  return holds.filter((hold) => hold.to - hold.from >= HOLD_FLOOR);
}

/**
 * Checks the table and returns its holds. Throws outside production, where a
 * bad table is a bug our tests should have caught; in production it reports and
 * carries on rather than taking the page down over a timeline.
 */
export function checkCueTable<T extends Cue>(
  name: string,
  poses: readonly T[],
  options: CueTableOptions<T>,
): Hold[] {
  const problems = cueTableProblems(poses, options);
  if (problems.length > 0) {
    const message = `${name} cue table: ${problems.join("; ")}`;
    if (process.env.NODE_ENV === "production") console.error(message);
    else throw new Error(message);
  }
  return cueTableHolds(poses, options);
}

/**
 * How held the film is at `progress`. Eased at the edges so creep arrives and
 * leaves without a step.
 */
export function holdAt(holds: readonly Hold[], progress: number): number {
  const p = clamp01(progress);
  for (const hold of holds) {
    const span = hold.to - hold.from;
    if (span <= 0 || p < hold.from || p > hold.to) continue;
    const u = (p - hold.from) / span;
    return smoothstep(u / HOLD_EDGE) * smoothstep((1 - u) / HOLD_EDGE);
  }
  return 0;
}
