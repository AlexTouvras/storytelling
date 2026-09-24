"use client";

import { memo, useEffect, useRef, type RefObject } from "react";

/**
 * One field of records, two projections.
 *
 * Opening: horizontal streams. Near lanes sit lower and brighter; a violet
 * path picks one record on each stream.
 *
 * Then the same records are flown through with the standard starfield
 * projection: screen = center + worldXY * focal / z. Far z stays small and
 * near the center. Near z rushes to the edges. The streak is the line from
 * the previous (larger) z to the current z, so stars pass from the front of
 * the view to behind the camera.
 */

type Star = {
  lane: number;
  u: number;
  kind: 0 | 1 | 2;
  onPath: boolean;
  /** Depth seed along a stream, before the idle dolly. */
  laneZ: number;
  /** Angle around the flight axis. */
  ang: number;
  /** Radius in units of the short viewport side. */
  rad: number;
  /** 0–1 depth seed for the fly-through. */
  z: number;
  /** Tunnel fill. Drawn only once the flight has started. */
  dust: boolean;
};

const CYAN: [number, number, number] = [126, 224, 234];
const VIOLET: [number, number, number] = [214, 160, 255];
const LANES = 18;
const SAMPLES = 120;
const DEPTH = 12;
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

/** One bow through the stack: a route chosen between the streams, not a slash. */
function pathU(lane: number) {
  const t = lane / (LANES - 1);
  return 0.42 + Math.sin(t * Math.PI) * 0.22;
}

function buildStars(): Star[] {
  const stars: Star[] = [];
  for (let lane = 0; lane < LANES; lane++) {
    const chosen = pathU(lane);
    const signalLane = lane % 5 === 2;
    for (let i = 0; i < SAMPLES; i++) {
      const n = hash(lane * 97 + i * 13);
      const u = i / (SAMPLES - 1);
      if (Math.abs(u - chosen) < 0.012) continue;
      const kind: 0 | 1 | 2 = signalLane && n > 0.82 ? 2 : i % 9 === 0 ? 1 : 0;
      stars.push({
        lane,
        u,
        kind,
        onPath: false,
        laneZ: (lane / LANES) * DEPTH + 0.15,
        ang: (lane / LANES) * Math.PI * 2 + (u - 0.5) * 0.22,
        rad: 0.05 + Math.abs(u - chosen) * 0.16 + (n - 0.5) * 0.012,
        z: hash(lane * 17 + i * 31),
        dust: false,
      });
    }
    stars.push({
      lane,
      u: chosen,
      kind: 2,
      onPath: true,
      laneZ: (lane / LANES) * DEPTH + 0.15,
      ang: (lane / LANES) * Math.PI * 2,
      rad: 0.032,
      z: 0.35 + hash(lane * 19) * 0.3,
      dust: false,
    });
  }
  for (let i = 0; i < 520; i++) {
    const a = hash(i * 3 + 1);
    const b = hash(i * 3 + 2);
    const c = hash(i * 3 + 3);
    stars.push({
      lane: -1,
      u: a,
      kind: 0,
      onPath: false,
      laneZ: 0,
      ang: a * Math.PI * 2,
      rad: 0.028 + Math.pow(b, 0.55) * 0.2,
      z: c,
      dust: true,
    });
  }
  return stars;
}

const STARS = buildStars();
const LANE_INDEX: number[][] = Array.from({ length: LANES }, () => []);
STARS.forEach((star, i) => {
  if (star.lane >= 0) LANE_INDEX[star.lane].push(i);
});
for (const lane of LANE_INDEX) lane.sort((a, b) => STARS[a].u - STARS[b].u);

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

function wrapDepth(z: number, dolly: number) {
  let d = z - dolly;
  d = ((d % DEPTH) + DEPTH) % DEPTH;
  return 0.35 + d;
}

