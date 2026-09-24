"use client";

import { memo, useEffect, useRef, type RefObject } from "react";

/**
 * Signal convergence. The same seeded records start as horizontal streams,
 * bend toward a selected chain, and become a stellar vortex as scroll progresses.
 * Progress is owned by the landing; this canvas only paints.
 */

type Rec = {
  lane: number;
  /** 0–1 along the stream */
  u: number;
  kind: 0 | 1 | 2;
};

const CYAN: [number, number, number] = [132, 214, 224];
const VIOLET: [number, number, number] = [198, 146, 255];
const LANES = 14;
const SAMPLES = 88;

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

function chainU(lane: number) {
  return 0.46 + Math.sin(lane * 0.72 + 0.4) * 0.14;
}

function buildRecords(): Rec[] {
  const pts: Rec[] = [];
  for (let lane = 0; lane < LANES; lane++) {
    for (let i = 0; i < SAMPLES; i++) {
      const n = hash(lane * 97 + i * 13);
      const u = i / (SAMPLES - 1);
      const onChain = Math.abs(u - chainU(lane)) < 0.018;
      const kind: 0 | 1 | 2 = onChain ? 2 : n > 0.94 ? 1 : 0;
      pts.push({ lane, u, kind });
    }
  }
  return pts;
}

const RECORDS = buildRecords();
const BY_LANE: number[][] = Array.from({ length: LANES }, () => []);
RECORDS.forEach((rec, i) => BY_LANE[rec.lane].push(i));

function fit(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { cssW: rect.width, cssH: rect.height, dpr };
}

type Weights = {
  focus: number;
  bend: number;
  vortex: number;
  arrive: number;
};

function weightsFor(progress: number): Weights {
  return {
    focus: smoothstep(0.12, 0.34, progress),
    bend: smoothstep(0.3, 0.58, progress),
    vortex: smoothstep(0.52, 0.8, progress),
    arrive: smoothstep(0.78, 1, progress),
  };
}

function project(
  lane: number,
  u: number,
  width: number,
  height: number,
  wts: Weights,
  spin: number,
) {
  const axisX = width * 0.5;
  const axisY = height * lerp(0.4, 0.34, wts.vortex);
  const laneT = lane / (LANES - 1);
  const fieldX = width * (0.05 + u * 0.9);
  const fieldY =
    height * (0.1 + laneT * 0.58) - Math.sin(u * Math.PI) * height * 0.012;

  const pulledX = lerp(fieldX, axisX, wts.bend * 0.42);
  const pulledY = lerp(fieldY, axisY + (fieldY - axisY) * 0.45, wts.bend * 0.55);

  const theta = laneT * Math.PI * 2 + u * Math.PI * 1.65 + spin;
  const z = 0.38 + (1 - u) * 1.15;
  const persp = 1.15 / z;
  const radius = Math.min(width, height) * (0.04 + u * 0.78);
  const vx = axisX + Math.cos(theta) * radius * (0.34 + persp * 0.34);
  const vy = axisY + Math.sin(theta) * radius * (0.34 + persp * 0.34) * 0.78;

  const x = lerp(pulledX, vx, wts.vortex);
  const y = lerp(pulledY, vy, wts.vortex);
  const near = lerp(0.45 + (1 - laneT) * 0.2, Math.min(1, persp * 0.55), wts.vortex);
  return { x, y, near, axisX, axisY };
}

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  time: number,
  reduced: boolean,
) {
  const wts = weightsFor(progress);
  const drift = reduced ? 0 : time * 0.012;
  const spin = (reduced ? progress * 0.4 : progress * 1.15) * Math.PI;

  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "oklch(0.07 0.026 264)");
  bg.addColorStop(0.5, "oklch(0.1 0.03 250)");
  bg.addColorStop(1, "oklch(0.07 0.028 276)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const glowStrength = (0.08 + wts.vortex * 0.22) * (1 - wts.arrive * 0.75);
  const glow = ctx.createRadialGradient(
    width * 0.5,
    height * 0.38,
    0,
    width * 0.5,
    height * 0.38,
    width * 0.42,
  );
  glow.addColorStop(0, `rgba(186,150,255,${glowStrength})`);
  glow.addColorStop(0.45, `rgba(120,200,220,${glowStrength * 0.35})`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = "lighter";

  const settle = 1 - wts.arrive * 0.88;

  for (let lane = 0; lane < LANES; lane++) {
    const idxs = BY_LANE[lane];
    const strokeAlpha = (0.22 - wts.focus * 0.1) * (1 - wts.vortex * 0.85) * settle;
    if (strokeAlpha > 0.02) {
      ctx.beginPath();
      idxs.forEach((i, n) => {
        const rec = RECORDS[i];
        const u = (rec.u + drift * (1 - wts.vortex)) % 1;
        const p = project(lane, u, width, height, wts, spin);
        if (n === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},${strokeAlpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (const i of idxs) {
      const rec = RECORDS[i];
      const u = (rec.u + drift * (1 - wts.vortex)) % 1;
      const p = project(lane, u, width, height, wts, spin);
      if (p.x < -12 || p.y < -12 || p.x > width + 12 || p.y > height + 12) continue;
      const dist = Math.abs(u - chainU(lane));
      const emphasis = Math.exp(-dist * dist * 90);
      const dim = 1 - wts.focus * (1 - wts.vortex) * 0.78 * (1 - emphasis);
      const signal = rec.kind === 2 || emphasis > 0.65;
      const rgb = signal ? VIOLET : CYAN;
      const arm = lerp(0.2 + p.near * 0.34, 0.32 + p.near * 0.5, wts.vortex);
      const alpha = (signal ? 0.62 + emphasis * 0.3 : arm) * dim * settle;
      if (alpha < 0.015) continue;
      const radius = (signal ? 1.8 + emphasis * 1.6 : 0.7 + (rec.kind === 1 ? 0.55 : 0.2)) * (0.65 + p.near * 0.7);
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.beginPath();
  const nodes: { x: number; y: number }[] = [];
  for (let lane = 0; lane < LANES; lane++) {
    const p = project(lane, chainU(lane), width, height, wts, spin);
    nodes.push(p);
    if (lane === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  const chainAlpha = (0.45 + wts.focus * 0.45) * settle;
  ctx.strokeStyle = `rgba(214,176,255,${chainAlpha})`;
  ctx.lineWidth = 1.35;
  ctx.stroke();
  for (const node of nodes) {
    ctx.fillStyle = `rgba(236,214,255,${(0.55 + wts.vortex * 0.35) * settle})`;
    ctx.beginPath();
    ctx.arc(node.x, node.y, 2.1 + wts.vortex * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "source-over";

  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.4,
    width * 0.08,
    width * 0.5,
    height * 0.46,
    width * 0.72,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.72, "rgba(6,8,18,0.04)");
  vignette.addColorStop(1, "rgba(6,8,18,0.62)");
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
      draw(
        ctx,
        cssW,
        cssH,
        progressRef.current ?? 0,
        (now - started) / 1000,
        reducedRef.current ?? false,
      );
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
