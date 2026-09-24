"use client";

import { memo, useEffect, useRef, type RefObject } from "react";

/**
 * One tube of records. Scroll only moves the camera:
 * front view (streams) → closer on the chain → into the tube (vortex) → a calmer hold.
 */

type Rec = { lane: number; u: number; kind: 0 | 1 | 2 };

const CYAN: [number, number, number] = [150, 220, 228];
const VIOLET: [number, number, number] = [206, 160, 255];
const LANES = 16;
const SAMPLES = 64;
const RADIUS = 2.15;

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
  return 0.5 + Math.sin((lane / LANES) * Math.PI * 2) * 0.018;
}

function buildRecords(): Rec[] {
  const pts: Rec[] = [];
  for (let lane = 0; lane < LANES; lane++) {
    for (let i = 0; i < SAMPLES; i++) {
      const n = hash(lane * 97 + i * 13);
      const u = i / (SAMPLES - 1);
      const onChain = Math.abs(u - chainU(lane)) < 0.012;
      const kind: 0 | 1 | 2 = onChain ? 2 : n > 0.92 ? 1 : 0;
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

type Cam = {
  x: number;
  y: number;
  z: number;
  fov: number;
  curl: number;
  focus: number;
  orbit: number;
  arrive: number;
};

function cameraAt(progress: number): Cam {
  const focus = smoothstep(0.14, 0.32, progress);
  const orbit = smoothstep(0.36, 0.78, progress);
  const arrive = smoothstep(0.82, 1, progress);
  const yaw = orbit * 1.32 * (1 - arrive * 0.42);
  const dist = lerp(5.8, 5.2, focus) * lerp(1, 0.62, orbit) + arrive * 1.1;
  return {
    x: Math.sin(yaw) * dist,
    y: 0,
    z: Math.cos(yaw) * dist,
    fov: lerp(1.05, 1.15, orbit),
    curl: smoothstep(0.42, 0.8, progress) * (1 - arrive * 0.65),
    focus,
    orbit,
    arrive,
  };
}

function world(lane: number, u: number, curl: number) {
  const angle = (lane / LANES) * Math.PI * 2;
  const twist = (u - 0.5) * curl * 2.15;
  const y0 = Math.cos(angle) * RADIUS;
  const z0 = Math.sin(angle) * RADIUS;
  return {
    x: (u - 0.5) * 6.2,
    y: y0 * Math.cos(twist) - z0 * Math.sin(twist),
    z: y0 * Math.sin(twist) + z0 * Math.cos(twist),
  };
}

function project(
  pt: { x: number; y: number; z: number },
  cam: Cam,
  width: number,
  height: number,
) {
  let fx = -cam.x;
  let fy = -cam.y;
  let fz = -cam.z;
  const fl = Math.hypot(fx, fy, fz) || 1;
  fx /= fl;
  fy /= fl;
  fz /= fl;
  let rx = -fz;
  let rz = fx;
  const rl = Math.hypot(rx, rz) || 1;
  rx /= rl;
  rz /= rl;
  const ux = -rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy;
  const dx = pt.x - cam.x;
  const dy = pt.y - cam.y;
  const dz = pt.z - cam.z;
  const zc = dx * fx + dy * fy + dz * fz;
  if (zc < 0.3) return null;
  const k = cam.fov / zc;
  return {
    x: width * 0.5 + (dx * rx + dz * rz) * k * width,
    y: height * 0.34 - (dx * ux + dy * uy + dz * uz) * k * height,
    near: Math.min(1, 3.2 / zc),
  };
}

function laneReveal(lane: number, orbit: number) {
  const front = Math.sin((lane / LANES) * Math.PI * 2) > -0.05 ? 1 : 0;
  return lerp(front, 1, orbit);
}

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  time: number,
  reduced: boolean,
) {
  const cam = cameraAt(reduced ? 0 : progress);
  const drift = reduced ? 0 : time * 0.012 * (1 - cam.orbit);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "oklch(0.075 0.028 264)";
  ctx.fillRect(0, 0, width, height);

  const glowA = (0.06 + cam.orbit * 0.16) * (1 - cam.arrive * 0.55);
  const glow = ctx.createRadialGradient(width * 0.5, height * 0.34, 0, width * 0.5, height * 0.34, width * 0.42);
  glow.addColorStop(0, `rgba(180,150,255,${glowA})`);
  glow.addColorStop(0.55, `rgba(120,200,220,${glowA * 0.22})`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = "lighter";
  ctx.lineWidth = 1;

  for (let lane = 0; lane < LANES; lane++) {
    const show = laneReveal(lane, cam.orbit);
    if (show < 0.04) continue;
    const speed = 0.004 + (lane % 5) * 0.0015;
    const idxs = BY_LANE[lane];
    ctx.beginPath();
    let started = false;
    idxs.forEach((index) => {
      const rec = RECORDS[index];
      const u = (rec.u + drift * speed) % 1;
      const p = project(world(lane, u, cam.curl), cam, width, height);
      if (!p) {
        started = false;
        return;
      }
      if (!started) {
        ctx.moveTo(p.x, p.y);
        started = true;
      } else ctx.lineTo(p.x, p.y);
    });
    const strokeA = lerp(0.72, 0.4, cam.orbit) * show * (1 - cam.focus * 0.15) * (1 - cam.arrive * 0.25);
    ctx.strokeStyle = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},${strokeA})`;
    ctx.stroke();

    for (const index of idxs) {
      const rec = RECORDS[index];
      const u = (rec.u + drift * speed) % 1;
      const p = project(world(lane, u, cam.curl), cam, width, height);
      if (!p) continue;
      const dist = Math.abs(u - chainU(lane));
      const emphasis = Math.exp(-dist * dist * (16 + cam.focus * 70));
      const dim = lerp(1, 0.34 + emphasis * 0.66, cam.focus * (1 - cam.orbit * 0.75));
      const signal = rec.kind === 2;
      const rgb = signal ? VIOLET : CYAN;
      const alpha = (signal ? 1 : 0.88 + rec.kind * 0.08) * dim * show * (1 - cam.arrive * 0.2);
      if (alpha < 0.05) continue;
      const radius = (signal ? 2.6 : 1.7 + rec.kind * 0.4) * (0.9 + p.near * 0.2);
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.beginPath();
  const nodes: { x: number; y: number }[] = [];
  let pen = false;
  for (let lane = 0; lane < LANES; lane++) {
    if (laneReveal(lane, cam.orbit) < 0.2 && cam.orbit < 0.35) {
      pen = false;
      continue;
    }
    const p = project(world(lane, chainU(lane), cam.curl), cam, width, height);
    if (!p) {
      pen = false;
      continue;
    }
    nodes.push(p);
    if (!pen) {
      ctx.moveTo(p.x, p.y);
      pen = true;
    } else ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = `rgba(214,176,255,${(0.55 + cam.focus * 0.35) * (1 - cam.arrive * 0.4)})`;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  for (const node of nodes) {
    ctx.fillStyle = `rgba(236,214,255,${0.9 * (1 - cam.arrive * 0.35)})`;
    ctx.beginPath();
    ctx.arc(node.x, node.y, 2.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "source-over";
  const vignette = ctx.createRadialGradient(width * 0.5, height * 0.36, width * 0.08, width * 0.5, height * 0.42, width * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(6,8,18,0.38)");
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
