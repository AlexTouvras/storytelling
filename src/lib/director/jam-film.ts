/**
 * Five beats for the US-101 pocket. One camera, one road, one brake.
 *
 * The picture is the cars. Words sit in the subtitle band, one or two lines
 * at a time. On a phone the picture holds while the first line is read, then
 * plays above the same band.
 */

import { checkCueTable, holdAt, type Hold, type TriggerCue } from "@/components/film/cue-table";
import { clamp01, lerp, smoothstep } from "@/components/film/craft";
import type { Point, Size } from "@/lib/director/camera";
import { PHONE_STRIP, SUBTITLE_BAND, WIDE_MIN } from "@/lib/director/grid-film";

export type JamPose = {
  at: number;
  beat: number;
  /** 0 = empty road, 1 = every mark visible. */
  reveal: number;
  /** 0 = the whole stretch, 1 = camera on the featured car. */
  focus: number;
  /** 0 = the mark, 1 = the three cars open. */
  open: number;
  /** 0 = the featured instant, 1 = a minute later. */
  trace: number;
  /** 0 = the featured instant, 1 = the end of the morning. */
  pull: number;
  /** Other marks step back while the cars are open. */
  dim: number;
  /** Legend labels on the open cars. */
  annotate: number;
};

const POSES: readonly JamPose[] = [
  { at: 0, beat: 0, reveal: 0, focus: 0, open: 0, trace: 0, pull: 0, dim: 0, annotate: 0 },
  { at: 0.05, beat: 0, reveal: 1, focus: 0.25, open: 0, trace: 0, pull: 0, dim: 0, annotate: 0 },
  { at: 0.14, beat: 0, reveal: 1, focus: 0.25, open: 0, trace: 0, pull: 0, dim: 0, annotate: 0 },
  { at: 0.18, beat: 1, reveal: 1, focus: 1, open: 0, trace: 0, pull: 0, dim: 0.4, annotate: 0 },
  { at: 0.26, beat: 1, reveal: 1, focus: 1, open: 1, trace: 0, pull: 0, dim: 1, annotate: 1 },
  { at: 0.34, beat: 1, reveal: 1, focus: 1, open: 1, trace: 0, pull: 0, dim: 1, annotate: 1 },
  { at: 0.36, beat: 2, reveal: 1, focus: 0.3, open: 0, trace: 0, pull: 0, dim: 0, annotate: 0 },
  { at: 0.48, beat: 2, reveal: 1, focus: 0.12, open: 0, trace: 1, pull: 0, dim: 0, annotate: 0 },
  { at: 0.56, beat: 2, reveal: 1, focus: 0.12, open: 0, trace: 1, pull: 0, dim: 0, annotate: 0 },
  { at: 0.58, beat: 3, reveal: 1, focus: 0, open: 0, trace: 1, pull: 0, dim: 0, annotate: 0 },
  { at: 0.62, beat: 3, reveal: 1, focus: 0, open: 0, trace: 0, pull: 0, dim: 0, annotate: 0 },
  { at: 0.66, beat: 3, reveal: 1, focus: 0, open: 0, trace: 0, pull: 0, dim: 0, annotate: 0 },
  { at: 0.76, beat: 3, reveal: 1, focus: 0, open: 0, trace: 0, pull: 1, dim: 0, annotate: 0 },
  { at: 0.78, beat: 4, reveal: 1, focus: 0, open: 0, trace: 0, pull: 1, dim: 0, annotate: 0 },
  { at: 1, beat: 4, reveal: 1, focus: 0, open: 0, trace: 0, pull: 1, dim: 0, annotate: 0 },
];

const CHANNELS = ["reveal", "focus", "open", "trace", "pull", "dim", "annotate"] as const;

export type JamFrame = { beat: number; hold: number } & Record<(typeof CHANNELS)[number], number>;

export const JAM_HOLDS: readonly Hold[] = checkCueTable("jam", POSES, { rendered: CHANNELS });

/** The brake fires once the three cars are open. */
export const BRAKE_CUE: TriggerCue = { id: "brake", at: 0.26 };

export const JAM_BEAT_STARTS: readonly number[] = POSES.filter((p, i) => i === 0 || p.beat !== POSES[i - 1].beat).map(
  (p) => p.at,
);

function poseIndex(p: number): number {
  let i = 0;
  for (let k = 1; k < POSES.length; k++) if (POSES[k].at <= p) i = k;
  return i;
}

