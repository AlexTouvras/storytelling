/**
 * *When the spinning stops*: the timeline.
 *
 *   a quiet minute → the trip, followed to its lowest point → the trace folds
 *   into its hour → the hour opens into the machine → the plant trips → fewer
 *   wheels, the same trip, beside the modelled curves → fast reserve catches it
 *   → the machine closes into its hour → PULLBACK to the year of hours
 *
 * One camera. Beats 0–3 are held on one hour of the year (the featured
 * trip's) at a fixed zoom; everything drawn there lives in a detail group laid
 * out in screen pixels and scaled by 1/zoom, so the camera's push is what makes
 * it the right size. Beat 4 pulls the camera back to the field.
 *
 * The machine runs three times, each on its own clock. Each run is a segment
 * with its own trigger cue; crossing into a segment resets the illustration and
 * sets its inputs, and the cue is reconciled like any other trigger.
 */

import { checkCueTable, holdAt, type TriggerCue } from "@/components/film/cue-table";
import { clamp01, lerp, smoothstep } from "@/components/film/craft";
import type { Point, Size } from "@/lib/director/camera";

export type GridPose = {
  at: number;
  beat: number;
  /** 0 = wide on the year of hours, 1 = on the featured hour. */
  focus: number;
  /** The observed trace panel: 1 shown, 0 folded into the hour. */
  trace: number;
  /** Trace window and pen, seconds from the trace start. */
  t0: number;
  t1: number;
  pen: number;
  /** Bottom of the trace's frequency axis, Hz. */
  yLo: number;
  /** 0 = the hour is a dot, 1 = the machine is open. */
  open: number;
  /** The first three legend labels. */
  legend: number;
  /** The fast-reserve legend label. */
  legendReserve: number;
  /** 0 = machine centred, 1 = machine aside with the modelled curves beside it. */
  split: number;
  /** Modelled curves drawn: typical hour, light hour, light hour with fast reserve. */
  curveTypical: number;
  curveLight: number;
  curveReserve: number;
  /** The year of hours, written on left to right. */
  field: number;
  /** The 150 GWs line. */
  line: number;
  /** Hours with fast reserve bought, lit. */
  reserve: number;
};

const P = (
  at: number,
  beat: number,
  channels: Partial<Omit<GridPose, "at" | "beat">>,
  from: GridPose,
): GridPose => ({ ...from, ...channels, at, beat });

const START: GridPose = {
  at: 0,
  beat: 0,
  focus: 1,
  trace: 1,
  t0: 0,
  t1: 60,
  pen: 0,
  yLo: 49.9,
  open: 0,
  legend: 0,
  legendReserve: 0,
  split: 0,
  curveTypical: 0,
  curveLight: 0,
  curveReserve: 0,
  field: 0,
  line: 0,
  reserve: 0,
};

function build(): GridPose[] {
  const poses: GridPose[] = [START];
  const add = (at: number, beat: number, channels: Partial<Omit<GridPose, "at" | "beat">> = {}) =>
    poses.push(P(at, beat, channels, poses[poses.length - 1]));
  // 0 · Fifty: a real quiet minute, written on.
  add(0.03, 0);
  add(0.13, 0, { pen: 60 });
  // 1 · A trip: the axis opens down to the floor first, so the fall lands in frame.
  add(0.17, 1);
  add(0.22, 1, { yLo: 48.85, t0: 30, t1: 110 });
  add(0.31, 1, { pen: 100 });
  add(0.35, 1, { pen: 150, t0: 30, t1: 160 });
  // 2 · Inside the hour: the trace folds into its hour; the hour opens.
  add(0.37, 2);
  add(0.41, 2, { trace: 0 });
  add(0.46, 2, { open: 1 });
  add(0.5, 2, { legend: 1 });
  add(0.57, 2);
  // 3 · Fewer wheels: the curves beside the machine; two more runs.
  add(0.58, 3, { legend: 0 });
  add(0.62, 3, { split: 1, curveTypical: 1 });
  add(0.65, 3);
  add(0.69, 3, { curveLight: 1 });
  add(0.73, 3, { legendReserve: 1 });
  add(0.78, 3, { curveReserve: 1 });
  add(0.82, 3);
  // 4 · Every hour: the machine closes into its hour; pull back to the year.
  add(0.83, 4, { legendReserve: 0 });
  add(0.86, 4, { open: 0, split: 0, curveTypical: 0, curveLight: 0, curveReserve: 0 });
  add(0.92, 4, { focus: 0, field: 1 });
  add(0.945, 4, { line: 1 });
  add(0.97, 4, { reserve: 1 });
  // 5 · Catch it faster: the decision, over the year.
  add(0.975, 5);
  return poses;
}

