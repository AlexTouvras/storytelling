"use client";

import { memo, useEffect, useRef, type RefObject } from "react";

/**
 * Three acts of one flight.
 *
 * 1. Top-down. Record lanes run horizontal, a little tight, and the points drift.
 *    One vertical thread ties a single dot on each lane to the next, stepping
 *    sideways at random.
 * 2. The camera pitches along that thread and closes on one dot until that
 *    dot fills the frame. Its center opens, softer than the limb, and the
 *    warp leaves from inside it: screen = center + worldXY * focal / z.
 * 3. The streaks shorten into the same points, and the brightest open into galaxies.
 */

type Star = {
  lane: number;
  u: number;
  kind: 0 | 1 | 2;
  onPath: boolean;
  ang: number;
  rad: number;
  z: number;
  dust: boolean;
};

type Node = { lane: number; u: number };
type V3 = { x: number; y: number; z: number };

const CYAN: [number, number, number] = [126, 224, 234];
const VIOLET: [number, number, number] = [214, 160, 255];
const LANES = 16;
const SAMPLES = 96;
const CHOSEN = 8;
const TARGET_U = 0.57;
const GAP = 1.1;
const LEN = 16;
const MIN_Z = 6;
const Z_SPAN = 94;

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * One thread: a single dot on each horizontal lane, stepped only to the next lane.
 * Most steps flip direction. A few continue, so the line wanders instead of zigzagging evenly.
 */
function buildPath(): Node[] {
  const u = new Array<number>(LANES).fill(TARGET_U);
  let sign = 1;
  for (let lane = CHOSEN - 1; lane >= 0; lane--) {
    const seed = lane * 19 + 4;
    if (hash(seed) > 0.34) sign = -sign;
    const mag = 0.04 + hash(seed + 2.2) * 0.1;
    u[lane] = Math.min(0.84, Math.max(0.16, u[lane + 1] + sign * mag));
  }
  sign = -1;
  for (let lane = CHOSEN + 1; lane < LANES; lane++) {
    const seed = lane * 23 + 8;
    if (hash(seed) > 0.34) sign = -sign;
    const mag = 0.04 + hash(seed + 3.4) * 0.1;
    u[lane] = Math.min(0.84, Math.max(0.16, u[lane - 1] + sign * mag));
  }
  u[CHOSEN] = TARGET_U;
  return u.map((value, lane) => ({ lane, u: value }));
}

const PATH = buildPath();

function buildStars(): Star[] {
  const stars: Star[] = [];
  for (let lane = 0; lane < LANES; lane++) {
    const pathIndex = Math.round(PATH[lane].u * (SAMPLES - 1));
    for (let i = 0; i < SAMPLES; i++) {
      const n = hash(lane * 97 + i * 13);
      const onPath = i === pathIndex;
      const u = onPath ? PATH[lane].u : i / (SAMPLES - 1);
      const kind: 0 | 1 | 2 = n > 0.93 ? 2 : i % 11 === 0 ? 1 : 0;
      stars.push({
        lane,
        u,
        kind,
        onPath,
        ang: (lane / LANES) * Math.PI * 2 + (u - 0.5) * 0.2,
        rad: 0.045 + n * 0.16,
        z: hash(lane * 17 + i * 31),
        dust: false,
      });
    }
  }
  for (let i = 0; i < 480; i++) {
    const a = hash(i * 3 + 1);
    const b = hash(i * 3 + 2);
    const c = hash(i * 3 + 3);
    stars.push({
      lane: -1,
      u: a,
      kind: 0,
      onPath: false,
      ang: a * Math.PI * 2,
      rad: 0.03 + Math.pow(b, 0.55) * 0.19,
      z: c,
      dust: true,
    });
  }
  return stars;
}

function worldOf(lane: number, u: number, y = 0): V3 {
  return {
    x: (u - 0.5) * LEN,
    y,
    z: (lane - (LANES - 1) / 2) * GAP,
  };
}

type Mote = { lane: number; u: number; rate: number; lift: number; r: number };
const MOTES: Mote[] = Array.from({ length: 160 }, (_, i) => ({
  lane: hash(i * 5 + 2) * (LANES - 1),
  u: hash(i * 5 + 3),
  rate: 0.035 + hash(i * 5 + 4) * 0.14,
  lift: (hash(i * 5 + 5) - 0.5) * 0.45,
  r: 0.012 + hash(i * 5 + 6) * 0.018,
}));