export function jamFrameAt(progress: number, reduced = false): JamFrame {
  const p = clamp01(progress);
  const i = poseIndex(p);
  const a = POSES[i];
  const b = POSES[Math.min(i + 1, POSES.length - 1)];
  if (reduced) {
    const source = b.beat === a.beat ? b : a;
    const frame = { beat: a.beat, hold: 0 } as JamFrame;
    for (const key of CHANNELS) frame[key] = source[key];
    return frame;
  }
  const span = b.at - a.at;
  const t = span <= 0 || a === b ? 0 : smoothstep((p - a.at) / span);
  const frame = { beat: a.beat, hold: holdAt(JAM_HOLDS, p) } as JamFrame;
  for (const key of CHANNELS) frame[key] = lerp(a[key], b[key], t);
  return frame;
}

export function jamBeatAt(progress: number): number {
  return POSES[poseIndex(clamp01(progress))].beat;
}

export type Rect = { x: number; y: number; width: number; height: number };

export type JamLayout = {
  wide: boolean;
  pictureBottom: number;
  zoom: number;
  /** Where the featured car is held once the camera is on it. */
  screen: Point;
  road: Rect;
  /** Rive box edge in world pixels, so the camera's zoom makes it this many screen pixels. */
  box: number;
};

export { PHONE_STRIP, SUBTITLE_BAND, WIDE_MIN };

export function jamLayout(viewport: Size): JamLayout {
  const { width: W, height: H } = viewport;
  const wide = W >= WIDE_MIN;
  const top = wide ? 0.05 * H : 0.06 * H;
  const bottom = H - SUBTITLE_BAND;
  const span = Math.max(120, bottom - top);
  const roadW = Math.min(wide ? 0.34 * W : 0.62 * W, 280);
  const roadH = span * 0.88;
  const road = {
    x: (W - roadW) / 2,
    y: top + (span - roadH) / 2,
    width: roadW,
    height: roadH,
  };
  const zoom = wide ? 2.7 : 2.3;
  const screenBox = Math.min(wide ? 0.62 * W : 0.9 * W, span * 0.62);
  return {
    wide,
    pictureBottom: bottom,
    zoom,
    screen: { x: W / 2, y: (top + bottom) / 2 },
    road,
    box: screenBox / zoom,
  };
}

/** Lane 1 is the left lane. Ahead is up. */
export function laneX(road: Rect, lane: number, lanes = 5): number {
  return road.x + ((lane - 0.5) / lanes) * road.width;
}

export function feetY(road: Rect, feet: number, lengthFt: number): number {
  return road.y + road.height * (1 - feet / lengthFt);
}

/** Each phone reading span, as a share of the film's timeline. Same shape as the grid film. */
export const PHONE_READ = 0.08;
const CARD_EDGE = 0.2;
export const PHONE_TRACK_SCALE = 1 + PHONE_READ * JAM_BEAT_STARTS.length;

type PhoneSegment = { beat: number; start: number; end: number; readFrom: number; motionFrom: number; motionTo: number };

const PHONE_SEGMENTS: readonly PhoneSegment[] = (() => {
  const out: PhoneSegment[] = [];
  let u = 0;
  JAM_BEAT_STARTS.forEach((start, beat) => {
    const end = JAM_BEAT_STARTS[beat + 1] ?? 1;
    out.push({ beat, start, end, readFrom: u, motionFrom: u + PHONE_READ, motionTo: u + PHONE_READ + (end - start) });
    u += PHONE_READ + (end - start);
  });
  return out;
})();

export type PhoneMoment = { film: number; card: number };

export function phoneMomentAt(progress: number): PhoneMoment {
  const u = clamp01(progress) * PHONE_TRACK_SCALE;
  const last = PHONE_SEGMENTS.length - 1;
  const seg = PHONE_SEGMENTS.find((s) => u < s.motionTo) ?? PHONE_SEGMENTS[last];
  if (u < seg.motionFrom) {
    const local = (u - seg.readFrom) / PHONE_READ;
    const rise = seg.beat === 0 ? 1 : smoothstep(local / CARD_EDGE);
    const lower = seg.beat === last ? 1 : smoothstep((1 - local) / CARD_EDGE);
    return { film: seg.start, card: Math.min(rise, lower) };
  }
  return { film: Math.min(seg.end, seg.start + (u - seg.motionFrom)), card: seg.beat === last ? 1 : 0 };
}

export function phoneTrackAt(film: number): number {
  const t = clamp01(film);
  const seg = PHONE_SEGMENTS.find((s) => t < s.end) ?? PHONE_SEGMENTS[PHONE_SEGMENTS.length - 1];
  return (seg.motionFrom + (t - seg.start)) / PHONE_TRACK_SCALE;
}

export function phoneReadAt(beat: number): number {
  const seg = PHONE_SEGMENTS[Math.max(0, Math.min(PHONE_SEGMENTS.length - 1, beat))];
  return (seg.readFrom + PHONE_READ / 2) / PHONE_TRACK_SCALE;
}

export const TRACK_VH = 1000;
