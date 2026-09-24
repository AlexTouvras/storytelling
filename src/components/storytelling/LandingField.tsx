"use client";

import { memo, useEffect, useRef, type RefObject } from "react";

/**
 * Three acts of one flight.
 *
 * 1. Lanes of records, joined by irregular jumps — not one arch or a straight cut.
 * 2. The camera zooms onto one lane. That lane levels to horizontal, we enter it,
 *    and only then does warp start: screen = center + worldXY * focal / z,
 *    streak from the previous (farther) depth.
 * 3. Acceleration stops. Streaks shorten to points and a slow horizon resolves:
 *    stars, galaxies, and a few larger bodies.
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

type Link = { lanes: number[]; us: number[] };

const CYAN: [number, number, number] = [126, 224, 234];
const VIOLET: [number, number, number] = [214, 160, 255];
const LANES = 16;
const SAMPLES = 96;
const CHOSEN = 8;
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

function buildStars(): Star[] {
  const stars: Star[] = [];
  for (let lane = 0; lane < LANES; lane++) {
    for (let i = 0; i < SAMPLES; i++) {
      const n = hash(lane * 97 + i * 13);
      const u = i / (SAMPLES - 1);
      const kind: 0 | 1 | 2 = n > 0.93 ? 2 : i % 11 === 0 ? 1 : 0;
      stars.push({
        lane,
        u,
        kind,
        onPath: false,
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

/** Short elbows. Endpoints do not line up into one curve or one cut. */
function buildLinks(): Link[] {
  const links: Link[] = [];
  for (let i = 0; i < 14; i++) {
    const lane = Math.floor(hash(i * 13 + 2) * (LANES - 5));
    const jump = 1 + Math.floor(hash(i * 17 + 5) * 3);
    const midJump = hash(i * 41 + 9) > 0.5 ? jump : Math.max(1, jump - 1);
    const u0 = 0.08 + hash(i * 19 + 8) * 0.55;
    const sign = hash(i * 23 + 1) > 0.48 ? 1 : -1;
    const u1 = Math.min(0.94, Math.max(0.06, u0 + sign * (0.18 + hash(i * 29) * 0.28)));
    const u2 = Math.min(0.94, Math.max(0.06, u1 - sign * (0.1 + hash(i * 31) * 0.34)));
    links.push({
      lanes: [lane, Math.min(LANES - 1, lane + midJump), Math.min(LANES - 1, lane + jump + 1)],
      us: [u0, u1, u2],
    });
  }
  return links;
}

const STARS = buildStars();
const LINKS = buildLinks();
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

function rawLane(lane: number, u: number, width: number, height: number, zoom: number) {
  const t = lane / (LANES - 1);
  const ct = CHOSEN / (LANES - 1);
  const yBase = height * (0.1 + t * 0.74);
  const tilt = lane === CHOSEN ? 0.36 * (1 - zoom) : (t - ct) * 0.06;
  return {
    x: width * (0.05 + u * 0.9),
    y: yBase + (u - 0.5) * width * tilt * 0.52,
  };
}

