import type { DelayFieldModel, DelayLine } from "@/lib/sim/delay-field";
import { LATE_MIN, lateAt } from "@/lib/sim/delay-field";
import type { RecoveryFrame } from "@/components/film/recovery-frame";
import {
  arrival,
  cameraCreep,
  clamp01,
  leadLag,
  lerp,
  markLife,
  rankJitter,
  smoothstep,
  strokeWeight,
  type Motion,
  STILL,
} from "@/components/film/craft";

const CYAN: [number, number, number] = [92, 214, 226];
const TEAL: [number, number, number] = [68, 140, 162];
const AMBER: [number, number, number] = [204, 130, 60];
const MIST: [number, number, number] = [150, 170, 184];

/** Opening span, so the camera's zoom factor can weight linework. */
const BASE_SPAN = 1;
/** Minutes late at the top of the delay panel when the camera is wide. */
const DELAY_CEILING_MIN = 34;
/**
 * Share of the carry transition spent staggering the wave along the run, at the
 * cap `leadLag` allows. Acts II and III need the stagger to read as a front
 * travelling in the direction of travel rather than as one side merely leading,
 * and the cap is what makes the tail of the run still be at nothing while the
 * onset is already at its full height.
 */
const CARRY_SPREAD = 0.45;
/**
 * The stop axis's share of the view at `spanX` 1, so the opening shot has air
 * around the field and the push in fills the frame without cropping the line.
 * At `spanX` 0.78 the twenty-four stops occupy the whole panel.
 */
const FIELD_SPREAD = 0.78;
/** Minutes of margin the strip is scaled to hold, unless a line needs more. */
const MARGIN_FLOOR_MIN = 4;
/**
 * Alpha below which a mark cannot change a pixel on a dark field, so drawing it
 * is work with nothing to show. Marks are never *removed* from the film — the
 * off-line population fades to this under the camera and is skipped from there.
 */
const ALPHA_FLOOR = 0.02;

/**
 * Runs kept from the lines the camera is *not* on, as one in every `n`, by how much
 * stage there is to draw them on.
 *
 * The field carries 6,380 marks so that the line the reader picks has 44 runs on it
 * at Act IV. Six sevenths of those marks only ever appear in the open, as the volume
 * of a year behind the line the film is about — and on a phone that volume is being
 * drawn into a panel roughly a sixth the area of the desktop one, at twice the
 * device pixels per mark. Measured on a Pixel 7 viewport, the open ran at 12 Hz on a
 * four-times-throttled CPU; what it drew at that price was not a field but a smear.
 *
 * So the backdrop thins with the stage while the selected line never does — Act IV
 * onwards is pixel-for-pixel identical on every screen, and the open shows a
 * sparser sample of the same year on a small one. That is a real cost, stated
 * rather than hidden: a phone reader sees fewer trains in the opening shot.
 *
 * Keyed on run index, so the sample is the same every frame and does not shimmer,
 * and the same for whichever line is selected. Nothing printed anywhere in the film
 * is counted off these marks, so thinning them changes no figure.
 */
function backdropStride(width: number, height: number): number {
  const area = width * height;
  if (area >= 800_000) return 1;
  if (area >= 400_000) return 2;
  return 3;
}

/** Mark colours, drawn in this order so the late population reads over the rest. */
const MARK_LAYERS: [number, number, number][] = [MIST, AMBER, CYAN];
const LAYER_MIST = 0;
const LAYER_AMBER = 1;
const LAYER_CYAN = 2;

