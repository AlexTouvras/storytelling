"use client";

import { memo, useEffect, useRef, type RefObject } from "react";

/**
 * One seeded field, scrubbed by page progress:
 * 0–15% streams, 15–35% the chain, 35–60% bend,
 * 60–82% vortex, 82–100% a calmer field.
 */

type Rec = {
  lane: number;
  u: number;
  kind: 0 | 1 | 2;
  n: number;
};

const CYAN: [number, number, number] = [138, 216, 226];
const VIOLET: [number, number, number] = [196, 150, 255];
const LANES = 12;
const SAMPLES = 76;

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

/** A diagonal route across the streams. Same points become the vortex spine. */
function chainU(lane: number) {
  const t = lane / (LANES - 1);
  return 0.18 + t * 0.58 + Math.sin(t * Math.PI) * 0.05;
}

function buildRecords(): Rec[] {
  const pts: Rec[] = [];
  for (let lane = 0; lane < LANES; lane++) {
    for (let i = 0; i < SAMPLES; i++) {
      const n = hash(lane * 97 + i * 13);
      const u = i / (SAMPLES - 1);
      const onChain = Math.abs(u - chainU(lane)) < 0.016;
      const kind: 0 | 1 | 2 = onChain ? 2 : n > 0.93 ? 1 : 0;
      pts.push({ lane, u, kind, n });
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

type Scene = {
  focus: number;
  bend: number;
  vortex: number;
  arrive: number;
};

function sceneAt(progress: number): Scene {
  return {
    focus: smoothstep(0.15, 0.32, progress),
    bend: smoothstep(0.35, 0.58, progress),
    vortex: smoothstep(0.6, 0.8, progress),
    arrive: smoothstep(0.82, 0.98, progress),
  };
}

function fieldPoint(lane: number, u: number, width: number, height: number) {
  const laneT = lane / (LANES - 1);
  return {
    x: width * (0.03 + u * 0.94),
    y: height * (0.08 + laneT * 0.62) - Math.sin(u * Math.PI) * height * 0.008,
  };
}

function chainCentroid(width: number, height: number) {
  let x = 0;
  let y = 0;
  for (let lane = 0; lane < LANES; lane++) {
    const p = fieldPoint(lane, chainU(lane), width, height);
    x += p.x;
    y += p.y;
  }
  return { x: x / LANES, y: y / LANES };
}

function project(
  lane: number,
  u: number,
  width: number,
  height: number,
  scene: Scene,
  spin: number,
  followX: number,
  followY: number,
) {
  const laneT = lane / (LANES - 1);
  const lateral = u - chainU(lane);
  const base = fieldPoint(lane, u, width, height);
  const zoom = 1 + scene.focus * (1 - scene.bend) * 0.16;
  const cx = width * 0.5;
  const cy = height * 0.42;
  const focused = {
    x: cx + (base.x - cx) * zoom + followX * scene.focus * (1 - scene.bend),
    y: cy + (base.y - cy) * zoom + followY * scene.focus * (1 - scene.bend),
  };

  // Ends of each stream sit deeper than the chain, so the line bows into the axis.
  const cam = scene.bend * 0.62;
  const z = Math.max(0.3, 0.58 + laneT * 1.25 + lateral * lateral * 3.1 - cam);
  const persp = 1 / z;
  const bent = {
    x: lerp(focused.x, cx + (u - 0.5) * width * 1.15 * persp, scene.bend),
    y: lerp(focused.y, cy + (laneT - 0.42) * height * 0.92 * persp, scene.bend),
  };

  const theta = spin + laneT * Math.PI * 2.4 + lateral * Math.PI * 1.15;
  const worldR = 0.055 + Math.abs(lateral) * 0.95;
  const depth = 0.42 + laneT * 1.7;
  const scale = 1.15 / depth;
  const vortex = {
    x: cx + Math.cos(theta) * worldR * scale * width * 0.34,
    y: cy + Math.sin(theta) * worldR * scale * height * 0.42,
  };
  const spun = {
    x: lerp(bent.x, vortex.x, scene.vortex),
    y: lerp(bent.y, vortex.y, scene.vortex),
  };

  const calm = {
    x: width * (0.12 + u * 0.76),
    y: height * (0.14 + laneT * 0.58) - Math.sin((u + laneT) * Math.PI) * height * 0.04,
  };

  return {
    x: lerp(spun.x, calm.x, scene.arrive),
    y: lerp(spun.y, calm.y, scene.arrive),
    near: Math.min(1, scale * 0.55),
    lateral,
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
  const scene = sceneAt(progress);
  const travel = reduced ? 0 : time * (1 - scene.bend);
  const spin = scene.vortex * (1 - scene.arrive * 0.9) * Math.PI * 1.25;
  const centroid = chainCentroid(width, height);
  const followX = width * 0.5 - centroid.x;
  const followY = height * 0.4 - centroid.y;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "oklch(0.08 0.028 264)";
  ctx.fillRect(0, 0, width, height);

  const glowA = (0.05 + scene.vortex * 0.2) * (1 - scene.arrive * 0.65);
  const glow = ctx.createRadialGradient(width * 0.5, height * 0.4, 0, width * 0.5, height * 0.4, width * 0.46);
  glow.addColorStop(0, `rgba(186,150,255,${glowA})`);
  glow.addColorStop(0.5, `rgba(120,200,220,${glowA * 0.28})`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = "lighter";

  for (let lane = 0; lane < LANES; lane++) {
    const speed = 0.006 + (lane % 4) * 0.0025;
    const idxs = BY_LANE[lane];
    const strokeA = (0.42 * (1 - scene.focus * 0.45) * (1 - scene.vortex * 0.75) + scene.vortex * 0.14) * (1 - scene.arrive * 0.35);
    if (strokeA > 0.03) {
      ctx.beginPath();
      idxs.forEach((index, n) => {
        const rec = RECORDS[index];
        const u = (rec.u + travel * speed) % 1;
        const p = project(lane, u, width, height, scene, spin, followX, followY);
        if (n === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},${strokeA})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (const index of idxs) {
      const rec = RECORDS[index];
      if (rec.kind === 0 && rec.n > 0.72 && scene.arrive > 0.5) continue;
      const u = (rec.u + travel * speed) % 1;
      const p = project(lane, u, width, height, scene, spin, followX, followY);
      if (p.x < -20 || p.y < -20 || p.x > width + 20 || p.y > height + 20) continue;
      const dist = Math.abs(u - chainU(lane));
      const emphasis = Math.exp(-dist * dist * (22 + scene.focus * 70));
      const dim = lerp(1, 0.16 + emphasis, scene.focus * (1 - scene.vortex * 0.92));
      const signal = rec.kind === 2 || emphasis > 0.8;
      const rgb = signal ? VIOLET : CYAN;
      const alpha = (signal ? 0.92 : 0.5 + rec.kind * 0.18) * dim * (1 - scene.arrive * 0.28);
      if (alpha < 0.03) continue;
      const radius = (signal ? 2.5 : 1.55 + rec.kind * 0.45) * (0.85 + scene.vortex * p.near * 0.35);
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.beginPath();
  const nodes: { x: number; y: number }[] = [];
  for (let lane = 0; lane < LANES; lane++) {
    const p = project(lane, chainU(lane), width, height, scene, spin, followX, followY);
    nodes.push(p);
    if (lane === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  const chainA = (0.35 + scene.focus * 0.55) * (1 - scene.arrive * 0.45);
  ctx.strokeStyle = `rgba(220,186,255,${chainA})`;
  ctx.lineWidth = 1.25 + scene.vortex * 0.7;
  ctx.stroke();
  for (const node of nodes) {
    ctx.fillStyle = `rgba(238,220,255,${(0.65 + scene.vortex * 0.3) * (1 - scene.arrive * 0.4)})`;
    ctx.beginPath();
    ctx.arc(node.x, node.y, 2.2 + scene.vortex * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "source-over";
  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.42,
    width * 0.05,
    width * 0.5,
    height * 0.48,
    width * 0.75,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(6,8,18,0.5)");
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