function framePoint(lane: number, u: number, width: number, height: number, zoom: number) {
  const focus = rawLane(CHOSEN, 0.5, width, height, zoom);
  const p = rawLane(lane, u, width, height, zoom);
  const scale = 1 + zoom * 5.5;
  return {
    x: focus.x + (p.x - focus.x) * scale,
    y: focus.y + (p.y - focus.y) * scale,
    scale,
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
  const zoom = smoothstep(0.16, 0.5, p);
  const warpIn = smoothstep(0.5, 0.64, p);
  const cruise = smoothstep(0.5, 0.68, p);
  const brake = smoothstep(0.66, 0.86, p);
  const horizon = smoothstep(0.76, 0.94, p);
  const lanesAlpha = 1 - smoothstep(0.54, 0.66, p);
  const travel = smoothstep(0.5, 0.74, p) * 220;
  const stretch = lerp(4, 26, cruise) * (1 - brake);
  const warpAlpha = warpIn * (1 - smoothstep(0.8, 0.96, p));
  const cx = width * lerp(lerp(0.5, 0.58, warpIn), 0.5, horizon);
  const cy = height * lerp(0.46, 0.48, warpIn);

  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "oklch(0.07 0.028 264)");
  bg.addColorStop(0.5, "oklch(0.09 0.03 255)");
  bg.addColorStop(1, "oklch(0.06 0.028 280)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  if (warpAlpha > 0.05) {
    const glowA = 0.04 + warpAlpha * 0.1 * (1 - brake * 0.7);
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(width, height) * 0.38);
    core.addColorStop(0, `rgba(186, 150, 255, ${glowA})`);
    core.addColorStop(0.4, `rgba(110, 210, 226, ${glowA * 0.3})`);
    core.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, width, height);
  }

  if (lanesAlpha > 0.03) {
    ctx.globalCompositeOperation = "lighter";
    const along = smoothstep(0.62, 1, zoom) * (1 - warpIn);

    for (let lane = 0; lane < LANES; lane++) {
      const a = framePoint(lane, 0.02, width, height, zoom);
      const b = framePoint(lane, 0.98, width, height, zoom);
      if (a.y < -80 && b.y < -80) continue;
      if (a.y > height + 80 && b.y > height + 80) continue;
      const chosen = lane === CHOSEN;
      const fade = chosen ? 1 : 1 - smoothstep(0.28, 0.72, zoom);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},${(chosen ? 0.55 : 0.28) * lanesAlpha * fade})`;
      ctx.lineWidth = (chosen ? 1.6 : 1) * Math.min(2.4, 0.7 + zoom * 1.4);
      ctx.stroke();
    }

    const linkFade = lanesAlpha * (1 - smoothstep(0.12, 0.28, p));
    if (linkFade > 0.04) {
      ctx.lineWidth = 1.15;
      ctx.strokeStyle = `rgba(${VIOLET[0]},${VIOLET[1]},${VIOLET[2]},${0.85 * linkFade})`;
      for (const link of LINKS) {
        ctx.beginPath();
        link.lanes.forEach((lane, n) => {
          const pt = framePoint(lane, link.us[n], width, height, zoom);
          if (n === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        for (let n = 0; n < link.lanes.length; n++) {
          const end = framePoint(link.lanes[n], link.us[n], width, height, zoom);
          if (end.x < -20 || end.y < -20 || end.x > width + 20 || end.y > height + 20) continue;
          ctx.fillStyle = `rgba(236, 214, 255, ${0.95 * linkFade})`;
          ctx.beginPath();
          ctx.arc(end.x, end.y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    for (let lane = 0; lane < LANES; lane++) {
      const chosen = lane === CHOSEN;
      const fade = chosen ? 1 : 1 - smoothstep(0.28, 0.72, zoom);
      if (fade < 0.05) continue;
      for (const index of LANE_INDEX[lane]) {
        const star = STARS[index];
        if (!chosen && star.kind === 0 && index % 2 === 1) continue;
        const s = framePoint(lane, star.u, width, height, zoom);
        if (s.x < -30 || s.y < -30 || s.x > width + 30 || s.y > height + 30) continue;
        const rgb = star.kind === 2 ? VIOLET : CYAN;
        const radius = (star.kind === 2 ? 2.2 : star.kind === 1 ? 1.6 : 1.15) * Math.min(3.2, 0.85 + zoom * 1.8);
        const alpha = (star.kind === 0 ? 0.55 : 0.9) * lanesAlpha * fade;
        if (chosen && along > 0.05) {
          ctx.strokeStyle = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},${0.45 * along * lanesAlpha})`;
          ctx.lineWidth = radius * 0.7;
          ctx.beginPath();
          ctx.moveTo(s.x - along * Math.min(width, height) * 0.045, s.y);
          ctx.lineTo(s.x, s.y);
          ctx.stroke();
        }
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
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