/**
 * Alpha steps a mark's opacity is rounded to, so thousands of marks can share one
 * path and one fill.
 *
 * A mark covers about five pixels, and a `beginPath`/`arc`/`fill` for each spends
 * most of its time in per-call overhead rather than on those pixels. The open
 * draws 6,380 of them and measured 15 Hz on a four-times-throttled CPU, dropping
 * frames even unthrottled — the frame-cost gate only caught it once it was given a
 * probe at the film's dense end rather than at its closing hold.
 *
 * Twelve steps is below what the eye separates on a dot this size. Positions,
 * radii and per-mark life are untouched.
 *
 * **One thing does change, and it is worth knowing.** Overlapping sub-paths of a
 * single path fill as a union, so marks inside one alpha step no longer composite
 * over each other. Where the field is sparse nothing moves; in the on-time band at
 * the baseline, where a couple of hundred marks pile into seven pixels, the strip
 * stops clipping to solid and shows its density instead. That is the overdraw
 * becoming visible rather than the picture being altered — but it is a change, and
 * `scripts/shoot-recovery.mjs` is how it was checked.
 */
const ALPHA_STEPS = 12;

/**
 * Batched mark geometry as flat `x, y, radius` triples, one array per colour and
 * alpha step, reused between frames: building 6,380 marks' worth of coordinates
 * from scratch every frame is what the profiler was reporting as collection time.
 * Draws are synchronous and single-threaded, so the films can share one buffer.
 */
const MARK_BATCHES: number[][] = Array.from(
  { length: MARK_LAYERS.length * ALPHA_STEPS },
  () => [],
);

