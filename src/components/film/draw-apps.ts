import type { AppFieldModel } from "@/lib/sim/app-field";
import type { CutoffFrame } from "@/components/film/cutoff-frame";

const TEAL: [number, number, number] = [47, 95, 115];
const AMBER: [number, number, number] = [193, 123, 58];
const MIST: [number, number, number] = [180, 200, 210];

function rgba(rgb: [number, number, number], a: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

function projectX(pd: number, frame: CutoffFrame, width: number): number {
  const left = frame.cx - frame.spanX / 2;
  const plotL = width * 0.07;
  const plotW = width * 0.86;
  return plotL + ((pd - left) / frame.spanX) * plotW;
}

function projectY(
  row: number,
  frame: CutoffFrame,
  featuredRow: number,
  height: number,
): number {
  const plotTop = height * 0.14;
  const plotH = height * 0.68;
  const y = row + (featuredRow - row) * frame.focusY;
  const span = 1 - frame.focusY * 0.75;
  const mid = 0.5 + (featuredRow - 0.5) * frame.focusY;
  const t = (y - (mid - span / 2)) / span;
  return plotTop + (1 - Math.min(1, Math.max(0, t))) * plotH;
}

/**
 * Application marks on a PD axis. Vertical is stable jitter.
 * The gate is a vertical PD cut; rejected marks dim as `filter` rises.
 */
export function drawApps(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  model: AppFieldModel,
  frame: CutoffFrame,
): void {
  ctx.clearRect(0, 0, width, height);

  const plotTop = height * 0.14;
  const plotH = height * 0.68;
  const plotL = width * 0.07;
  const plotW = width * 0.86;

  // Plot well
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(plotL, plotTop, plotW, plotH);

  const gateX = projectX(frame.gatePd, frame, width);
  if (frame.gate > 0.02) {
    ctx.fillStyle = rgba(TEAL, 0.1 * frame.gate * (0.35 + 0.65 * frame.filter));
    ctx.fillRect(plotL, plotTop, Math.max(0, gateX - plotL), plotH);

    ctx.save();
    ctx.strokeStyle = `rgba(92,214,226,${0.25 + 0.55 * frame.gate})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.moveTo(gateX, plotTop);
    ctx.lineTo(gateX, plotTop + plotH);
    ctx.stroke();
    ctx.restore();

    if (frame.gate > 0.4) {
      ctx.fillStyle = `rgba(92,214,226,${0.55 * frame.gate})`;
      ctx.font = "500 11px ui-monospace, monospace";
      ctx.fillText(
        `PD ≤ ${(frame.gatePd * 100).toFixed(1)}%`,
        Math.min(width - 120, gateX + 8),
        plotTop + 16,
      );
    }
  }

  const featured = model.featured;
  for (const p of model.points) {
    const isFeatured = p.id === featured.id;
    if (!isFeatured && frame.population < 0.02) continue;

    const approved = p.pd <= frame.gatePd;
    let alpha = isFeatured
      ? 0.95
      : 0.12 + 0.55 * frame.population;

    if (!isFeatured && !approved && frame.filter > 0.05) {
      alpha *= 1 - 0.82 * frame.filter;
    }

    const x = projectX(p.pd, frame, width);
    const y = projectY(p.row, frame, featured.row, height);
    if (x < -20 || x > width + 20 || y < 0 || y > height) continue;

    const r = isFeatured
      ? 7 + 10 * frame.focusY
      : 1.4 + (p.grade / 8) * 2.2;

    const rgb = isFeatured
      ? ([92, 214, 226] as [number, number, number])
      : approved
        ? TEAL
        : frame.filter > 0.3
          ? AMBER
          : MIST;

    ctx.beginPath();
    ctx.fillStyle = rgba(rgb, alpha);
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    if (isFeatured && frame.focusY > 0.4) {
      ctx.strokeStyle = rgba([92, 214, 226], 0.7);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Axis label
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "500 10px ui-monospace, monospace";
  ctx.fillText("PD →", plotL, plotTop + plotH + 22);
}
