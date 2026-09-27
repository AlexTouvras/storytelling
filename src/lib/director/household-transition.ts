/**
 * Gate 2 scene: one loan leaves the data, becomes the household it stands for,
 * shows the mechanism, and returns to the data as the same mark.
 *
 *   wide book → FOCUS loan 724 → MORPH into the household → TRIGGER the shock
 *   → RECONNECT to the dot → the dot crosses the line → PULLBACK → the book follows
 *
 * The timeline is a cue table like the films', checked at load. Channels are
 * continuous and scrub; the shock is a trigger cue, because the illustration
 * runs it on its own clock.
 */

import { checkCueTable, holdAt, type TriggerCue } from "@/components/film/cue-table";
import { clamp01, lerp, smoothstep } from "@/components/film/craft";
import type { FilmFrame } from "@/components/film/frame";
import type { Point, Size } from "@/lib/director/camera";

export type TransitionPose = {
  at: number;
  beat: number;
  /** 0 = wide shot of the book, 1 = camera on the loan. */
  focus: number;
  /** 0 = the loan is a dot, 1 = the household is fully open. */
  open: number;
  /** Labels on the household. */
  annotate: number;
  /** The featured loan's coupon shock, in the data layer. */
  featuredShock: number;
  /** Every other floating loan's shock. */
  bookShock: number;
};

const POSES: TransitionPose[] = [
  { at: 0, beat: 0, focus: 0, open: 0, annotate: 0, featuredShock: 0, bookShock: 0 },
  { at: 0.08, beat: 0, focus: 0, open: 0, annotate: 0, featuredShock: 0, bookShock: 0 },
  { at: 0.24, beat: 1, focus: 1, open: 0, annotate: 0, featuredShock: 0, bookShock: 0 },
  { at: 0.3, beat: 1, focus: 1, open: 0, annotate: 0, featuredShock: 0, bookShock: 0 },
  { at: 0.4, beat: 2, focus: 1, open: 1, annotate: 0, featuredShock: 0, bookShock: 0 },
  { at: 0.46, beat: 3, focus: 1, open: 1, annotate: 1, featuredShock: 0, bookShock: 0 },
  { at: 0.64, beat: 3, focus: 1, open: 1, annotate: 1, featuredShock: 0, bookShock: 0 },
  { at: 0.72, beat: 4, focus: 1, open: 0, annotate: 0, featuredShock: 0, bookShock: 0 },
  { at: 0.8, beat: 4, focus: 1, open: 0, annotate: 0, featuredShock: 1, bookShock: 0 },
  { at: 0.9, beat: 5, focus: 0, open: 0, annotate: 0, featuredShock: 1, bookShock: 0 },
  { at: 0.97, beat: 5, focus: 0, open: 0, annotate: 0, featuredShock: 1, bookShock: 1 },
];

export const TRANSITION_POSES: readonly TransitionPose[] = POSES;

export const TRANSITION_HOLDS = checkCueTable("household-transition", POSES, {
  rendered: ["focus", "open", "annotate", "featuredShock", "bookShock"],
});

/** The coupon reprices once the household is open and labelled. */
export const SHOCK_CUE: TriggerCue = { id: "household-shock", at: 0.46 };

export type TransitionFrame = Omit<TransitionPose, "at"> & { hold: number };

function poseIndex(p: number): number {
  let index = 0;
  for (let i = 0; i < POSES.length; i++) if (p >= POSES[i].at) index = i;
  return index;
}

/**
 * Reduced motion cuts: every channel takes the value of the pose the reader
 * is in, so the camera jumps to its framing and the household is either shut or
 * open, never between.
 */
export function transitionAt(progress: number, reduced = false): TransitionFrame {
  const p = clamp01(progress);
  const i = poseIndex(p);
  const a = POSES[i];
  if (reduced) {
    const { at: _at, ...rest } = a;
    void _at;
    return { ...rest, hold: 0 };
  }
  const b = POSES[Math.min(i + 1, POSES.length - 1)];
  const span = b.at - a.at;
  const t = span <= 0 || a === b ? 0 : smoothstep((p - a.at) / span);
  return {
    beat: a.beat,
    focus: lerp(a.focus, b.focus, t),
    open: lerp(a.open, b.open, t),
    annotate: lerp(a.annotate, b.annotate, t),
    featuredShock: lerp(a.featuredShock, b.featuredShock, t),
    bookShock: lerp(a.bookShock, b.bookShock, t),
    hold: holdAt(TRANSITION_HOLDS, p),
  };
}

/** The data layer holds one wide view; the stage camera does all the moving. */
export function fieldFrame(frame: TransitionFrame): FilmFrame {
  return {
    beat: frame.beat,
    featuredShock: frame.featuredShock,
    bookShock: frame.bookShock,
    population: 1,
    sleeve: 0,
    line: 1,
    cut: 0,
    spanX: 0.74,
    cx: 0.14,
    focusY: 0,
    hold: 0,
  };
}

export type TransitionLayout = {
  /** Camera zoom on the loan. */
  zoom: number;
  /** Where the loan is held on screen once focused. */
  screen: Point;
  /** Household box edge, in world pixels (the camera scales it up by `zoom`). */
  box: number;
};

/**
 * Framing that leaves room for the copy: on a wide screen the narration sits
 * left and the household right of centre; on a phone the narration sits on top
 * and the household below it.
 */
export function transitionLayout(viewport: Size): TransitionLayout {
  const wide = viewport.width >= 768;
  const zoom = wide ? 2.6 : 2.2;
  const boxScreen = wide
    ? Math.min(viewport.width * 0.46, viewport.height * 0.72)
    : Math.min(viewport.width * 0.86, viewport.height * 0.44);
  return {
    zoom,
    screen: wide
      ? { x: viewport.width * 0.66, y: viewport.height * 0.5 }
      : { x: viewport.width * 0.5, y: viewport.height * 0.64 },
    box: boxScreen / zoom,
  };
}

/**
 * MORPH: the household opens out of the loan's ring. At 0 it is exactly the
 * ring's size, so the first thing the reader sees is the mark they were
 * looking at getting larger.
 */
export function openScale(open: number, ringRadius: number, box: number, ringShare: number): number {
  const start = Math.min(1, ringRadius / Math.max(1e-6, box * ringShare));
  return lerp(start, 1, smoothstep(open));
}

export function openOpacity(open: number): number {
  return smoothstep(clamp01(open / 0.3));
}