function rgba(rgb: [number, number, number], a: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

const MONO = "500 10px ui-monospace, monospace";

type Band = { left: number; top: number; width: number; height: number };

/**
 * Three stacked panels over one x axis, laid out so the narration that covers the
 * bottom of the stage never lands on data.
 *
 *   survival   the decay curve and its day band, arriving with `frame.curve`
 *   delay      minutes late; a mark is one train at one stop
 *   margin     recovery margin per leg, hanging off the delay panel's baseline
 *
 * The delay panel's top slides down as the survival panel arrives, so the curve
 * does not appear over the marks. `curve` is a rendered channel, so the cue table
 * counts that slide as motion.
 */
type Stage = {
  /** The data's own edges: what the camera is pointed at, and what it scales about. */
  frame: Band;
  survival: Band;
  delay: Band;
  margin: Band;
};

/**
 * Room to the right of the frame for the survival axis's own percentage labels.
 * The clip has to allow for it — set to the frame's own width, it was cutting
 * those labels off entirely, since they are written eight pixels past an edge the
 * clip closed two pixels past.
 */
const AXIS_GUTTER_PX = 40;

/**
 * Slack in the clip for the held camera's own movement, as a share of the frame.
 *
 * The creep pans and pushes the whole stage, so anything sitting against an edge
 * travels past it — at the closing hold the axis captions were being clipped
 * mid-word ("ll late, stops after…"). This did not happen while creep was folded
 * into the stop-axis projection, because that moved data positions and left text
 * pinned to the band. Four percent covers the pan share plus the push, and the page
 * margin outside the frame is empty, so a few pixels of bleed there cost nothing.
 */
const CREEP_SLACK = 0.04;

/** Clearance between the lowest thing drawn and the first line of narration. */
const COPY_CLEARANCE_PX = 10;
/** Shortest stage the three panels are drawn on before they stop shrinking. */
const MIN_STAGE_PX = 210;

function stageOf(
  width: number,
  height: number,
  frame: RecoveryFrame,
  copyTop: number,
): Stage {
  const left = width * 0.07;
  const w = width * 0.86;
  // Below the line picker, above the narration: the canvas owns the band in
  // between and nothing is drawn where copy will land.
  const top = height * 0.13;
  // A share of viewport height was not enough on its own. The narration is a
  // kicker, a heading and three paragraphs, so its height is close to fixed in
  // pixels while this floor scales — and below about 800px of viewport the two
  // meet. At 1280×720 the margin bars were drawn straight through the kicker.
  // `copyTop` is measured from the live layout, because how tall the copy is
  // depends on which beat is up and how it wrapped.
  const floor = Math.max(
    top + MIN_STAGE_PX,
    Math.min(height * 0.63, copyTop - COPY_CLEARANCE_PX),
  );
  const survivalH = (floor - top) * 0.3;
  const marginH = (floor - top) * 0.19;
  // The field gets out of the survival panel's way faster than the curve arrives,
  // so the two are never drawn over each other mid-transition.
  const delayTop = lerp(
    top,
    top + survivalH + (floor - top) * 0.06,
    smoothstep(clamp01(frame.curve * 2)),
  );
  const baseline = floor - marginH;

  return {
    frame: { left, top, width: w, height: floor - top },
    survival: { left, top, width: w, height: survivalH },
    delay: { left, top: delayTop, width: w, height: baseline - delayTop },
    margin: { left, top: baseline, width: w, height: marginH },
  };
}

/** Position in the run → x, through the camera. */
function projectX(stopShare: number, frame: RecoveryFrame, band: Band): number {
  const view = 0.5 + (clamp01(stopShare) - 0.5) * FIELD_SPREAD;
  const windowLeft = frame.cx - frame.spanX / 2;
  return band.left + ((view - windowLeft) / frame.spanX) * band.width;
}

/**
 * Apply the held camera's creep to the whole stage, as a transform.
 *
 * It used to be folded into `projectX` by nudging `cx` and `spanX`, which is the
 * same arithmetic for the two panels that share the stop axis and does nothing at
 * all to the survival panel, because that panel is on its own axis and never goes
 * through the projection. So a held beat moved the marks, the ticks and the margin
 * bars while the curve, its band and its labels — the top third of the frame, and
 * its highest-contrast linework — stayed nailed down. A camera that moves part of
 * what it is pointed at is worse than one that does not move at all: the reader
 * reads it as a foreground drifting over a photograph.
 *
 * Folding it in also made the push in a horizontal stretch. `cameraCreep` returns
 * a span multiplier, and a span only narrows x, so the frame grew wider without
 * growing taller. A push is a uniform scale about where the camera is pointed.
 *
 * The transform reproduces the old horizontal motion exactly — scaling about the
 * stage's centre by `1 / span` after a pan of `pan` stage widths is what dividing
 * the projection window by `span` was already doing — and adds the vertical half
 * of it for free.
 */
function creepStage(
  ctx: CanvasRenderingContext2D,
  stage: Stage,
  creep: { pan: number; span: number },
): void {
  if (creep.pan === 0 && creep.span === 1) return;
  const cx = stage.frame.left + stage.frame.width / 2;
  const cy = stage.frame.top + stage.frame.height / 2;
  ctx.translate(cx, cy);
  ctx.scale(1 / creep.span, 1 / creep.span);
  ctx.translate(-cx - stage.frame.width * creep.pan, -cy);
}

/**
 * Minutes late → y, with the ceiling closing in as `focusY` rises so one run can
 * fill the frame without the marks being redrawn anywhere else.
 */
function projectY(late: number, frame: RecoveryFrame, band: Band): number {
  const ceiling = DELAY_CEILING_MIN * (1 - 0.62 * frame.focusY);
  return band.top + (1 - clamp01(late / ceiling)) * band.height;
}

function drawDelayAxis(
  ctx: CanvasRenderingContext2D,
  stage: Stage,
  frame: RecoveryFrame,
  line: DelayLine,
  zoom: number,
): void {
  const band = stage.delay;
  ctx.fillStyle = "rgba(255,255,255,0.025)";
  ctx.fillRect(band.left, band.top, band.width, band.height);

  const baseline = band.top + band.height;
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = strokeWeight(1, zoom);
  ctx.beginPath();
  ctx.moveTo(band.left, baseline);
  ctx.lineTo(band.left + band.width, baseline);
  ctx.stroke();

  // One tick per stop, so "position in the run" is a place and not a proportion.
  const stops = line.stopCodes.length;
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  for (let stop = 0; stop < stops; stop++) {
    const x = projectX(stop / Math.max(1, stops - 1), frame, band);
    ctx.moveTo(x, baseline);
    ctx.lineTo(x, baseline + 4);
  }
  ctx.stroke();

  const threshold = projectY(LATE_MIN, frame, band);
  ctx.save();
  ctx.setLineDash([3, 6]);
  ctx.strokeStyle = `rgba(92,214,226,${0.2 + 0.25 * frame.lineFocus})`;
  ctx.lineWidth = strokeWeight(1, zoom);
  ctx.beginPath();
  ctx.moveTo(band.left, threshold);
  ctx.lineTo(band.left + band.width, threshold);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.34)";
  ctx.font = MONO;
  ctx.fillText(`${LATE_MIN} min late`, band.left + 4, threshold - 6);
  ctx.fillStyle = "rgba(255,255,255,0.24)";
  ctx.fillText(
    `minutes late ↑ · ${line.stopNames[0]} → ${line.stopNames[stops - 1]} →`,
    band.left + 4,
    band.top + 12,
  );
}