const POSES = build();
export const GRID_POSES: readonly GridPose[] = POSES;

const CHANNELS = [
  "focus",
  "trace",
  "t0",
  "t1",
  "pen",
  "yLo",
  "open",
  "legend",
  "legendReserve",
  "split",
  "curveTypical",
  "curveLight",
  "curveReserve",
  "field",
  "line",
  "reserve",
] as const satisfies readonly Exclude<keyof GridPose, "at" | "beat">[];

export const GRID_HOLDS = checkCueTable("grid-film", POSES, { rendered: CHANNELS });

export type GridFrame = Omit<GridPose, "at"> & { hold: number };

function poseIndex(p: number): number {
  let index = 0;
  for (let i = 0; i < POSES.length; i++) if (p >= POSES[i].at) index = i;
  return index;
}

/** Reduced motion cuts: every channel takes the value of the pose the reader is in. */
export function gridFrameAt(progress: number, reduced = false): GridFrame {
  const p = clamp01(progress);
  const i = poseIndex(p);
  const a = POSES[i];
  const b = POSES[Math.min(i + 1, POSES.length - 1)];
  if (reduced) {
    // Cut to where the move is going, so a beat is never shown half-made.
    const { at: _at, ...rest } = b.beat === a.beat ? b : a;
    void _at;
    return { ...rest, beat: a.beat, hold: 0 };
  }
  const span = b.at - a.at;
  const t = span <= 0 || a === b ? 0 : smoothstep((p - a.at) / span);
  const out = { beat: a.beat, hold: holdAt(GRID_HOLDS, p) } as GridFrame;
  for (const key of CHANNELS) out[key] = lerp(a[key], b[key], t);
  return out;
}

export function gridBeatAt(progress: number): number {
  return POSES[poseIndex(clamp01(progress))].beat;
}

/**
 * The machine's three runs. Crossing into a segment resets the illustration
 * and sets its inputs; its trip cue then fires or settles like any trigger.
 */
export type GridRun = {
  id: "typical" | "light" | "light-reserve";
  from: number;
  light: boolean;
  reserve: boolean;
  cue: TriggerCue;
};

export const GRID_RUNS: readonly GridRun[] = [
  { id: "typical", from: 0, light: false, reserve: false, cue: { id: "trip-typical", at: 0.51 } },
  { id: "light", from: 0.645, light: true, reserve: false, cue: { id: "trip-light", at: 0.655 } },
  { id: "light-reserve", from: 0.74, light: true, reserve: true, cue: { id: "trip-reserve", at: 0.75 } },
];

export function gridRunAt(progress: number): number {
  let index = 0;
  for (let i = 0; i < GRID_RUNS.length; i++) if (progress >= GRID_RUNS[i].from) index = i;
  return index;
}

export type Rect = { x: number; y: number; width: number; height: number };

export type GridLayout = {
  wide: boolean;
  /** Bottom edge of the picture, screen px: the stage's bottom on a wide screen, above the narration on a phone. */
  pictureBottom: number;
  /** Where the phone narration's scrim starts: the picture's bottom, or higher when the narration is too tall to fit under it. */
  scrimTop: number;
  /** Camera zoom on the featured hour. */
  zoom: number;
  /** Where the featured hour is held on screen once focused. */
  screen: Point;
  /** Detail rects in screen pixels, relative to `screen`. */
  trace: Rect;
  machine: Rect;
  machineAside: Rect;
  chart: Rect;
  /** The year of hours in world (= stage) pixels. */
  field: Rect;
};