function streamPoint(u: number, depth: number, width: number, height: number) {
  const near = 1 - Math.min(1, (depth - 0.35) / DEPTH);
  const spread = 0.86 + near * 0.22;
  const x = width * 0.5 + (u - 0.5) * width * spread;
  let y = height * (0.05 + near * 0.78);
  y -= Math.sin(Math.min(1, Math.max(0, u)) * Math.PI) * height * 0.012 * (0.4 + near);
  return { x, y, near };
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

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  time: number,
  reduced: boolean,
) {
  const p = reduced ? 0 : progress;
  const focus = smoothstep(0.1, 0.28, p);
  const depart = smoothstep(0.3, 0.48, p);
  const fly = smoothstep(0.28, 0.46, p);
  const travel = smoothstep(0.34, 1, p) * 280;
  const stretch = lerp(6, 22, smoothstep(0.4, 0.82, p));
  const dolly = reduced ? 0 : time * 0.045 * (1 - fly);
  const cx = width * lerp(0.5, 0.63, fly);
  const cy = height * lerp(0.42, 0.48, fly);

  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "oklch(0.07 0.028 264)");
  bg.addColorStop(0.45, "oklch(0.1 0.032 250)");
  bg.addColorStop(1, "oklch(0.07 0.03 280)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const glowA = 0.05 + fly * 0.08;
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(width, height) * 0.42);
  core.addColorStop(0, `rgba(186, 150, 255, ${glowA})`);
  core.addColorStop(0.35, `rgba(110, 210, 226, ${glowA * 0.28})`);
  core.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, width, height);

  const laneDepth = new Float32Array(LANES);
  for (let lane = 0; lane < LANES; lane++) {
    laneDepth[lane] = wrapDepth((lane / LANES) * DEPTH + 0.15, dolly);
  }
  const laneOrder = Array.from({ length: LANES }, (_, i) => i).sort(
    (a, b) => laneDepth[b] - laneDepth[a],
  );

  const streamAlpha = 1 - depart;
  if (streamAlpha > 0.03) {
    ctx.globalCompositeOperation = "lighter";
    const spread = 1 + depart * 0.7;
    const place = (u: number, depth: number) => {
      const s = streamPoint(u, depth, width, height);
      return {
        x: cx + (s.x - cx) * spread,
        y: cy + (s.y - cy) * spread,
        near: s.near,
      };
    };

    for (const lane of laneOrder) {
      const depth = laneDepth[lane];
      const idxs = LANE_INDEX[lane];
      const first = place(STARS[idxs[0]].u, depth);
      const alphaBase = (0.22 + first.near * 0.78) * streamAlpha;
      ctx.beginPath();
      idxs.forEach((index, n) => {
        const s = place(STARS[index].u, depth);
        if (n === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      });
      ctx.strokeStyle = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},${alphaBase * 0.45})`;
      ctx.lineWidth = 1 + first.near * 1.5;
      ctx.stroke();

      for (const index of idxs) {
        const star = STARS[index];
        const s = place(star.u, depth);
        if (s.x < -12 || s.x > width + 12 || s.y < -12 || s.y > height + 12) continue;
        const dist = Math.abs(star.u - pathU(lane));
        const emph = Math.exp(-dist * dist * (20 + focus * 80));
        const dim = lerp(1, 0.3 + emph * 0.7, focus);
        const signal = star.onPath || star.kind === 2;
        const rgb = signal ? VIOLET : CYAN;
        const alpha =
          (signal ? 0.7 + s.near * 0.3 : 0.4 + s.near * (star.kind === 1 ? 0.55 : 0.4)) *
          streamAlpha *
          dim;
        const radius = Math.max(0.8, (signal ? 2.8 : star.kind === 1 ? 1.9 : 1.35) * (0.55 + s.near));
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.beginPath();
    const nodes: { x: number; y: number; near: number }[] = [];
    laneOrder
      .slice()
      .sort((a, b) => laneDepth[a] - laneDepth[b])
      .forEach((lane) => {
        const node = place(pathU(lane), laneDepth[lane]);
        nodes.push(node);
      });
    nodes.forEach((node, n) => {
      if (n === 0) ctx.moveTo(node.x, node.y);
      else ctx.lineTo(node.x, node.y);
    });
    ctx.strokeStyle = `rgba(220, 176, 255, ${(0.55 + focus * 0.4) * streamAlpha})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    for (const node of nodes) {
      ctx.fillStyle = `rgba(236, 214, 255, ${(0.7 + node.near * 0.3) * streamAlpha})`;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 2 + node.near * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (fly > 0.02) {
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "butt";
    const stride = width < 760 ? 4 : 2;
    ctx.beginPath();
    for (let i = 0; i < STARS.length; i++) {
      const star = STARS[i];
      if (star.onPath) continue;
      if (!star.dust && i % stride !== 0) continue;
      const wpt = warpPoint(star, travel, stretch, width, height, cx, cy);
      if (wpt.x < -60 && wpt.px < -60) continue;
      if (wpt.y < -60 && wpt.py < -60) continue;
      if (wpt.x > width + 60 && wpt.px > width + 60) continue;
      if (wpt.y > height + 60 && wpt.py > height + 60) continue;
      ctx.moveTo(wpt.px, wpt.py);
      ctx.lineTo(wpt.x, wpt.y);
    }
    ctx.strokeStyle = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},${0.72 * fly})`;
    ctx.lineWidth = 1.25;
    ctx.stroke();

    ctx.beginPath();
    for (const star of STARS) {
      if (!star.onPath) continue;
      const wpt = warpPoint(star, travel, stretch * 0.75, width, height, cx, cy);
      ctx.moveTo(wpt.px, wpt.py);
      ctx.lineTo(wpt.x, wpt.y);
    }
    ctx.strokeStyle = `rgba(${VIOLET[0]},${VIOLET[1]},${VIOLET[2]},${0.9 * fly})`;
    ctx.lineWidth = 1.7;
    ctx.stroke();
  }

  ctx.globalCompositeOperation = "source-over";
  const vignette = ctx.createRadialGradient(cx, height * 0.48, width * 0.1, cx, height * 0.5, width * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(6,8,18,0.45)");
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