/**
 * The recovery margin the timetable gives each leg, hanging below the same
 * baseline the delays sit on: minutes the train has to give a delay back, under
 * the minutes it is carrying. Legs scheduled under their own floor point the other
 * way, because those take minutes rather than giving them.
 */
function drawMargin(
  ctx: CanvasRenderingContext2D,
  line: DelayLine,
  frame: RecoveryFrame,
  stage: Stage,
  zoom: number,
): void {
  if (frame.margin < 0.01) return;
  const legs = line.margin.length;
  if (legs === 0) return;

  const band = stage.margin;
  const reveal = frame.margin;
  const widest = Math.max(
    MARGIN_FLOOR_MIN,
    ...line.margin.map(Math.abs),
    ...line.marginAlt.map(Math.abs),
  );
  const unit = (band.height * 0.82) / widest;

  ctx.font = MONO;
  ctx.fillStyle = `rgba(255,255,255,${0.3 * reveal})`;
  ctx.textAlign = "right";
  // Clear of the baseline, which is where the on-time marks pile up: at six pixels
  // the label was being written through them.
  ctx.fillText("↓ recovery margin per leg", band.left + band.width, band.top - 15);
  ctx.textAlign = "left";

  for (let leg = 0; leg < legs; leg++) {
    const rank = leg / Math.max(1, legs - 1);
    const present = arrival(rank, reveal, 0.22);
    if (present < 0.01) continue;

    const from = projectX(leg / legs, frame, band);
    const to = projectX((leg + 1) / legs, frame, band);
    const w = Math.max(1, to - from - 1);

    const now = line.margin[leg];
    const moved = now + (line.marginAlt[leg] - now) * clamp01(frame.budget);
    const negative = moved < 0;
    const h = Math.abs(moved) * unit * present;

    ctx.fillStyle = rgba(negative ? AMBER : TEAL, (negative ? 0.68 : 0.52) * present);
    ctx.fillRect(from, negative ? band.top - h : band.top, w, h);

    // Where the budget moved a leg, the height it had stays as a rule, so the beat
    // reads as minutes being taken from one leg and given to another.
    if (frame.budget > 0.02 && Math.abs(moved - now) > 0.05) {
      const was = band.top + Math.abs(now) * unit * present * (now < 0 ? -1 : 1);
      ctx.strokeStyle = rgba(MIST, 0.34 * present);
      ctx.lineWidth = strokeWeight(1, zoom);
      ctx.beginPath();
      ctx.moveTo(from, was);
      ctx.lineTo(from + w, was);
      ctx.stroke();
    }
  }
}

export type SurvivalPoint = {
  median: number;
  low: number;
  high: number;
};

/**
 * The decay curve with its day-to-day band, on its own labelled axis.
 *
 * Its x is stops *after* a late arrival, which is not the same quantity as a
 * mark's position in the run, so it gets its own panel rather than being laid over
 * the field on an unnamed second scale. The figures are the pack's, never counted
 * off the marks — the marks are illustrative and the curve is evidence.
 */
