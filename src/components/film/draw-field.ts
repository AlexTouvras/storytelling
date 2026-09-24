import { FIELD_CUTOFF, shareAt, type FieldModel } from "@/lib/sim/book-field";
import type { FilmFrame } from "@/components/film/frame";

const LOG_MIN = Math.log10(70_000);
const LOG_MAX = Math.log10(430_000);
const CYAN: [number, number, number] = [92, 214, 226];
const VIOLET: [number, number, number] = [186, 104, 255];

function rgba(rgb: [number, number, number], a: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

function hash(id: number): number {
  const x = Math.sin(id * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
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
 */
export function drawField(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  model: FieldModel,
  frame: FilmFrame,
): void {
  ctx.clearRect(0, 0, width, height);

  const lineX = projectX(FIELD_CUTOFF, frame, width);
  if (frame.line > 0.02 && lineX > -20 && lineX < width + 20) {
    const plotTop = height * 0.14;
    const plotH = height * 0.68;
    ctx.fillStyle = rgba(VIOLET, 0.09 * frame.line);
    ctx.fillRect(width * 0.07, plotTop, Math.max(0, lineX - width * 0.07), plotH);

    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${0.18 + 0.55 * frame.line})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([1.5, 5]);
    ctx.beginPath();
    ctx.moveTo(lineX, plotTop);
    ctx.lineTo(lineX, plotTop + plotH);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = `rgba(255,255,255,${0.55 * frame.line})`;
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
    const shock = isFeatured
      ? Math.max(frame.featuredShock, frame.bookShock)
      : frame.bookShock;
    const share = shareAt(point, shock);
    const inSleeve = point.floating && share < FIELD_CUTOFF;
    const population = isFeatured ? 1 : frame.population;
    if (population < 0.01) continue;
    const dim = inSleeve ? 1 : 1 - frame.sleeve * 0.96;
    const alpha = (point.floating ? 0.92 : 0.62) * population * dim;
    if (alpha < 0.02) continue;
    layers.push({
      x: projectX(share, frame, width),
      y: projectY(point.balance, point.id, frame, model.featured.balance, height),
      r:
        radius(point.balance, frame) *
        (isFeatured ? 1.2 : inSleeve && frame.sleeve > 0.45 ? 1.35 : 1),
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
      ctx.lineWidth = 1.25;
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