function centred(cx: number, cy: number, width: number, height: number): Rect {
  return { x: cx - width / 2, y: cy - height / 2, width, height };
}

/** Matches the `lg` breakpoint, where the narration moves into the left column. */
export const WIDE_MIN = 1024;
/** Gap between the picture and the narration on a phone, px. */
export const PHONE_COPY_GAP = 16;
/** Room under the phone machine for its two-line legend caption, px; kept above too, so the machine stays centred on its hour. */
const PHONE_CAPTION = 36;

/**
 * On a wide screen the narration sits in a left column and the picture to its
 * right; on a phone the picture takes the top of the screen and the narration
 * the bottom. `copyReserve` is how far the tallest beat's narration reaches up
 * from the bottom edge on a phone; the picture ends above it, so no beat's
 * text runs into the drawing. The picture never shrinks below 36% of the
 * screen; past that (large system text) the scrim starts above the narration
 * and covers the overlap.
 */
export function gridLayout(viewport: Size, copyReserve = 0): GridLayout {
  const { width: W, height: H } = viewport;
  const wide = W >= WIDE_MIN;
  if (wide) {
    const region = { x: 0.4 * W, y: 0.08 * H, width: 0.58 * W, height: 0.84 * H };
    const screen = { x: region.x + region.width / 2, y: region.y + region.height / 2 };
    const side = Math.min(region.width * 0.62, region.height * 0.86);
    const aside = Math.min(region.width * 0.5, region.height * 0.8);
    const machineAsideCx = region.x + region.width * 0.27 - screen.x;
    return {
      wide,
      pictureBottom: H,
      scrimTop: H,
      zoom: 6,
      screen,
      trace: centred(0, 0, region.width * 0.94, Math.min(region.height * 0.62, 460)),
      machine: centred(0, 0, side, side),
      machineAside: centred(machineAsideCx, 0, aside, aside),
      chart: {
        x: region.x + region.width * 0.56 - screen.x,
        y: -region.height * 0.22,
        width: region.width * 0.43,
        height: region.height * 0.44,
      },
      field: { x: region.x + 0.04 * region.width, y: 0.14 * H, width: region.width * 0.92, height: 0.64 * H },
    };
  }
  const top = 0.07 * H;
  const bottom = Math.max(0.36 * H, Math.min(0.56 * H, H - copyReserve - PHONE_COPY_GAP));
  const screen = { x: W / 2, y: (top + bottom) / 2 };
  const side = Math.min(0.78 * W, bottom - top - 2 * PHONE_CAPTION);
  const aside = Math.min(0.6 * W, (bottom - top) * 0.62);
  const asideCy = top + aside / 2 - screen.y;
  return {
    wide,
    pictureBottom: bottom,
    scrimTop: copyReserve ? Math.min(bottom, H - copyReserve - PHONE_COPY_GAP) : bottom,
    zoom: 6,
    screen,
    trace: centred(0, 0, 0.94 * W, (bottom - top) * 0.82),
    machine: centred(0, 0, side, side),
    machineAside: centred(0, asideCy, aside, aside),
    chart: {
      x: -0.46 * W,
      y: asideCy + aside / 2 + 4,
      width: 0.92 * W,
      height: bottom - top - aside - 8,
    },
    field: { x: 0.1 * W, y: top + 0.04 * H, width: 0.84 * W, height: bottom - top - 0.06 * H },
  };
}

/** Where the featured hour sits in the year-of-hours field, world pixels. */
export function fieldPoint(
  field: Rect,
  hourIndex: number,
  hours: number,
  gws: number,
  range: { lo: number; hi: number },
): Point {
  return {
    x: field.x + (hourIndex / Math.max(1, hours - 1)) * field.width,
    y: field.y + (1 - (gws - range.lo) / (range.hi - range.lo)) * field.height,
  };
}

export const FIELD_RANGE = { lo: 110, hi: 280 } as const;