const STARS = buildStars();
const LANE_INDEX: number[][] = Array.from({ length: LANES }, () => []);
STARS.forEach((star, i) => {
  if (star.lane >= 0) LANE_INDEX[star.lane].push(i);
});

/** Shapes only. Positions are the warp heads these bodies grow out of. */
const GALAXIES = [
  { rx: 150, ry: 52, rot: -0.45 },
  { rx: 120, ry: 40, rot: 0.7 },
  { rx: 86, ry: 28, rot: 0.15 },
  { rx: 100, ry: 34, rot: -1.1 },
];

const ORBS = [{ r: 28 }, { r: 18 }];

const DUST_INDEX: number[] = [];
for (let i = 0; i < STARS.length; i++) if (STARS[i].dust) DUST_INDEX.push(i);

function fit(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { cssW: rect.width, cssH: rect.height, dpr };
}

function flightZ(seed: number, travel: number) {
  const z0 = MIN_Z + seed * Z_SPAN;
  let z = z0 - travel;
  z = ((((z - MIN_Z) % Z_SPAN) + Z_SPAN) % Z_SPAN) + MIN_Z;
  return z;
}

/** Where a dust star sits once travel has eased to a stop, on a reference frame. */
const TRAVEL_END = 220;
function settledReach(star: Star) {
  const z = flightZ(star.z, TRAVEL_END);
  const focal = 900 * 0.2;
  return (star.rad * 900 * focal) / z;
}

/**
 * Warp frame scale. On portrait phones, min(w,h) alone crushes the horizon
 * into the center — boost so stars, orbs, and galaxies reach toward the edges.
 */
function warpUnit(width: number, height: number) {
  const short = Math.min(width, height);
  if (short >= 760) return short;
  const aspect = Math.max(width, height) / short;
  const boost = 1.32 + Math.min(0.42, (aspect - 1) * 0.3);
  return short * boost;
}

/** Galaxy / orb pixel sizes: scaled down on narrow frames so they don't swamp the field. */
function bodyScale(width: number) {
  return width < 760 ? 0.58 : 1;
}

type Ranked = { i: number; reach: number; ang: number };

function pickSpread(pool: Ranked[], count: number, minSep: number) {
  const picked: Ranked[] = [];
  const skipped: Ranked[] = [];
  for (const item of pool) {
    const clear = picked.every((prev) => {
      let d = Math.abs(item.ang - prev.ang) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      return d > minSep;
    });
    if (clear) picked.push(item);
    else skipped.push(item);
    if (picked.length === count) return picked;
  }
  for (const item of skipped) {
    picked.push(item);
    if (picked.length === count) break;
  }
  return picked;
}

const IN_FRAME: Ranked[] = [];
for (const i of DUST_INDEX) {
  const star = STARS[i];
  const reach = settledReach(star);
  if (reach < 48 || reach > 460) continue;
  IN_FRAME.push({ i, reach, ang: star.ang });
}
IN_FRAME.sort((a, b) => b.reach - a.reach);

const GALAXY_PICK = pickSpread(IN_FRAME, GALAXIES.length, 0.7);
const GALAXY_AT = GALAXY_PICK.map((item) => item.i);
const galaxyUsed = new Set(GALAXY_AT);
const ORB_PICK = pickSpread(
  IN_FRAME.filter((item) => !galaxyUsed.has(item.i)),
  ORBS.length,
  0.55,
);
const ORB_AT = ORB_PICK.map((item) => item.i);
const GALAXY_SET = new Set(GALAXY_AT);
const ORB_SET = new Set(ORB_AT);

const WARP = { x: 0, y: 0, px: 0, py: 0 };

