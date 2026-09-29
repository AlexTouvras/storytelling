import type { AppFieldModel } from "@/lib/sim/app-field";
import type { CutoffFrame } from "@/components/film/cutoff-frame";
import { picturePlot } from "@/components/film/subtitles";
import {
  arrival,
  cameraCreep,
  leadLag,
  markLife,
  rankJitter,
  smoothstep,
  strokeWeight,
  type Motion,
  STILL,
} from "@/components/film/craft";

const TEAL: [number, number, number] = [47, 95, 115];
const AMBER: [number, number, number] = [193, 123, 58];
const MIST: [number, number, number] = [180, 200, 210];

/** Opening span, so the camera's zoom factor can weight linework. */
const BASE_SPAN = 0.42;
/** Share of the filter pass spent sweeping out from the gate. */
const FILTER_SPREAD = 0.34;

function rgba(rgb: [number, number, number], a: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

/** Order the sheet is worked in: best grade first, down to the worst. */
function rankOf(id: number, grade: number): number {
  return rankJitter(id, (grade - 1) / 7);
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
  const { top: plotTop, height: plotH } = picturePlot(height, 28);
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
  motion: Motion = STILL,
): void {
  ctx.clearRect(0, 0, width, height);

  const { top: plotTop, height: plotH } = picturePlot(height, 28);
  const plotL = width * 0.07;
  const plotW = width * 0.86;

  const creep = cameraCreep(motion.time, frame.hold, motion.life);
  const view: CutoffFrame = {
    ...frame,
    cx: frame.cx + frame.spanX * creep.pan,
    spanX: frame.spanX * creep.span,
  };
  const zoom = BASE_SPAN / Math.max(view.spanX, 1e-3);

  // Plot well
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(plotL, plotTop, plotW, plotH);

  const gateX = projectX(frame.gatePd, view, width);
  // The gate is ruled down the sheet, then the approved side fills back to it.
  const drawn = smoothstep(frame.gate / 0.5);
  if (drawn > 0.01) {
    const fillW = Math.max(0, gateX - plotL) * smoothstep((frame.gate - 0.25) / 0.5);
    ctx.fillStyle = rgba(TEAL, 0.1 * frame.gate * (0.35 + 0.65 * frame.filter));
    ctx.fillRect(gateX - fillW, plotTop, fillW, plotH);

    ctx.save();
    ctx.strokeStyle = `rgba(92,214,226,${0.45 + 0.35 * frame.gate})`;
    ctx.lineWidth = strokeWeight(1.5, zoom);
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.moveTo(gateX, plotTop);
    ctx.lineTo(gateX, plotTop + plotH * drawn);
    ctx.stroke();
    ctx.restore();

    if (drawn > 0.95) {
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

    const rank = rankOf(p.id, p.grade);
    const approved = p.pd <= frame.gatePd;
    // The sheet is written on best-grade first, and the rejection sweeps out
    // from the gate instead of every mark dimming on the same frame.
    const present = isFeatured ? 1 : arrival(rank, frame.population);
    if (present < 0.01) continue;
    let alpha = isFeatured ? 0.95 : (0.12 + 0.55 * frame.population) * present;

    if (!isFeatured && !approved) {
      alpha *= 1 - 0.82 * leadLag(frame.filter, rank, FILTER_SPREAD);
    }

    const r = isFeatured
      ? 7 + 10 * frame.focusY
      : 1.4 + (p.grade / 8) * 2.2;

    const life = markLife(p.id, motion.time, r, motion.life);
    alpha *= life.glow;

    const x = projectX(p.pd, view, width) + life.dx;
    const y = projectY(p.row, view, featured.row, height) + life.dy;
    if (x < -20 || x > width + 20 || y < 0 || y > height) continue;

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
      ctx.lineWidth = strokeWeight(1, zoom);
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
