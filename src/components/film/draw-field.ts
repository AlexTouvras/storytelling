import { FIELD_CUTOFF, shareAt, type FieldModel } from "@/lib/sim/book-field";
import type { FilmFrame } from "@/components/film/frame";
import {
  arrival,
  cameraCreep,
  clamp01,
  hash,
  leadLag,
  markLife,
  rankJitter,
  smoothstep,
  strokeWeight,
  type Motion,
  STILL,
} from "@/components/film/craft";

const LOG_MIN = Math.log10(70_000);
const LOG_MAX = Math.log10(430_000);
const CYAN: [number, number, number] = [92, 214, 226];
const VIOLET: [number, number, number] = [186, 104, 255];

/** Opening span, so the camera's zoom factor can weight linework. */
const BASE_SPAN = 0.78;
/** Share of the shock transition spent as a wave across the book. */
const SHOCK_SPREAD = 0.3;

function rgba(rgb: [number, number, number], a: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

/**
 * Order the book is worked in: the thin edge first, out to the comfortable
 * loans. Anchored to residual income, so it survives the camera.
 */
function rankOf(id: number, shareBefore: number): number {
  return rankJitter(id, clamp01(shareBefore / (FIELD_CUTOFF * 3)));
}

function projectX(share: number, frame: FilmFrame, width: number): number {
  const left = frame.cx - frame.spanX / 2;
  const plotL = width * 0.07;
  const plotW = width * 0.86;
  return plotL + ((share - left) / frame.spanX) * plotW;
}

function projectY(
  balance: number,
  id: number,
  frame: FilmFrame,
  featuredBalance: number,
  height: number,
): number {
  const jitter = (hash(id) - 0.5) * (LOG_MAX - LOG_MIN) * 0.045 * (1 - frame.focusY);
  const logB = Math.log10(Math.max(balance, 1)) + jitter;
  const mid = (LOG_MIN + LOG_MAX) / 2;
  const yCenter = mid + (Math.log10(featuredBalance) - mid) * frame.focusY;
  const spanY = (LOG_MAX - LOG_MIN) * (1 - frame.focusY * 0.82) + 0.08 * frame.focusY;
  const plotTop = height * 0.14;
  const plotH = height * 0.68;
  const t = (logB - (yCenter - spanY / 2)) / spanY;
  return plotTop + (1 - t) * plotH;
}

function radius(balance: number, frame: FilmFrame): number {
  const balT = Math.min(
    1,
    Math.max(0, (Math.log10(balance) - LOG_MIN) / (LOG_MAX - LOG_MIN)),
  );
  const far = 1.8 + balT * 2.6;
  const near = 16 + balT * 10;
  return far + (near - far) * frame.focusY;
}

/**
 * Draw the book. Horizontal position is residual income.
 * Vertical position is unpaid balance. Scroll owns the camera.
 *
 * `motion` keeps the field alive while the reader holds still; the craft rules
 * it feeds are in `craft.ts`.
 */
export function drawField(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  model: FieldModel,
  frame: FilmFrame,
  motion: Motion = STILL,
): void {
  ctx.clearRect(0, 0, width, height);

  const creep = cameraCreep(motion.time, frame.hold, motion.life);
  const view: FilmFrame = {
    ...frame,
    cx: frame.cx + frame.spanX * creep.pan,
    spanX: frame.spanX * creep.span,
  };
  const zoom = BASE_SPAN / Math.max(view.spanX, 1e-3);

  const lineX = projectX(FIELD_CUTOFF, view, width);
  // The rule is drawn top-down, then the wash spreads back from it.
  const drawn = smoothstep(frame.line / 0.55);
  if (drawn > 0.01 && lineX > -20 && lineX < width + 20) {
    const plotTop = height * 0.14;
    const plotH = height * 0.68;
    const washW = Math.max(0, lineX - width * 0.07) * smoothstep((frame.line - 0.3) / 0.5);
    ctx.fillStyle = rgba(VIOLET, 0.09 * frame.line);
    ctx.fillRect(lineX - washW, plotTop, washW, plotH);

    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${0.38 + 0.35 * frame.line})`;
    ctx.lineWidth = strokeWeight(1, zoom);
    ctx.setLineDash([1.5, 5]);
    ctx.beginPath();
    ctx.moveTo(lineX, plotTop);
    ctx.lineTo(lineX, plotTop + plotH * drawn);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = `rgba(255,255,255,${0.55 * frame.line * smoothstep((drawn - 0.85) / 0.15)})`;
    ctx.font = "12px ui-monospace, monospace";
    ctx.textAlign = lineX > width * 0.72 ? "right" : "left";
    ctx.textBaseline = "middle";
    const labelX = lineX > width * 0.72 ? lineX - 10 : lineX + 10;
    ctx.fillText("under 6% of income", labelX, plotTop + plotH * 0.22);
  }

  const featuredId = model.featured.id;
  const layers: Array<{
    x: number;
    y: number;
    r: number;
    color: [number, number, number];
    alpha: number;
    floating: boolean;
    featured: boolean;
  }> = [];

  for (const point of model.points) {
    const isFeatured = point.id === featuredId;
    const rank = rankOf(point.id, point.shareBefore);
    // The named loan reprices first; the book then follows as a wave off the
    // thin edge rather than every mark sliding on the same frame.
    const shock = isFeatured
      ? Math.max(frame.featuredShock, frame.bookShock)
      : leadLag(frame.bookShock, rank, SHOCK_SPREAD);
    const share = shareAt(point, shock);
    const inSleeve = point.floating && share < FIELD_CUTOFF;
    const population = isFeatured ? 1 : arrival(rank, frame.population);
    if (population < 0.01) continue;
    const dim = inSleeve ? 1 : 1 - frame.sleeve * 0.96;
    const r =
      radius(point.balance, view) *
      (isFeatured ? 1.2 : inSleeve && frame.sleeve > 0.45 ? 1.35 : 1);
    const life = markLife(point.id, motion.time, r, motion.life);
    const alpha = (point.floating ? 0.92 : 0.62) * population * dim * life.glow;
    if (alpha < 0.02) continue;
    layers.push({
      x: projectX(share, view, width) + life.dx,
      y:
        projectY(point.balance, point.id, view, model.featured.balance, height) +
        life.dy,
      r,
      color: point.floating ? VIOLET : CYAN,
      alpha: isFeatured ? Math.max(alpha, 0.45 + 0.55 * frame.focusY) : alpha,
      floating: point.floating,
      featured: isFeatured,
    });
  }

  layers.sort(
    (a, b) =>
      Number(a.featured) - Number(b.featured) ||
      Number(a.floating) - Number(b.floating),
  );

  for (const dot of layers) {
    if (dot.featured && (frame.focusY > 0.35 || frame.sleeve > 0.7)) {
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.arc(dot.x, dot.y, dot.r * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = strokeWeight(1.25, zoom);
      ctx.arc(dot.x, dot.y, dot.r + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.fillStyle = rgba(dot.color, dot.alpha);
    ctx.arc(dot.x, dot.y, Math.max(0.6, dot.r), 0, Math.PI * 2);
    ctx.fill();
  }

  const vignette = ctx.createRadialGradient(
    width * 0.55,
    height * 0.48,
    width * 0.15,
    width * 0.5,
    height * 0.5,
    width * 0.72,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(6,8,18,0.2)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}
