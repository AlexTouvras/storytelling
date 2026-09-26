import type { DelayFieldModel, DelayLine, DelayMark } from "@/lib/sim/delay-field";
import { LATE_MIN, lateAt } from "@/lib/sim/delay-field";
import type { RecoveryFrame } from "@/components/film/recovery-frame";
import {
  arrival,
  cameraCreep,
  clamp01,
  leadLag,
  markLife,
  rankJitter,
  smoothstep,
  strokeWeight,
  type Motion,
  STILL,
} from "@/components/film/craft";

const CYAN: [number, number, number] = [92, 214, 226];
const TEAL: [number, number, number] = [47, 95, 115];
const AMBER: [number, number, number] = [193, 123, 58];
const MIST: [number, number, number] = [150, 170, 184];

/** Opening span, so the camera's zoom factor can weight linework. */
const BASE_SPAN = 1;
/** Minutes late at the top of the plot when the camera is wide. */
const DELAY_CEILING_MIN = 30;
/** Share of a transition spent staggering a wave along the run. */
const CARRY_SPREAD = 0.4;

function rgba(rgb: [number, number, number], a: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

type Plot = { left: number; top: number; width: number; height: number };

function plotOf(width: number, height: number): Plot {
  return {
    left: width * 0.08,
    top: height * 0.16,
    width: width * 0.84,
    height: height * 0.62,
  };
}

/** Position in the run → x. The axis never changes; only the camera does. */
function projectX(stopShare: number, frame: RecoveryFrame, plot: Plot): number {
  const left = frame.cx - frame.spanX / 2;
  return plot.left + ((stopShare - left) / frame.spanX) * plot.width;
}

/**
 * Minutes late → y, with the ceiling closing in as `focusY` rises so a single run
 * fills the frame without the marks being redrawn anywhere else.
 */
function projectY(late: number, frame: RecoveryFrame, plot: Plot): number {
  const ceiling = DELAY_CEILING_MIN * (1 - 0.62 * frame.focusY);
  const t = clamp01(late / ceiling);
  return plot.top + (1 - t) * plot.height;
}

/** Commuter above, long-distance below, once the split opens. */
function serviceOffset(mark: DelayMark, frame: RecoveryFrame, plot: Plot): number {
  if (frame.split < 0.01) return 0;
  const direction = mark.service === 0 ? -1 : 1;
  return direction * frame.split * plot.height * 0.16;
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  plot: Plot,
  frame: RecoveryFrame,
  zoom: number,
): void {
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(plot.left, plot.top, plot.width, plot.height);

  const baseline = projectY(0, frame, plot);
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = strokeWeight(1, zoom);
  ctx.beginPath();
  ctx.moveTo(plot.left, baseline);
  ctx.lineTo(plot.left + plot.width, baseline);
  ctx.stroke();

  const threshold = projectY(LATE_MIN, frame, plot);
  ctx.save();
  ctx.setLineDash([3, 6]);
  ctx.strokeStyle = `rgba(92,214,226,${0.2 + 0.25 * frame.lineFocus})`;
  ctx.lineWidth = strokeWeight(1, zoom);
  ctx.beginPath();
  ctx.moveTo(plot.left, threshold);
  ctx.lineTo(plot.left + plot.width, threshold);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.font = "500 10px ui-monospace, monospace";
  ctx.fillText("position in the run →", plot.left, plot.top + plot.height + 22);
  ctx.fillText(`${LATE_MIN} min late`, plot.left, threshold - 6);
}

/** The recovery margin the timetable gives each leg, along the same axis. */
function drawMargin(
  ctx: CanvasRenderingContext2D,
  line: DelayLine,
  frame: RecoveryFrame,
  plot: Plot,
  zoom: number,
): void {
  if (frame.margin < 0.01) return;
  const legs = line.margin.length;
  if (legs === 0) return;

  const baseline = projectY(0, frame, plot);
  const unit = plot.height * 0.012;
  const reveal = frame.margin;

  for (let leg = 0; leg < legs; leg++) {
    const rank = leg / Math.max(1, legs - 1);
    const present = arrival(rank, reveal, 0.22);
    if (present < 0.01) continue;

    const from = projectX(leg / legs, frame, plot);
    const to = projectX((leg + 1) / legs, frame, plot);
    if (to < plot.left - 40 || from > plot.left + plot.width + 40) continue;

    const now = line.margin[leg];
    const moved = now + (line.marginAlt[leg] - now) * clamp01(frame.budget);
    const negative = now < 0;
    const h = Math.abs(moved) * unit * present;

    ctx.fillStyle = rgba(negative ? AMBER : TEAL, (negative ? 0.5 : 0.34) * present);
    ctx.fillRect(from, negative ? baseline : baseline - h, Math.max(1, to - from - 1), h);

    // Where the budget moved a leg, the old height stays as a ghost so the beat
    // reads as minutes being taken from somewhere.
    if (frame.budget > 0.02 && Math.abs(moved - now) > 0.05) {
      const was = Math.abs(now) * unit * present;
      ctx.strokeStyle = rgba(MIST, 0.3 * present);
      ctx.lineWidth = strokeWeight(1, zoom);
      ctx.beginPath();
      ctx.moveTo(from, baseline - was);
      ctx.lineTo(to - 1, baseline - was);
      ctx.stroke();
    }
  }
}

/**
 * The survival curve, drawn from the pack's figures for the selected line rather
 * than counted off the marks — the marks are illustrative, the curve is evidence.
 */
function drawCurve(
  ctx: CanvasRenderingContext2D,
  survival: number[],
  frame: RecoveryFrame,
  plot: Plot,
  zoom: number,
  colour: [number, number, number],
  offset: number,
): void {
  if (frame.curve < 0.01 || survival.length === 0) return;

  ctx.save();
  ctx.strokeStyle = rgba(colour, 0.75 * frame.curve);
  ctx.lineWidth = strokeWeight(2, zoom);
  ctx.beginPath();
  for (let i = 0; i < survival.length; i++) {
    const rank = i / Math.max(1, survival.length - 1);
    if (arrival(rank, frame.curve, 0.2) < 0.5) break;
    const x = projectX(rank * 0.9, frame, plot);
    const y = plot.top + (1 - survival[i]) * plot.height * 0.9 + offset;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

export type DelayDrawContext = {
  /** Line the reader has selected. */
  lineIndex: number;
  /** Survival curve for that line, from the pack. */
  survival: number[];
  /** Survival curves per service type, from the pack, for the split beat. */
  survivalByService: [number[], number[]];
};

export function drawDelays(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  model: DelayFieldModel,
  frame: RecoveryFrame,
  context: DelayDrawContext,
  motion: Motion = STILL,
): void {
  ctx.clearRect(0, 0, width, height);

  const plot = plotOf(width, height);
  const creep = cameraCreep(motion.time, frame.hold, motion.life);
  const view: RecoveryFrame = {
    ...frame,
    cx: frame.cx + frame.spanX * creep.pan,
    spanX: frame.spanX * creep.span,
  };
  const zoom = BASE_SPAN / Math.max(view.spanX, 1e-3);

  drawAxes(ctx, plot, view, zoom);

  const line = model.lines[context.lineIndex] ?? model.lines[0];
  const strengths = line.variantStrength;
  drawMargin(ctx, line, view, plot, zoom);

  for (const mark of model.marks) {
    const onLine = mark.lineIndex === context.lineIndex;
    const onRun =
      onLine &&
      mark.lineIndex === model.featured.lineIndex &&
      mark.runIndex === model.featured.runIndex;

    // Off-line marks fade as the camera settles; they are never removed, because
    // the claim is that this is the same field throughout.
    let alpha = onLine ? 0.9 : 0.55 * (1 - 0.94 * frame.lineFocus);
    if (alpha < 0.012) continue;

    // The field is written on in stop order, so it is made rather than faded up.
    const rank = rankJitter(mark.id, mark.stopShare);
    const present = arrival(rank, frame.population);
    if (present < 0.01) continue;
    alpha *= present;

    if (frame.run > 0.01 && !onRun) alpha *= 1 - 0.88 * frame.run;

    // Acts II–III: the run leaves on time, then the delay is handed along it. The
    // lag is the recorded difference between two logged times, and the wave runs
    // in the direction of travel.
    const scrubbed = lateAt(mark, strengths, frame.budget);
    const late = onRun
      ? scrubbed * leadLag(frame.carry, mark.stopShare, CARRY_SPREAD)
      : scrubbed * (frame.carry < 1 && frame.run > 0.5 ? frame.carry : 1);

    const isLate = late >= LATE_MIN;
    const radius = onRun ? 4.5 + 4 * frame.focusY : 1.5 + (isLate ? 1.4 : 0);
    const life = markLife(mark.id, motion.time, radius, motion.life);

    const x = projectX(mark.stopShare, view, plot) + life.dx;
    const y = projectY(late, view, plot) + serviceOffset(mark, view, plot) + life.dy;
    if (x < plot.left - 30 || x > plot.left + plot.width + 30) continue;
    if (y < 0 || y > height) continue;

    const rgb = onRun ? CYAN : isLate ? AMBER : MIST;
    ctx.beginPath();
    ctx.fillStyle = rgba(rgb, clamp01(alpha * life.glow));
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // The traced run, drawn over its own marks so the order reads as a path.
  if (frame.run > 0.02) {
    const run = model.marks
      .filter(
        (mark) =>
          mark.lineIndex === model.featured.lineIndex &&
          mark.runIndex === model.featured.runIndex,
      )
      .sort((a, b) => a.stop - b.stop);
    ctx.save();
    ctx.strokeStyle = rgba(CYAN, 0.5 * frame.run);
    ctx.lineWidth = strokeWeight(1.5, zoom);
    ctx.beginPath();
    run.forEach((mark, i) => {
      const late =
        lateAt(mark, strengths, frame.budget) *
        leadLag(frame.carry, mark.stopShare, CARRY_SPREAD);
      const x = projectX(mark.stopShare, view, plot);
      const y = projectY(late, view, plot);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  }

  if (frame.split > 0.2) {
    drawCurve(ctx, context.survivalByService[0], view, plot, zoom, AMBER, -plot.height * 0.16);
    drawCurve(ctx, context.survivalByService[1], view, plot, zoom, TEAL, plot.height * 0.16);
  } else {
    drawCurve(ctx, context.survival, view, plot, zoom, CYAN, 0);
  }

  // Selected line, named on the canvas so a picker change is legible without copy.
  if (frame.lineFocus > 0.5) {
    ctx.fillStyle = `rgba(255,255,255,${0.5 * smoothstep((frame.lineFocus - 0.5) / 0.5)})`;
    ctx.font = "500 11px ui-monospace, monospace";
    ctx.fillText(line.label, plot.left, plot.top - 14);
  }
}
