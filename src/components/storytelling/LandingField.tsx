"use client";

import { memo, useEffect, useRef, type RefObject } from "react";

/**
 * Three acts of one flight.
 *
 * 1. Top-down. Record lanes run horizontal, a little tight, and the points drift.
 *    One vertical thread ties a single dot on each lane to the next, stepping
 *    sideways at random.
 * 2. The camera pitches along that thread, the other points fade, and the line
 *    disappears as one dot opens into a soft hole. Warp leaves from that same
 *    center: screen = center + worldXY * focal / z.
 * 3. The streaks ease off into a new horizon of stars and galaxies.
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

type Body = { x: number; y: number; r: number; warm: number };
const SLOW_STARS: Body[] = Array.from({ length: 70 }, (_, i) => ({
  x: hash(i * 9 + 4),
  y: hash(i * 11 + 6),
  r: 0.7 + hash(i * 13) * (hash(i * 15) > 0.86 ? 2.4 : 1.3),
  warm: hash(i * 21),
}));

const GALAXIES = [
  { x: 0.78, y: 0.34, rx: 150, ry: 52, rot: -0.45 },
  { x: 0.18, y: 0.58, rx: 120, ry: 40, rot: 0.7 },
  { x: 0.62, y: 0.18, rx: 86, ry: 28, rot: 0.15 },
  { x: 0.4, y: 0.78, rx: 100, ry: 34, rot: -1.1 },
];

const ORBS = [
  { x: 0.84, y: 0.72, r: 28 },
  { x: 0.27, y: 0.28, r: 18 },
];

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
  const unit = Math.min(width, height);
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
  const commit = smoothstep(0.48, 1, zoom);
  const pitch = lerp(1.46, lerp(0.34, 0.04, commit), zoom);
  const dist = lerp(13.6, lerp(2.4, 0.12, commit), Math.pow(zoom, 0.75));
  const close = smoothstep(0.3, 1, zoom);
  const horiz = Math.cos(pitch) * dist;
  const idle = reduced ? 0 : (1 - zoom) * (1 - zoom) * (1 - commit);
  const sway = Math.sin(Math.PI * zoom) * 0.2 * (1 - commit);
  const pos = {
    x: entry.x + sway + Math.sin(time * 0.22 + 1.3) * 0.2 * idle,
    y: lerp(Math.sin(pitch) * dist, lerp(0.85, 0.015, commit), close),
    z: entry.z - lerp(horiz, lerp(2.1, 0.12, commit), close) + Math.sin(time * 0.35) * 0.35 * idle,
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
  const zoom = smoothstep(0.12, 0.52, p);
  const warpIn = smoothstep(0.46, 0.66, p);
  const cruise = smoothstep(0.46, 0.7, p);
  const brake = smoothstep(0.66, 0.88, p);
  const horizon = smoothstep(0.72, 0.94, p);
  const fieldAlpha = (1 - smoothstep(0.18, 0.5, zoom)) * (1 - smoothstep(0.48, 0.6, p));
  const threadAlpha = (1 - smoothstep(0.52, 0.8, zoom)) * (1 - smoothstep(0.46, 0.58, p));
  const holeT = smoothstep(0.34, 1, zoom);
  const holeFade = 1 - smoothstep(0.5, 0.7, p);
  const travel = smoothstep(0.46, 0.74, p) * 220;
  const stretch = lerp(3, 26, cruise) * (1 - brake);
  const warpAlpha = warpIn * (1 - smoothstep(0.74, 0.94, p));
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
      const mouth = Math.pow(holeT, 1.15);
      const reach = lerp(8, Math.hypot(width, height) * 1.65, mouth);
      const radius = Math.max(reach, Math.min(Math.hypot(width, height) * 1.7, 0.08 * entry.k));
      ctx.globalCompositeOperation = "source-over";
      const soft = ctx.createRadialGradient(entry.x, entry.y, 0, entry.x, entry.y, radius);
      const dark = 0.2 + holeT * 0.75;
      soft.addColorStop(0, `rgba(2, 3, 10, ${dark * holeFade})`);
      soft.addColorStop(0.22, `rgba(6, 5, 16, ${(0.45 + holeT * 0.4) * holeFade})`);
      soft.addColorStop(0.5, `rgba(40, 24, 70, ${0.12 * (1 - mouth * 0.85) * holeFade})`);
      soft.addColorStop(0.78, `rgba(90, 140, 170, ${0.04 * (1 - mouth) * holeFade})`);
      soft.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = soft;
      ctx.beginPath();
      ctx.arc(entry.x, entry.y, radius, 0, Math.PI * 2);
      ctx.fill();
      if (holeT < 0.72) {
        const seed = lerp(3.2, 18, holeT);
        const glow = ctx.createRadialGradient(entry.x, entry.y, 0, entry.x, entry.y, seed * 2.4);
        const seedA = (1 - holeT) * holeFade;
        glow.addColorStop(0, `rgba(244, 232, 255, ${0.95 * seedA})`);
        glow.addColorStop(0.45, `rgba(190, 150, 255, ${0.45 * seedA})`);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(entry.x, entry.y, seed * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (warpAlpha > 0.03 && stretch > 0.8) {
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "butt";
    const stride = width < 760 ? 4 : 2;
    ctx.beginPath();
    for (let i = 0; i < STARS.length; i++) {
      const star = STARS[i];
      if (!star.dust && i % stride !== 0) continue;
      const wpt = warpPoint(star, travel, stretch, width, height, cx, cy);
      if (wpt.x < -60 && wpt.px < -60) continue;
      if (wpt.y < -60 && wpt.py < -60) continue;
      if (wpt.x > width + 60 && wpt.px > width + 60) continue;
      if (wpt.y > height + 60 && wpt.py > height + 60) continue;
      ctx.moveTo(wpt.px, wpt.py);
      ctx.lineTo(wpt.x, wpt.y);
    }
    ctx.strokeStyle = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},${0.75 * warpAlpha})`;
    ctx.lineWidth = 1.25;
    ctx.stroke();
  }

  if (horizon > 0.02) {
    ctx.globalCompositeOperation = "source-over";
    const band = ctx.createLinearGradient(0, height * 0.4, 0, height * 0.62);
    band.addColorStop(0, "rgba(0,0,0,0)");
    band.addColorStop(0.5, `rgba(170, 160, 210, ${0.14 * horizon})`);
    band.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, width, height);

    const drift = reduced ? 0 : time * 0.012;
    for (const galaxy of GALAXIES) {
      const gx = galaxy.x * width + Math.sin(drift + galaxy.rot) * 6;
      const gy = galaxy.y * height + Math.cos(drift * 0.7 + galaxy.x) * 4;
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(galaxy.rot);
      ctx.scale(1, galaxy.ry / galaxy.rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, galaxy.rx);
      g.addColorStop(0, `rgba(236, 228, 255, ${0.55 * horizon})`);
      g.addColorStop(0.22, `rgba(170, 140, 230, ${0.28 * horizon})`);
      g.addColorStop(0.55, `rgba(90, 140, 170, ${0.1 * horizon})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, galaxy.rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(galaxy.rot);
      ctx.strokeStyle = `rgba(210, 190, 255, ${0.22 * horizon})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, galaxy.rx * 0.62, galaxy.ry * 0.7, 0.4, 0.2, 2.4);
      ctx.stroke();
      ctx.restore();
    }

    for (const orb of ORBS) {
      const ox = orb.x * width;
      const oy = orb.y * height;
      const body = ctx.createRadialGradient(ox - orb.r * 0.3, oy - orb.r * 0.3, orb.r * 0.1, ox, oy, orb.r);
      body.addColorStop(0, `rgba(230, 236, 245, ${0.7 * horizon})`);
      body.addColorStop(0.55, `rgba(140, 160, 190, ${0.35 * horizon})`);
      body.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(ox, oy, orb.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const star of SLOW_STARS) {
      const x = star.x * width + Math.sin(drift * 0.6 + star.y * 12) * 5;
      const y = star.y * height + Math.cos(drift * 0.4 + star.x * 9) * 3;
      const warm = star.warm > 0.72;
      const rgb = warm ? [255, 214, 170] : star.warm > 0.4 ? CYAN : [230, 230, 245];
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.75 * horizon})`;
      ctx.beginPath();
      ctx.arc(x, y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalCompositeOperation = "source-over";
  const vignette = ctx.createRadialGradient(width * 0.5, height * 0.5, width * 0.12, width * 0.5, height * 0.5, width * 0.75);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(6,8,18,0.42)");
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
