/**
 * Craft rules for the scrubbed canvas films (Layer 2).
 *
 * Earned by reading alexgreensh/anidoodle (Apache-2.0) and testing its doctrine
 * against our two films. Nothing here is copied from that engine; these are our
 * own implementations of four rules that its craft bar enforces. The reasoning
 * and the measurements are in `docs/ANIMATION_CRAFT.md`.
 *
 *   1. No dead air — a scrubbed film freezes whenever the reader stops, which is
 *      exactly when they are reading. A hold may creep the camera, but the
 *      subject never stops.
 *   2. Marks are made, not faded — a population arrives in an order, mark after
 *      mark, instead of one sheet rising in alpha.
 *   3. One side leads — never half a cycle, and never in lockstep.
 *   4. Marks are sized relative to what they draw, and line weight grows
 *      sub-linearly with the camera.
 *
 * Every function is pure and seeded by mark id. `time` is supplied by the host
 * render loop; nothing here reads a clock.
 */

const TAU = Math.PI * 2;

/** Drift amplitude as a share of the mark's own radius. */
const LIFE_RADIUS_SHARE = 0.3;
/** Floor in CSS pixels, so far-field marks still visibly move. */
const LIFE_FLOOR_PX = 0.9;
/** Chosen so the two axes never resynchronise into one visible pulse. */
const LIFE_HZ_X = 0.17;
const LIFE_HZ_Y = 0.26;
const LIFE_HZ_GLOW = 0.13;

/** Camera creep during a hold, as a share of the visible span. */
const CREEP_PAN_SHARE = 0.014;
const CREEP_PUSH = 0.012;
const CREEP_PAN_SECONDS = 26;
const CREEP_PUSH_SECONDS = 41;

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Hermite. Returns exactly 0 and exactly 1 at the ends. */
export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Deterministic 0–1 from a mark id. `channel` picks an independent stream, so
 * one mark's drift, glow and rank jitter never correlate. Channel 0 matches the
 * jitter hash the fields already used.
 */
export function hash(id: number, channel = 0): number {
  const x = Math.sin(id * 127.1 + 311.7 + channel * 269.5) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * What the host render loop hands the draw function. `life` is 0 under reduced
 * motion, which makes the whole craft layer collapse back to a still picture.
 */
export type Motion = {
  time: number;
  life: number;
};

export const STILL: Motion = { time: 0, life: 0 };

export type MarkLife = {
  /** CSS-pixel offsets, to be added to the projected position. */
  dx: number;
  dy: number;
  /** Multiplier on the mark's alpha. */
  glow: number;
};

const NO_LIFE: MarkLife = { dx: 0, dy: 0, glow: 1 };

/**
 * Keep one mark alive. Amplitude is relative to the mark so a close-up does not
 * turn a settled field into a swarm, with a pixel floor so the far field is not
 * still. `amount` is 0 under reduced motion.
 */
export function markLife(
  id: number,
  time: number,
  radius: number,
  amount = 1,
): MarkLife {
  if (amount <= 0) return NO_LIFE;
  const amp = Math.max(LIFE_FLOOR_PX, radius * LIFE_RADIUS_SHARE) * amount;
  return {
    dx: Math.sin(time * TAU * LIFE_HZ_X + hash(id, 1) * TAU) * amp,
    dy: Math.sin(time * TAU * LIFE_HZ_Y + hash(id, 2) * TAU) * amp * 0.72,
    glow: 1 + Math.sin(time * TAU * LIFE_HZ_GLOW + hash(id, 3) * TAU) * 0.12 * amount,
  };
}

export type CameraCreep = {
  /** Pan in view-span units. */
  pan: number;
  /** Multiplier on the visible span. Below 1 is a push in. */
  span: number;
};

const PLANTED: CameraCreep = { pan: 0, span: 1 };

/**
 * A held camera creeps. `hold` comes from the cue table and is 0 while the film
 * is moving, so creep never fights the scroll.
 */
export function cameraCreep(time: number, hold: number, amount = 1): CameraCreep {
  const k = clamp01(hold) * clamp01(amount);
  if (k <= 0) return PLANTED;
  const push = 0.5 - 0.5 * Math.cos((time * TAU) / CREEP_PUSH_SECONDS);
  return {
    pan: Math.sin((time * TAU) / CREEP_PAN_SECONDS) * CREEP_PAN_SHARE * k,
    span: 1 - push * CREEP_PUSH * k,
  };
}

/**
 * Stagger a channel across the field so one side arrives first. `rank` 0 leads
 * and 1 trails; `spread` is the share of the transition spent staggering and is
 * capped well under half, because a field that crosses half a cycle reads as two
 * populations rather than one wave. Returns exactly 0 at t=0 and 1 at t=1 for
 * every rank, so the pose endpoints in the cue table still hold.
 */
export function leadLag(t: number, rank: number, spread: number): number {
  const s = Math.min(Math.max(spread, 0), 0.45);
  if (s <= 0) return smoothstep(t);
  return smoothstep((clamp01(t) - clamp01(rank) * s) / (1 - s));
}

/**
 * Roughen a data-driven rank so the wavefront is not a ruled line. The order
 * still reads, the edge does not look stamped.
 */
export function rankJitter(id: number, rank: number, jitter = 0.22): number {
  return clamp01(rank + (hash(id, 4) - 0.5) * jitter);
}

/**
 * Per-mark presence as a population is written on in `rank` order. At
 * `population` 0 nothing is present and at 1 everything is, so this is a drop-in
 * for multiplying by the channel — but in between the field is being made
 * rather than fading up as one sheet.
 */
export function arrival(rank: number, population: number, feather = 0.18): number {
  const f = Math.max(feather, 1e-3);
  return smoothstep((clamp01(population) * (1 + f) - clamp01(rank)) / f);
}

/**
 * Line weight under the camera. A 6× close-up wants about 1.9× the weight, not
 * 6×: linework that scales with the camera reads as a slab, and linework that
 * ignores it reads as a hairline laid over a drawing.
 */
export function strokeWeight(base: number, zoom: number): number {
  return base * Math.pow(Math.max(zoom, 1e-3), 0.35);
}