function drawSurvival(
  ctx: CanvasRenderingContext2D,
  series: SurvivalPoint[],
  frame: RecoveryFrame,
  band: Band,
  zoom: number,
  colour: [number, number, number],
  label: string,
  labelAt: number,
  weight: number,
): void {
  if (frame.curve < 0.01 || weight < 0.01 || series.length === 0) return;
  const alpha = smoothstep(frame.curve) * weight;
  const xOf = (i: number) =>
    band.left + (i / Math.max(1, series.length - 1)) * band.width;
  const yOf = (share: number) => band.top + (1 - clamp01(share)) * band.height;

  // The curve is drawn up to a fractional stop rather than a whole one. Six
  // frozen points stepped one at a time read as a growing box; interpolating the
  // leading edge makes the same arrival read as a line being drawn.
  const last = series.length - 1;
  const reach = clamp01(frame.curve * 1.25) * last;
  if (reach < 0.05) return;
  const whole = Math.floor(reach);
  const tip = reach - whole;
  const edge = (read: (point: SurvivalPoint) => number) =>
    whole >= last
      ? read(series[last])
      : lerp(read(series[whole]), read(series[whole + 1]), tip);

  const trace = (read: (point: SurvivalPoint) => number, back: boolean) => {
    const order = [];
    for (let i = 0; i <= Math.min(whole, last); i++) order.push([xOf(i), yOf(read(series[i]))]);
    order.push([
      band.left + (reach / Math.max(1, last)) * band.width,
      yOf(edge(read)),
    ]);
    if (back) order.reverse();
    return order;
  };

  ctx.beginPath();
  trace((p) => p.high, false).forEach(([x, y], i) =>
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y),
  );
  trace((p) => p.low, true).forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
  ctx.fillStyle = rgba(colour, 0.07 * alpha);
  ctx.fill();

  const median = trace((p) => p.median, false);
  ctx.beginPath();
  median.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.strokeStyle = rgba(colour, 0.85 * alpha);
  ctx.lineWidth = strokeWeight(2, zoom);
  ctx.stroke();

  const [tipX, tipY] = median[median.length - 1];
  ctx.fillStyle = rgba(colour, 0.8 * alpha);
  ctx.font = MONO;
  ctx.textAlign = "right";
  ctx.fillText(label, tipX - 8, tipY + labelAt);
  ctx.textAlign = "left";
}