/** Classic warp projection. Previous z is farther, so the streak points outward. */
function warpPoint(
  star: Star,
  travel: number,
  stretch: number,
  width: number,
  height: number,
  cx: number,
  cy: number,
) {
  const z = flightZ(star.z, travel);
  const prevZ = Math.min(MIN_Z + Z_SPAN, z + stretch);
  const unit = warpUnit(width, height);
  const focal = unit * 0.2;
  const dist = star.rad * unit;
  const twist = (1 - (z - MIN_Z) / Z_SPAN) * 1.6;
  const prevTwist = (1 - (prevZ - MIN_Z) / Z_SPAN) * 1.6;
  const k = focal / z;
  const pk = focal / prevZ;
  const a = star.ang + twist;
  const pa = star.ang + prevTwist;
  WARP.x = cx + Math.cos(a) * dist * k;
  WARP.y = cy + Math.sin(a) * dist * k;
  WARP.px = cx + Math.cos(pa) * dist * pk;
  WARP.py = cy + Math.sin(pa) * dist * pk;
  return WARP;
}

type Frame = {
  fx: number;
  fy: number;
  fz: number;
  rx: number;
  ry: number;
  rz: number;
  ux: number;
  uy: number;
  uz: number;
};

/** Overhead, screen-up follows the lane stack, so the thread is vertical and the lanes are horizontal. */
function frameOf(pos: V3, target: V3): Frame {
  let fx = target.x - pos.x;
  let fy = target.y - pos.y;
  let fz = target.z - pos.z;
  const fl = Math.hypot(fx, fy, fz) || 1;
  fx /= fl;
  fy /= fl;
  fz /= fl;
  const steep = smoothstep(-0.42, -0.9, fy);
  let ux = 0;
  let uy = 1 - steep;
  let uz = steep;
  const ul = Math.hypot(ux, uy, uz) || 1;
  ux /= ul;
  uy /= ul;
  uz /= ul;
  let rx = fy * uz - fz * uy;
  let ry = fz * ux - fx * uz;
  let rz = fx * uy - fy * ux;
  const rl = Math.hypot(rx, ry, rz) || 1;
  rx /= rl;
  ry /= rl;
  rz /= rl;
  return {
    fx,
    fy,
    fz,
    rx,
    ry,
    rz,
    ux: ry * fz - rz * fy,
    uy: rz * fx - rx * fz,
    uz: rx * fy - ry * fx,
  };
}

/**
 * Overhead, the violet thread is screen-vertical. The camera drops behind it,
 * then commits onto the chosen dot so that dot sits on the warp center.
 */
function approachCamera(zoom: number, time: number, reduced: boolean) {
  const entry = worldOf(CHOSEN, TARGET_U);
  const commit = smoothstep(0.42, 0.78, zoom);
  const nestle = smoothstep(0.7, 1, zoom);
  const pitch = lerp(1.46, lerp(0.34, 0.05, commit), zoom);
  const glide = lerp(13.6, 2.15, Math.pow(zoom, 0.7));
  const near = lerp(0.28, 0.05, nestle);
  const dist = lerp(glide, near, commit);
  const close = smoothstep(0.28, 0.85, zoom);
  const horiz = Math.cos(pitch) * dist;
  const idle = reduced ? 0 : (1 - zoom) * (1 - zoom) * (1 - commit);
  const sway = Math.sin(Math.PI * zoom) * 0.2 * (1 - commit);
  const pos = {
    x: entry.x + sway + Math.sin(time * 0.22 + 1.3) * 0.2 * idle,
    y: lerp(Math.sin(pitch) * dist, lerp(0.5, 0.006, nestle), close),
    z: entry.z - lerp(horiz, lerp(1.45, near, commit), close) + Math.sin(time * 0.35) * 0.35 * idle,
  };
  const ahead = lerp(0.04, 4.2, smoothstep(0.08, 0.72, zoom)) * (1 - commit);
  const lane = Math.min(LANES - 1.001, CHOSEN + ahead);
  const i0 = Math.floor(lane);
  const i1 = Math.min(LANES - 1, i0 + 1);
  const look = worldOf(lane, lerp(PATH[i0].u, PATH[i1].u, lane - i0));
  const blend = smoothstep(0.1, 0.62, zoom) * (1 - commit);
  const target = {
    x: lerp(entry.x, look.x, blend),
    y: 0,
    z: lerp(entry.z, look.z, blend),
  };
  return { pos, target, frame: frameOf(pos, target) };
}

