"use client";

import { memo, useEffect, useRef, type RefObject } from "react";

type Pt = {
  /** 0–1 across a record */
  x: number;
  /** depth along the stack, before the dolly */
  z: number;
  /** 0 quiet, 1 tick, 2 signal */
  kind: 0 | 1 | 2;
  lane: number;
};

const CYAN: [number, number, number] = [126, 224, 234];
const VIOLET: [number, number, number] = [206, 140, 255];
const DEPTH = 12;
const LANES = 18;
const SAMPLES = 140;

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function buildVolume(): Pt[] {
  const pts: Pt[] = [];
  for (let lane = 0; lane < LANES; lane++) {
    const signalLane = lane % 5 === 2;
    for (let i = 0; i < SAMPLES; i++) {
      const n = hash(lane * 97 + i * 13);
      const kind: 0 | 1 | 2 = signalLane && n > 0.82 ? 2 : i % 9 === 0 ? 1 : 0;
      pts.push({
        x: i / (SAMPLES - 1) + (n - 0.5) * 0.004,
        z: (lane / LANES) * DEPTH + 0.15,
        kind,
        lane,
      });
    }
  }
  return pts;
}

const VOLUME = buildVolume();
const LANE_INDEX: number[][] = Array.from({ length: LANES }, () => []);
VOLUME.forEach((pt, i) => LANE_INDEX[pt.lane].push(i));

const DUST = Array.from({ length: 420 }, (_, i) => ({
  x: hash(i * 3 + 1),
  y: hash(i * 3 + 2),
  z: hash(i * 3 + 3) * DEPTH,
}));

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

function wrapDepth(z: number, dolly: number) {
  let d = z - dolly;
  d = ((d % DEPTH) + DEPTH) % DEPTH;
  return 0.35 + d;
}

function place(
  x01: number,
  depth: number,
  width: number,
  height: number,
  collapse: number,
) {
  const near = 1 - Math.min(1, (depth - 0.35) / DEPTH);
  const spread = 0.86 + near * 0.22;
  let x = width * 0.5 + (x01 - 0.5) * width * spread;
  let y = height * (0.05 + near * 0.78);
  y -= Math.sin(Math.min(1, Math.max(0, x01)) * Math.PI) * height * 0.012 * (0.4 + near);
  if (collapse > 0) {
    x += (width * 0.5 - x) * collapse * 0.2;
    y += (height * 1.06 - y) * collapse;
  }
  return { x, y, near };
}

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  time: number,
  reduced: boolean,
) {
  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "oklch(0.07 0.028 264)");
  bg.addColorStop(0.45, "oklch(0.11 0.034 245)");
  bg.addColorStop(1, "oklch(0.075 0.03 280)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const core = ctx.createRadialGradient(
    width * 0.5,
    height * 0.22,
    0,
    width * 0.5,
    height * 0.28,
    width * 0.55,
  );
  core.addColorStop(0, "rgba(120,210,230,0.16)");
  core.addColorStop(0.45, "rgba(170,110,255,0.05)");
  core.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, width, height);

  const idle = reduced ? 0 : time * 0.08;
  const dolly = progress * progress * 6.4 + idle;
  const collapse = smoothstep(0.48, 1, progress);

  const laneDepth = new Float32Array(LANES);
  for (let lane = 0; lane < LANES; lane++) {
    laneDepth[lane] = wrapDepth((lane / LANES) * DEPTH + 0.15, dolly);
  }
  const laneOrder = Array.from({ length: LANES }, (_, i) => i).sort(
    (a, b) => laneDepth[b] - laneDepth[a],
  );

  ctx.globalCompositeOperation = "lighter";

  for (const speck of DUST) {
    const depth = wrapDepth(speck.z, dolly);
    const p = place(speck.x, depth, width, height, collapse);
    const y = p.y + (speck.y - 0.5) * 22;
    if (p.x < 0 || p.x > width || y < 0 || y > height) continue;
    const alpha = (0.04 + p.near * 0.16) * (1 - collapse);
    ctx.fillStyle = `rgba(150,220,232,${alpha})`;
    ctx.fillRect(p.x, y, 1.2, 1.2);
  }

  for (const lane of laneOrder) {
    const depth = laneDepth[lane];
    const idxs = LANE_INDEX[lane];
    const first = place(VOLUME[idxs[0]].x, depth, width, height, collapse);
    const alphaBase = (0.16 + first.near * 0.84) * (1 - collapse);

    ctx.beginPath();
    idxs.forEach((i, n) => {
      const p = place(VOLUME[i].x, depth, width, height, collapse);
      if (n === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = `rgba(126,224,234,${alphaBase * 0.35})`;
    ctx.lineWidth = 1 + first.near * 1.4;
    ctx.stroke();

    for (const i of idxs) {
      const dot = VOLUME[i];
      const p = place(dot.x, depth, width, height, collapse);
      if (p.x < -8 || p.x > width + 8 || p.y < -8 || p.y > height + 8) continue;
      const signal = dot.kind === 2;
      const rgb = signal ? VIOLET : CYAN;
      const alpha =
        (signal ? 0.55 + p.near * 0.45 : 0.28 + p.near * (dot.kind === 1 ? 0.7 : 0.5)) *
        (1 - collapse);
      const radius = Math.max(0.7, (signal ? 2.7 : dot.kind === 1 ? 1.8 : 1.25) * (0.45 + p.near));

      if (!reduced && progress > 0.08 && p.near > 0.35 && dot.kind > 0) {
        ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.4})`;
        ctx.lineWidth = radius * 0.6;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y + (8 + progress * 36) * p.near);
        ctx.stroke();
      }

      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const insight = laneOrder
    .slice()
    .sort((a, b) => laneDepth[a] - laneDepth[b])
    .map((lane) => {
      const x01 = 0.5 + Math.sin(lane * 0.9 + dolly * 0.35) * 0.12;
      return place(x01, laneDepth[lane], width, height, collapse);
    });
  ctx.beginPath();
  insight.forEach((p, n) => {
    if (n === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.strokeStyle = `rgba(214,160,255,${(0.28 + progress * 0.4) * (1 - collapse)})`;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  for (const p of insight) {
    ctx.fillStyle = `rgba(236,210,255,${(0.3 + p.near * 0.7) * (1 - collapse)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.2 + p.near * 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "source-over";

  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.42,
    width * 0.12,
    width * 0.5,
    height * 0.5,
    width * 0.72,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.7, "rgba(6,8,18,0.02)");
  vignette.addColorStop(1, "rgba(6,8,18,0.55)");
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