function drawSurvivalAxis(
  ctx: CanvasRenderingContext2D,
  band: Band,
  stops: number,
  frame: RecoveryFrame,
): void {
  const alpha = smoothstep(frame.curve);
  if (alpha < 0.01) return;
  ctx.font = MONO;
  ctx.fillStyle = `rgba(255,255,255,${0.025 * alpha})`;
  ctx.fillRect(band.left, band.top, band.width, band.height);

  for (const share of [0, 0.5, 1]) {
    const y = band.top + (1 - share) * band.height;
    ctx.strokeStyle = `rgba(255,255,255,${0.06 * alpha})`;
    ctx.beginPath();
    ctx.moveTo(band.left, y);
    ctx.lineTo(band.left + band.width, y);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.32 * alpha})`;
    ctx.fillText(`${Math.round(share * 100)}%`, band.left + band.width + 8, y + 3);
  }

  ctx.fillStyle = `rgba(255,255,255,${0.32 * alpha})`;
  ctx.fillText("still late, stops after a late arrival →", band.left + 4, band.top - 6);
  ctx.fillStyle = `rgba(255,255,255,${0.22 * alpha})`;
  for (let i = 0; i < stops; i++) {
    const x = band.left + (i / Math.max(1, stops - 1)) * band.width;
    ctx.textAlign = i === stops - 1 ? "right" : "left";
    ctx.fillText(`+${i + 1}`, i === stops - 1 ? x : x + 3, band.top + band.height + 13);
  }
  ctx.textAlign = "left";
}

export type DelayDrawContext = {
  /** Line the reader has selected. */
  lineIndex: number;
  /** Decay curve for that line, from the pack. */
  survival: SurvivalPoint[];
  /** Decay curves per service type, from the pack, for the split beat. */
  survivalByService: [SurvivalPoint[], SurvivalPoint[]];
};

export function drawDelays(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  model: DelayFieldModel,
  frame: RecoveryFrame,
  context: DelayDrawContext,
  motion: Motion = STILL,
  copyTop = Number.POSITIVE_INFINITY,
): void {
  ctx.clearRect(0, 0, width, height);

  const stage = stageOf(width, height, frame, copyTop);
  const zoom = BASE_SPAN / Math.max(frame.spanX, 1e-3);
  const line = model.lines[context.lineIndex] ?? model.lines[0];

  ctx.save();
  ctx.beginPath();
  const slack = stage.frame.width * CREEP_SLACK;
  ctx.rect(
    stage.frame.left - 2 - slack,
    0,
    stage.frame.width + 2 + AXIS_GUTTER_PX + 2 * slack,
    height,
  );
  ctx.clip();
  // Clip first, creep second: the frame is the stage's edge and the camera moves
  // inside it, so a push in does not spill over the narration.
  creepStage(ctx, stage, cameraCreep(motion.time, frame.hold, motion.life));

  drawDelayAxis(ctx, stage, frame, line, zoom);
  drawMargin(ctx, line, frame, stage, zoom);

  // Emptied rather than replaced, so the backing stores survive the frame.
  for (const batch of MARK_BATCHES) batch.length = 0;

  const push = (layer: number, alpha: number, x: number, y: number, radius: number) => {
    const step = Math.round(clamp01(alpha) * ALPHA_STEPS);
    if (step === 0) return;
    MARK_BATCHES[layer * ALPHA_STEPS + step - 1].push(x, y, radius);
  };

  const stride = backdropStride(width, height);
  const strengths = line.variantStrength;
  for (const mark of model.marks) {
    const onLine = mark.lineIndex === context.lineIndex;
    if (!onLine && stride > 1 && mark.runIndex % stride !== 0) continue;
    const onRun =
      onLine &&
      mark.lineIndex === model.featured.lineIndex &&
      mark.runIndex === model.featured.runIndex;

    // Every gate that can be decided without touching the mark's minutes comes
    // first, because past Act I the camera is on one line and five sixths of the
    // field is under the threshold where a mark contributes a visible pixel.
    // Paying `lateAt` and `markLife` for those was what cost the film a frame.
    let alpha = onLine ? 1 : 0.5 * (1 - 0.97 * frame.lineFocus);
    if (alpha < ALPHA_FLOOR) continue;

    // The field is written on in stop order, so it is made rather than faded up.
    const present = onRun
      ? arrival(mark.stopShare, clamp01(frame.run + frame.carry), 0.08)
      : arrival(rankJitter(mark.id, mark.stopShare), frame.population);
    if (present < 0.01) continue;
    alpha *= present;

    if (frame.run > 0.01 && !onRun) alpha *= 1 - 0.86 * frame.run;
    if (alpha < ALPHA_FLOOR) continue;

    const scrubbed = lateAt(mark, strengths, frame.budget);
    // On-time arrivals sit back so the late population is what the reader sees,
    // since that is the population every figure after Act III is about.
    if (onLine) alpha *= onRun || scrubbed >= LATE_MIN ? 0.88 : 0.34;

    // Acts II–III: the run leaves on time, then the delay is handed along it. The
    // lag is the recorded difference between two logged times, and the wave runs
    // in the direction of travel.
    const late = onRun
      ? scrubbed * leadLag(frame.carry, mark.stopShare, CARRY_SPREAD)
      : scrubbed;

    const isLate = late >= LATE_MIN;
    // The traced run is privileged only while the film is on it. `onRun` says which
    // run it is; `frame.run` says whether the film is still looking at it. Reading
    // only the first left a handful of fat cyan dots sitting among the population
    // for the seven acts after the camera had left them — loudest thing in the
    // frame at the closing beat, and a leftover from two acts earlier rather than
    // anything a reader could read. So the run dissolves back into the field it
    // came from, which is also what Act IV claims: the curve comes out of *every*
    // late train, not out of the one the film followed.
    const asRun = onRun ? clamp01(frame.run) : 0;
    const fieldRadius = 2.4 + (isLate ? 2 : 0);
    const runRadius = 4 + 4 * frame.focusY;
    const life = markLife(
      mark.id,
      motion.time,
      lerp(fieldRadius, runRadius, asRun),
      motion.life,
    );

    const x = projectX(mark.stopShare, frame, stage.delay) + life.dx;
    // Most arrivals are on time, so without a seeded nudge every one of them
    // stacks on the exact same pixel and the baseline reads as a ruled line
    // rather than the majority of the population that it is. The traced run keeps
    // its own exact position, so its path is a path.
    const spread = (1 - asRun) * (mark.row - 0.5) * 7;
    const y = projectY(late, frame, stage.delay) + spread + life.dy;
    if (y < stage.delay.top - 2 || y > stage.delay.top + stage.delay.height + 2) continue;

    const a = clamp01(alpha * life.glow);
    // Mid-dissolve the mark is pushed into both layers at complementary weights,
    // which is the one place a mark is drawn twice. Twenty-four marks, once.
    if (asRun > 0.01) push(LAYER_CYAN, a * asRun, x, y, runRadius);
    if (asRun < 0.99) {
      push(isLate ? LAYER_AMBER : LAYER_MIST, a * (1 - asRun), x, y, fieldRadius);
    }
  }

  for (let layer = 0; layer < MARK_LAYERS.length; layer++) {
    for (let step = 1; step <= ALPHA_STEPS; step++) {
      const batch = MARK_BATCHES[layer * ALPHA_STEPS + step - 1];
      if (batch.length === 0) continue;
      ctx.beginPath();
      for (let i = 0; i < batch.length; i += 3) {
        // The arc opens at angle 0, so moving there first starts a fresh sub-path
        // instead of drawing a line from wherever the last mark finished.
        ctx.moveTo(batch[i] + batch[i + 2], batch[i + 1]);
        ctx.arc(batch[i], batch[i + 1], batch[i + 2], 0, Math.PI * 2);
      }
      ctx.fillStyle = rgba(MARK_LAYERS[layer], step / ALPHA_STEPS);
      ctx.fill();
    }
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
    ctx.strokeStyle = rgba(CYAN, 0.55 * frame.run);
    ctx.lineWidth = strokeWeight(1.5, zoom);
    ctx.beginPath();
    let started = false;
    for (const mark of run) {
      if (arrival(mark.stopShare, clamp01(frame.run + frame.carry), 0.08) < 0.5) break;
      const late =
        lateAt(mark, strengths, frame.budget) *
        leadLag(frame.carry, mark.stopShare, CARRY_SPREAD);
      const x = projectX(mark.stopShare, frame, stage.delay);
      const y = projectY(late, frame, stage.delay);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Act V divides the population in two — but by then the camera is on one line,
  // and a line is one service, so there is only ever one service among the marks.
  // Splitting them would have drawn a division that is not in what is on screen,
  // and the two figures the beat prints (89% against 72%) are network-wide anyway.
  // So the split happens where its evidence is: the curve dissolves into two.
  //
  // A dissolve rather than a switch. `split` used to pick one branch or the other
  // past 0.2, which made a channel the cue table reports as moving for a whole beat
  // produce exactly one visible event, in the middle, as a pop.
  drawSurvivalAxis(ctx, stage.survival, context.survival.length, frame);
  const asPair = smoothstep(frame.split);
  drawSurvival(ctx, context.survival, frame, stage.survival, zoom, CYAN, "this line", -8, 1 - asPair);
  drawSurvival(ctx, context.survivalByService[0], frame, stage.survival, zoom, AMBER, "commuter", -8, asPair);
  drawSurvival(ctx, context.survivalByService[1], frame, stage.survival, zoom, TEAL, "long-distance", 16, asPair);

  ctx.restore();

  // Selected line, named on the canvas so a picker change is legible without copy.
  if (frame.lineFocus > 0.5) {
    ctx.fillStyle = `rgba(255,255,255,${0.55 * smoothstep((frame.lineFocus - 0.5) / 0.5)})`;
    ctx.font = "500 11px ui-monospace, monospace";
    ctx.fillText(line.label, stage.frame.left, stage.frame.top - 34);
  }
}