function project(
  world: V3,
  pos: V3,
  frame: Frame,
  focal: number,
  width: number,
  height: number,
) {
  const dx = world.x - pos.x;
  const dy = world.y - pos.y;
  const dz = world.z - pos.z;
  const depth = dx * frame.fx + dy * frame.fy + dz * frame.fz;
  if (depth < 0.05) return null;
  const x = dx * frame.rx + dy * frame.ry + dz * frame.rz;
  const y = dx * frame.ux + dy * frame.uy + dz * frame.uz;
  const k = focal / depth;
  return {
    x: width * 0.5 + x * k,
    y: height * 0.46 - y * k,
    k,
  };
}

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  time: number,
  reduced: boolean,
) {
  const p = reduced ? 0 : progress;
  const zoom = smoothstep(0.14, 0.46, p);
  const warpIn = smoothstep(0.43, 0.58, p);
  const cruise = smoothstep(0.43, 0.64, p);
  const settle = smoothstep(0.64, 0.92, p);
  const bloom = smoothstep(0.66, 0.88, p);
  const horizon = smoothstep(0.84, 0.98, p);
  const fieldAlpha = (1 - smoothstep(0.18, 0.5, zoom)) * (1 - smoothstep(0.32, 0.44, p));
  const threadAlpha = (1 - smoothstep(0.55, 0.86, zoom)) * (1 - smoothstep(0.34, 0.46, p));
  const holeFade = 1 - smoothstep(0.5, 0.66, p);
  const travel = smoothstep(0.43, 0.74, p) * TRAVEL_END;
  const stretch = lerp(lerp(3, 26, cruise), 0.38, settle);
  const lineAlpha = warpIn * (1 - smoothstep(0.82, 0.96, p));
  const laneAlpha = lineAlpha * (1 - smoothstep(0.68, 0.84, p));
  const dotAlpha = smoothstep(0.72, 0.9, p);
  const cx = width * 0.5;
  const cy = height * 0.46;

  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "oklch(0.07 0.028 264)");
  bg.addColorStop(0.5, "oklch(0.09 0.03 255)");
  bg.addColorStop(1, "oklch(0.06 0.028 280)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  if (fieldAlpha > 0.03) {
    const cam = approachCamera(zoom, time, reduced);
    const focal = Math.min(width, height) * 0.92;
    const seen = (q: { x: number; y: number } | null) =>
      !!q && q.x > -width && q.x < width * 2 && q.y > -height && q.y < height * 2;
    const flowTime = reduced ? 0 : time;

    ctx.globalCompositeOperation = "lighter";
    for (const mote of MOTES) {
      const u = mote.u + flowTime * mote.rate;
      const wrapped = u - Math.floor(u);
      const q = project(
        worldOf(mote.lane, wrapped, mote.lift),
        cam.pos,
        cam.frame,
        focal,
        width,
        height,
      );
      if (!q || q.k > 90 || q.x < -8 || q.y < -8 || q.x > width + 8 || q.y > height + 8) continue;
      const radius = Math.min(3.2, Math.max(0.6, mote.r * q.k));
      ctx.fillStyle = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},${0.45 * fieldAlpha})`;
      ctx.fillRect(q.x, q.y, radius, radius);
    }

    ctx.lineWidth = 1;
    for (let lane = 0; lane < LANES; lane++) {
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i <= 28; i++) {
        const q = project(worldOf(lane, i / 28), cam.pos, cam.frame, focal, width, height);
        if (!q || q.k > 110 || q.x < -160 || q.y < -160 || q.x > width + 160 || q.y > height + 160) {
          pen = false;
          continue;
        }
        if (!pen) {
          ctx.moveTo(q.x, q.y);
          pen = true;
        } else ctx.lineTo(q.x, q.y);
      }
      ctx.strokeStyle = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},${0.34 * fieldAlpha})`;
      ctx.stroke();
    }

    const trail = 0.02 * (1 - zoom * 0.85);
    ctx.beginPath();
    for (let lane = 0; lane < LANES; lane++) {
      for (const index of LANE_INDEX[lane]) {
        const star = STARS[index];
        if (star.onPath || (star.kind === 0 && index % 2 === 1)) continue;
        const rate = 0.05 + star.kind * 0.05 + star.rad * 0.2;
        const wrapped = star.u + flowTime * rate;
        const u = wrapped - Math.floor(wrapped);
        if (u < trail + 0.004) continue;
        const q = project(worldOf(lane, u), cam.pos, cam.frame, focal, width, height);
        const prev = project(worldOf(lane, u - trail), cam.pos, cam.frame, focal, width, height);
        if (!q || !prev || q.k > 90 || !seen(q)) continue;
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(q.x, q.y);
      }
    }
    ctx.strokeStyle = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},${0.45 * fieldAlpha})`;
    ctx.lineWidth = 1.15;
    ctx.stroke();

    for (let lane = 0; lane < LANES; lane++) {
      for (const index of LANE_INDEX[lane]) {
        const star = STARS[index];
        if (star.onPath || (star.kind === 0 && index % 2 === 1)) continue;
        const rate = 0.05 + star.kind * 0.05 + star.rad * 0.2;
        const wrapped = star.u + flowTime * rate;
        const u = wrapped - Math.floor(wrapped);
        const q = project(worldOf(lane, u), cam.pos, cam.frame, focal, width, height);
        if (!q || q.k > 90 || q.x < -20 || q.y < -20 || q.x > width + 20 || q.y > height + 20) continue;
        const pulse = reduced ? 1 : 0.78 + 0.22 * Math.sin(flowTime * (1.6 + star.rad) + lane + star.u * 40);
        const worldR = star.kind === 2 ? 0.04 : 0.026;
        const radius = Math.min(6.5, Math.max(0.7, worldR * q.k * pulse));
        const alpha = (0.42 + 0.28 * pulse) * fieldAlpha;
        ctx.fillStyle = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},${alpha})`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

  }

  if (threadAlpha > 0.03) {
    const cam = approachCamera(zoom, time, reduced);
    const focal = Math.min(width, height) * 0.92;
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    let pen = false;
    for (const node of PATH) {
      const q = project(worldOf(node.lane, node.u), cam.pos, cam.frame, focal, width, height);
        if (!q || q.x < -120 || q.y < -120 || q.x > width + 120 || q.y > height + 120) {
          pen = false;
          continue;
        }
        if (!pen) {
          ctx.moveTo(q.x, q.y);
          pen = true;
        } else ctx.lineTo(q.x, q.y);
      }
      ctx.strokeStyle = `rgba(${VIOLET[0]},${VIOLET[1]},${VIOLET[2]},${0.9 * threadAlpha})`;
      ctx.lineWidth = lerp(1.6, 2.4, zoom);
      ctx.stroke();

      for (let lane = 0; lane < LANES; lane++) {
        if (lane === CHOSEN) continue;
        const pathIndex = LANE_INDEX[lane].find((index) => STARS[index].onPath);
        if (pathIndex === undefined) continue;
        const star = STARS[pathIndex];
        const q = project(worldOf(lane, star.u), cam.pos, cam.frame, focal, width, height);
        if (!q || q.x < -20 || q.y < -20 || q.x > width + 20 || q.y > height + 20) continue;
        const radius = Math.min(10, Math.max(0.8, 0.038 * q.k));
        ctx.fillStyle = `rgba(${VIOLET[0]},${VIOLET[1]},${VIOLET[2]},${0.9 * threadAlpha})`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
  }

  if (holeFade > 0.02) {
    const cam = approachCamera(zoom, time, reduced);
    const focal = Math.min(width, height) * 0.92;
    const entry = project(worldOf(CHOSEN, TARGET_U), cam.pos, cam.frame, focal, width, height);
    if (entry) {
      const unit = Math.min(width, height);
      const dotR = Math.min(unit * 0.34, Math.max(3.5, 0.046 * entry.k));
      const engulf = smoothstep(0.82, 1, zoom) * smoothstep(0.4, 0.52, p);
      const radius = lerp(dotR, Math.hypot(width, height) * 1.35, engulf);
      const pupil = smoothstep(0.48, 0.9, zoom);
      const limb = (1 - engulf) * holeFade;
      ctx.globalCompositeOperation = "source-over";
      const body = ctx.createRadialGradient(entry.x, entry.y, 0, entry.x, entry.y, Math.max(radius, 4));
      body.addColorStop(0, `rgba(244, 236, 255, ${0.92 * limb})`);
      body.addColorStop(0.18, `rgba(214, 170, 255, ${0.72 * limb})`);
      body.addColorStop(0.42, `rgba(120, 70, 170, ${(0.28 + 0.2 * pupil) * limb})`);
      body.addColorStop(0.72, `rgba(40, 18, 64, ${0.16 * limb})`);
      body.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(entry.x, entry.y, Math.max(radius, 4), 0, Math.PI * 2);
      ctx.fill();
      if (pupil > 0.04) {
        const mouth = lerp(radius * 0.18, radius * 0.72, pupil);
        const core = ctx.createRadialGradient(entry.x, entry.y, 0, entry.x, entry.y, Math.max(mouth, 2));
        const ink = (0.18 + 0.32 * pupil) * holeFade;
        core.addColorStop(0, `rgba(4, 3, 12, ${ink})`);
        core.addColorStop(0.55, `rgba(10, 6, 22, ${ink * 0.55})`);
        core.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(entry.x, entry.y, Math.max(mouth, 2), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (horizon > 0.02) {
    ctx.globalCompositeOperation = "source-over";
    const band = ctx.createLinearGradient(0, height * 0.4, 0, height * 0.62);
    band.addColorStop(0, "rgba(0,0,0,0)");
    band.addColorStop(0.5, `rgba(170, 160, 210, ${0.14 * horizon})`);
    band.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, width, height);
  }

  const driftAmp = reduced ? 0 : settle * 7;
  const stride = width < 760 ? 4 : 2;

  if (laneAlpha > 0.03) {
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "butt";
    ctx.beginPath();
    for (let i = 0; i < STARS.length; i++) {
      const star = STARS[i];
      if (star.dust || i % stride !== 0) continue;
      const wpt = warpPoint(star, travel, stretch, width, height, cx, cy);
      if (wpt.x < -80 && wpt.px < -80) continue;
      if (wpt.y < -80 && wpt.py < -80) continue;
      if (wpt.x > width + 80 && wpt.px > width + 80) continue;
      if (wpt.y > height + 80 && wpt.py > height + 80) continue;
      const dx = wpt.x - wpt.px;
      const dy = wpt.y - wpt.py;
      if (dx * dx + dy * dy < 1.4) continue;
      ctx.moveTo(wpt.px, wpt.py);
      ctx.lineTo(wpt.x, wpt.y);
    }
    ctx.strokeStyle = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},${0.55 * laneAlpha})`;
    ctx.lineWidth = 1.25;
    ctx.stroke();
  }

  if (lineAlpha > 0.03) {
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "butt";
    ctx.beginPath();
    for (const i of DUST_INDEX) {
      const star = STARS[i];
      const wpt = warpPoint(star, travel, stretch, width, height, cx, cy);
      const dx = Math.sin(time * 0.18 + star.ang) * driftAmp;
      const dy = Math.cos(time * 0.13 + star.ang) * driftAmp;
      const x = wpt.x + dx;
      const y = wpt.y + dy;
      const px = wpt.px + dx;
      const py = wpt.py + dy;
      if (x < -80 && px < -80) continue;
      if (y < -80 && py < -80) continue;
      if (x > width + 80 && px > width + 80) continue;
      if (y > height + 80 && py > height + 80) continue;
      const sx = x - px;
      const sy = y - py;
      if (sx * sx + sy * sy < 1.4) continue;
      ctx.moveTo(px, py);
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},${0.9 * lineAlpha})`;
    ctx.lineWidth = 1.25;
    ctx.stroke();
  }

  if (dotAlpha > 0.02 || bloom > 0.02) {
    const scale = bodyScale(width);
    const narrow = width < 760;
    if (dotAlpha > 0.02) {
      // Additive so pinpricks read as stars instead of soft grey discs.
      ctx.globalCompositeOperation = "lighter";
      for (const i of DUST_INDEX) {
        if (GALAXY_SET.has(i) || ORB_SET.has(i)) continue;
        const star = STARS[i];
        const wpt = warpPoint(star, travel, stretch, width, height, cx, cy);
        const x = wpt.x + Math.sin(time * 0.18 + star.ang) * driftAmp;
        const y = wpt.y + Math.cos(time * 0.13 + star.ang) * driftAmp;
        if (x < -8 || y < -8 || x > width + 8 || y > height + 8) continue;
        const apparent = star.rad / flightZ(star.z, travel);
        const near = Math.min(1, apparent / 0.0022);
        // Narrow frames: keep dots as pinpricks; desktop stays slightly larger.
        const core = narrow
          ? 0.22 + near * 0.55
          : 0.35 + near * 0.95;
        const halo = narrow
          ? 0.55 + near * 1.1
          : 0.7 + near * 1.55;
        const fade = lerp(0.7, 1, dotAlpha);
        const warm = hash(i * 21) > 0.84;
        const targetR = warm ? 255 : 248;
        const targetG = warm ? 228 : 246;
        const targetB = warm ? 190 : 255;
        const r = Math.round(CYAN[0] + (targetR - CYAN[0]) * bloom);
        const g = Math.round(CYAN[1] + (targetG - CYAN[1]) * bloom);
        const b = Math.round(CYAN[2] + (targetB - CYAN[2]) * bloom);
        const bright = (0.55 + 0.45 * bloom) * dotAlpha;
        ctx.fillStyle = `rgba(${r},${g},${b},${0.38 * bright})`;
        ctx.beginPath();
        ctx.arc(x, y, halo * fade, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${0.95 * bright})`;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.35, core * fade), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalCompositeOperation = "source-over";
    for (let n = 0; n < ORB_AT.length; n++) {
      const star = STARS[ORB_AT[n]];
      const orb = ORBS[n];
      const wpt = warpPoint(star, travel, stretch, width, height, cx, cy);
      const ox = wpt.x + Math.sin(time * 0.18 + star.ang) * driftAmp;
      const oy = wpt.y + Math.cos(time * 0.13 + star.ang) * driftAmp;
      const radius = lerp(2.4, orb.r * scale, bloom);
      const body = ctx.createRadialGradient(ox - radius * 0.3, oy - radius * 0.3, radius * 0.08, ox, oy, radius);
      body.addColorStop(0, `rgba(244, 240, 255, ${0.95 * Math.max(dotAlpha, bloom)})`);
      body.addColorStop(0.45, `rgba(170, 190, 220, ${0.55 * bloom})`);
      body.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(ox, oy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let n = 0; n < GALAXY_AT.length; n++) {
      const star = STARS[GALAXY_AT[n]];
      const galaxy = GALAXIES[n];
      const wpt = warpPoint(star, travel, stretch, width, height, cx, cy);
      const gx = wpt.x + Math.sin(time * 0.18 + star.ang) * driftAmp;
      const gy = wpt.y + Math.cos(time * 0.13 + star.ang) * driftAmp;
      const rx = lerp(4, galaxy.rx * scale, bloom);
      const ry = lerp(4, galaxy.ry * scale, bloom);
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(galaxy.rot);
      ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, `rgba(248, 242, 255, ${0.92 * Math.max(dotAlpha, bloom)})`);
      g.addColorStop(0.16, `rgba(190, 150, 245, ${0.62 * bloom})`);
      g.addColorStop(0.42, `rgba(120, 160, 200, ${0.28 * bloom})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (bloom > 0.45) {
        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(galaxy.rot);
        ctx.strokeStyle = `rgba(210, 190, 255, ${0.28 * bloom})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx * 0.62, ry * 0.7, 0.4, 0.2, 2.4);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  ctx.globalCompositeOperation = "source-over";
  // Softer vignette on narrow frames so edge stars stay visible after the spread boost.
  const vigStrength = width < 760 ? 0.28 : 0.42;
  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    Math.min(width, height) * 0.18,
    width * 0.5,
    height * 0.5,
    Math.hypot(width, height) * 0.55,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, `rgba(6,8,18,${vigStrength})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

type Props = {
  progressRef: RefObject<number>;
  reducedRef: RefObject<boolean>;
};

export const LandingField = memo(function LandingField({ progressRef, reducedRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let alive = true;
    let visible = true;
    const started = performance.now();
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    observer.observe(canvas);

    let raf = 0;
    const loop = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { cssW, cssH, dpr } = fit(canvas);
      if (cssW < 2 || cssH < 2) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, cssW, cssH, progressRef.current ?? 0, (now - started) / 1000, reducedRef.current ?? false);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [progressRef, reducedRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      data-testid="landing-field"
      aria-hidden
    />
  );
});
