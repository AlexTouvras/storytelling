/**
 * The agentic stack, drawn as a consulting exhibit.
 *
 * The register here is a deck exhibit, not a film: white paper, hairline rules,
 * ink labels, orthogonal box-and-arrow linework, one steel blue and one rust
 * accent. Five ruled rows, one per layer, built one at a time as the beats
 * arrive, with a stub column of row labels on the left and a wash highlight that
 * slides to whichever row the slide is about.
 *
 * Three departures from the landing flight's craft rules, all deliberate:
 *
 *   1. **This picture is labelled.** Rule 6 there ("the picture stays
 *      unlabelled") protects a metaphor from being captioned into a diagram.
 *      Here the diagram *is* the subject — a named taxonomy is what the field
 *      card publishes — so the labels are the content. The canvas stays
 *      `aria-hidden` and every label also exists in the DOM.
 *   2. **No jitter and no glow.** A hand-drawn wobble is what made the first cut
 *      of this board read as messy. An exhibit is ruled. What keeps it alive
 *      through a held beat is camera creep across high-contrast linework plus
 *      the tokens travelling the flow arrows — both measured by
 *      `e2e/dead-air.spec.ts`, neither of them decoration.
 *   3. **The camera may overrule the cue table horizontally.** The table asks
 *      for a vertical span; the width comes from `requiredExtent`, so a narrow
 *      frame gets a wider shot rather than a cropped exhibit.
 */

import {
  arrival,
  cameraCreep,
  clamp01,
  hash,
  leadLag,
  lerp,
  smoothstep,
  strokeWeight,
  STILL,
  type Motion,
} from "@/components/film/craft";
import type { LectureFrame } from "@/components/lecture/lecture-frame";

type Rgb = readonly [number, number, number];

/** Palette lifted off the published field cards. Paper, ink, steel, rust. */
const INK: Rgb = [24, 33, 43];
const INK_SOFT: Rgb = [58, 70, 84];
const MUTED: Rgb = [107, 119, 133];
const LINE: Rgb = [185, 197, 209];
const STEEL: Rgb = [36, 90, 122];
const WASH: Rgb = [232, 238, 244];
const SIGNAL: Rgb = [15, 118, 110];
const WARN: Rgb = [154, 52, 18];
const PAPER: Rgb = [255, 255, 255];

/** Widest span the cue table reaches, so zoom is 1 at the pulled-back end. */
const WIDEST_SPAN = 7.8;

/**
 * The five rows, each with the world y of its own content and the y of the
 * hairline rule above it. Codes and one-word jobs are the card's own; they are
 * duplicated here because a canvas cannot read JSON, and the card is frozen.
 */
const ROWS = [
  { code: "LLM", note: "language", y: 0, top: -0.72 },
  { code: "RAG", note: "knowledge", y: 1.35, top: 0.66 },
  { code: "AGENT", note: "control loop", y: 3.05, top: 1.98 },
  { code: "MCP", note: "tools", y: 4.8, top: 4.18 },
  { code: "A2A", note: "peers", y: 6.3, top: 5.72 },
] as const;
/** Bottom of the last row's band. */
const ROW_END = 6.7;

/** The model box on row 1, and how far its prompt and answer reach. */
const MODEL_W = 1.5;
const MODEL_H = 0.48;
const MODEL_REACH = 1.25;

/** The corpus grid on row 2. */
const DOC_COLS = 5;
const DOC_ROWS = 2;
const DOC_W = 0.26;
const DOC_H = 0.3;
const DOC_GAP = 0.07;
const DOC_CX = -1.25;

/** The control cycle on row 3: four boxes at the corners of a rectangle. */
const CYCLE_DX = 0.95;
const CYCLE_DY = 0.62;
const CYCLE_BOX_W = 1.1;
const CYCLE_BOX_H = 0.32;
const CYCLE = [
  { label: "PLAN", sx: -1, sy: -1 },
  { label: "ACT", sx: 1, sy: -1 },
  { label: "OBSERVE", sx: 1, sy: 1 },
  { label: "STOP", sx: -1, sy: 1 },
] as const;

/**
 * Where Approve sits on the cycle, as a fraction of the perimeter clockwise from
 * PLAN: halfway down the act → observe side, after the decision and before the
 * write lands.
 */
const GATE_U = 0.401;
/** How hard the gate brakes the runner. Under 1, so the cycle never reverses. */
const GATE_BRAKE = 0.93;
/** Laps per second of the control cycle. */
const RUN_RATE = 0.13;

/** The tool bus on row 4, and the systems hanging off it. */
const BUS_Y = 4.4;
const BUS_X = 1.75;
const TOOL_W = 0.98;
const TOOL_H = 0.34;
const TOOLS = [
  { label: "ERP", x: -1.65 },
  { label: "JIRA", x: -0.55 },
  { label: "LEDGER", x: 0.55 },
  { label: "STRIPE", x: 1.65 },
] as const;

/** Row 5: the boundary, the peer, and the peer's own tools. */
const PEER_X = -0.55;
const PEER_W = 1.75;
const PEER_H = 0.4;
const PEER_TOOLS_X = 1.6;
const PEER_TOOLS_W = 1.8;
const PEER_TOOLS_H = 0.34;
const HANDOFF_X = -2.35;

function rgba(rgb: Rgb, a: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.max(0, Math.min(1, a))})`;
}

type Pt = readonly [number, number];

type View = {
  w: number;
  h: number;
  /** Screen x of world x = 0, and screen y of the cue's camera centre. */
  ox: number;
  oy: number;
  scale: number;
  zoom: number;
  /** Diagram box: the panel inside the row-header stub column. */
  boxX0: number;
  boxX1: number;
  /** Rule extent, so the row rules run the full width of the panel. */
  ruleX0: number;
  ruleX1: number;
  headers: boolean;
  /** Text size for labels inside the drawing, derived from the camera. */
  fs: number;
};

/**
 * How much world width the beat's own objects need. Continuous in every channel,
 * so the frame widens as a row is built rather than stepping when it crosses a
 * threshold. The camera pulls out until this fits.
 */
export function requiredExtent(frame: LectureFrame): { x0: number; x1: number } {
  // A channel has claimed its full width by the time it is halfway in.
  const on = (v: number) => clamp01(v / 0.5);
  let x0 = -MODEL_REACH;
  let x1 = MODEL_REACH;
  const widen = (to0: number, to1: number, k: number) => {
    x0 = Math.min(x0, lerp(-MODEL_REACH, to0, k));
    x1 = Math.max(x1, lerp(MODEL_REACH, to1, k));
  };
  widen(-2.1, MODEL_REACH, on(frame.corpus));
  widen(-1.6, 1.6, on(frame.loop));
  // The Approve callout sets the widest shot of the run: it is three lines of
  // type hanging off the right of the cycle, and it must not run off the panel.
  widen(-1.6, 2.85, on(frame.gate));
  widen(-2.2, 2.2, on(frame.reach));
  widen(-2.45, 2.55, on(frame.peers));
  return { x0, x1 };
}

function makeView(frame: LectureFrame, motion: Motion, w: number, h: number): View {
  const creep = cameraCreep(motion.time, frame.hold, motion.life);
  const spanY = frame.spanY * creep.span;
  const cy = frame.cy + frame.spanY * creep.pan;

  const padX = w < 520 ? 8 : 14;
  const padY = 8;
  // The row headers are the exhibit's stub column. On a phone there is only room
  // for the code, and below that the drawing needs every pixel.
  const headers = w >= 300;
  const headerW = headers ? (w < 460 ? 50 : 88) : 0;

  const boxX0 = padX + headerW;
  const boxX1 = w - padX;
  const boxW = Math.max(60, boxX1 - boxX0);
  const boxH = Math.max(60, h - padY * 2);

  const ext = requiredExtent(frame);
  const scale = Math.min(boxH / spanY, boxW / (ext.x1 - ext.x0));

  return {
    w,
    h,
    ox: (boxX0 + boxX1) / 2 - ((ext.x0 + ext.x1) / 2) * scale,
    oy: padY + boxH / 2 - cy * scale,
    scale,
    zoom: scale / (boxH / WIDEST_SPAN),
    boxX0,
    boxX1,
    ruleX0: padX,
    ruleX1: w - padX,
    headers,
    fs: Math.max(7.5, Math.min(11.5, scale * 0.135)),
  };
}

function px(v: View, wx: number): number {
  return v.ox + wx * v.scale;
}

function py(v: View, wy: number): number {
  return v.oy + wy * v.scale;
}

function sans(
  ctx: CanvasRenderingContext2D,
  size: number,
  weight = 500,
  track = 0,
): void {
  ctx.font = `${weight} ${size}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  // Tracked caps are half the reason an exhibit reads as typeset rather than
  // plotted. Guarded because not every 2D context exposes it.
  if ("letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${track}em`;
  }
}

type TextOptions = {
  size: number;
  color: Rgb;
  alpha: number;
  weight?: number;
  track?: number;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
};

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  o: TextOptions,
): void {
  if (o.alpha < 0.02) return;
  sans(ctx, o.size, o.weight ?? 500, o.track ?? 0);
  ctx.textAlign = o.align ?? "left";
  ctx.textBaseline = o.baseline ?? "alphabetic";
  ctx.fillStyle = rgba(o.color, o.alpha);
  ctx.fillText(value, x, y);
}

function rule(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y: number,
  x1: number,
  color: Rgb,
  alpha: number,
  weight = 1,
  dash?: readonly number[],
): void {
  if (alpha < 0.02) return;
  ctx.save();
  if (dash) ctx.setLineDash([...dash]);
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = weight;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  ctx.restore();
}

function segLength(a: Pt, b: Pt): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function pathLength(pts: readonly Pt[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += segLength(pts[i - 1], pts[i]);
  return total;
}

/** Draw a polyline up to `upTo` of its arclength, so a path can be made. */
function strokePath(
  ctx: CanvasRenderingContext2D,
  pts: readonly Pt[],
  upTo = 1,
): void {
  const total = pathLength(pts);
  let want = clamp01(upTo) * total;
  if (want <= 0.5) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && want > 0; i++) {
    const seg = segLength(pts[i - 1], pts[i]);
    if (seg <= 0) continue;
    const u = Math.min(1, want / seg);
    ctx.lineTo(
      lerp(pts[i - 1][0], pts[i][0], u),
      lerp(pts[i - 1][1], pts[i][1], u),
    );
    want -= seg;
  }
  ctx.stroke();
}

type Along = { x: number; y: number; dx: number; dy: number };

function pointAlong(pts: readonly Pt[], t: number): Along {
  const total = pathLength(pts);
  let want = clamp01(t) * total;
  for (let i = 1; i < pts.length; i++) {
    const seg = segLength(pts[i - 1], pts[i]);
    if (seg <= 0) continue;
    if (want <= seg || i === pts.length - 1) {
      const u = Math.min(1, want / seg);
      return {
        x: lerp(pts[i - 1][0], pts[i][0], u),
        y: lerp(pts[i - 1][1], pts[i][1], u),
        dx: (pts[i][0] - pts[i - 1][0]) / seg,
        dy: (pts[i][1] - pts[i - 1][1]) / seg,
      };
    }
    want -= seg;
  }
  const last = pts[pts.length - 1];
  return { x: last[0], y: last[1], dx: 1, dy: 0 };
}

function arrowHead(
  ctx: CanvasRenderingContext2D,
  at: Along,
  size: number,
  color: Rgb,
  alpha: number,
): void {
  if (alpha < 0.02) return;
  const nx = -at.dy;
  const ny = at.dx;
  ctx.fillStyle = rgba(color, alpha);
  ctx.beginPath();
  ctx.moveTo(at.x, at.y);
  ctx.lineTo(at.x - at.dx * size + nx * size * 0.42, at.y - at.dy * size + ny * size * 0.42);
  ctx.lineTo(at.x - at.dx * size - nx * size * 0.42, at.y - at.dy * size - ny * size * 0.42);
  ctx.closePath();
  ctx.fill();
}

/** An orthogonal connector: made in order, then tipped with an arrowhead. */
function connector(
  ctx: CanvasRenderingContext2D,
  v: View,
  pts: readonly Pt[],
  drawn: number,
  color: Rgb,
  alpha: number,
  weight = 1.1,
): void {
  if (alpha < 0.02 || drawn < 0.02) return;
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = strokeWeight(weight, v.zoom);
  ctx.lineJoin = "miter";
  strokePath(ctx, pts, drawn);
  if (drawn > 0.985) {
    arrowHead(ctx, pointAlong(pts, 1), strokeWeight(5.2, v.zoom), color, alpha);
  }
}

/** A token travelling a connector, so a static diagram still reads as a flow. */
function token(
  ctx: CanvasRenderingContext2D,
  v: View,
  pts: readonly Pt[],
  u: number,
  color: Rgb,
  alpha: number,
  square = false,
): void {
  if (alpha < 0.02) return;
  const at = pointAlong(pts, u);
  const s = strokeWeight(square ? 3.4 : 2.6, v.zoom);
  ctx.fillStyle = rgba(color, alpha);
  if (square) {
    ctx.fillRect(at.x - s / 2, at.y - s / 2, s, s);
  } else {
    ctx.beginPath();
    ctx.arc(at.x, at.y, s, 0, Math.PI * 2);
    ctx.fill();
  }
}

type BoxStyle = {
  fill?: Rgb;
  fillAlpha?: number;
  stroke: Rgb;
  alpha: number;
  weight?: number;
};

/** A ruled box in world coordinates. Square corners: this is an exhibit. */
function box(
  ctx: CanvasRenderingContext2D,
  v: View,
  cx: number,
  cy: number,
  w: number,
  h: number,
  style: BoxStyle,
): { x: number; y: number; w: number; h: number } {
  const x = px(v, cx - w / 2);
  const y = py(v, cy - h / 2);
  const bw = w * v.scale;
  const bh = h * v.scale;
  if (style.alpha >= 0.02) {
    // Paper is opaque well before its rule is at full weight: a box has to mask
    // the runner travelling underneath it, or the token ghosts through.
    ctx.fillStyle = rgba(
      style.fill ?? PAPER,
      style.fillAlpha ?? clamp01(style.alpha / 0.8),
    );
    ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = rgba(style.stroke, style.alpha);
    ctx.lineWidth = strokeWeight(style.weight ?? 1.2, v.zoom);
    ctx.strokeRect(x, y, bw, bh);
  }
  return { x, y, w: bw, h: bh };
}

function rowOn(frame: LectureFrame): number[] {
  const unearned = 1 - 0.7 * frame.thin;
  return [
    frame.model,
    frame.corpus,
    frame.loop,
    frame.reach,
    frame.peers * unearned,
  ];
}

function rowBottom(index: number): number {
  return index < ROWS.length - 1 ? ROWS[index + 1].top : ROW_END;
}

/** The highlight's band, interpolated so a moving focus slides, never blinks. */
function focusBand(focus: number): { top: number; bottom: number } {
  const i = Math.max(0, Math.min(ROWS.length - 1, Math.floor(focus)));
  const j = Math.min(ROWS.length - 1, i + 1);
  const t = clamp01(focus - i);
  return {
    top: lerp(ROWS[i].top, ROWS[j].top, t),
    bottom: lerp(rowBottom(i), rowBottom(j), t),
  };
}

function drawFocus(ctx: CanvasRenderingContext2D, v: View, frame: LectureFrame): void {
  if (frame.focusOn < 0.02) return;
  const band = focusBand(frame.focus);
  const top = py(v, band.top);
  const bottom = py(v, band.bottom);
  ctx.fillStyle = rgba(WASH, 0.95 * frame.focusOn);
  ctx.fillRect(v.ruleX0, top, v.ruleX1 - v.ruleX0, bottom - top);
  // One weighted edge, so the highlight has a side rather than floating.
  ctx.fillStyle = rgba(STEEL, 0.5 * frame.focusOn);
  ctx.fillRect(v.ruleX0, top, 2, bottom - top);
}

function drawRows(ctx: CanvasRenderingContext2D, v: View, frame: LectureFrame): void {
  const on = rowOn(frame);
  const band = focusBand(frame.focus);

  ROWS.forEach((row, i) => {
    const a = on[i];
    if (a < 0.02) return;
    const y = py(v, row.top);
    // Row 5's rule is the ownership boundary itself, so it is drawn dashed.
    const boundary = row.code === "A2A";
    rule(
      ctx,
      v.ruleX0,
      y,
      v.ruleX1,
      boundary ? STEEL : LINE,
      (boundary ? 0.55 : 0.9) * a,
      1,
      boundary ? [4, 4] : undefined,
    );

    if (boundary) {
      text(ctx, "OWNERSHIP BOUNDARY", v.ruleX1, y - 5, {
        size: 8.5,
        color: MUTED,
        alpha: 0.9 * a,
        weight: 600,
        track: 0.1,
        align: "right",
      });
    }

    if (!v.headers) return;
    const focused =
      frame.focusOn * clamp01(1 - Math.abs(row.top - band.top) * 1.6);
    text(ctx, String(i + 1), v.ruleX0, y + 13, {
      size: 9,
      color: MUTED,
      alpha: 0.85 * a,
      weight: 600,
    });
    text(ctx, row.code, v.ruleX0 + 13, y + 13, {
      size: 9.5,
      color: focused > 0.4 ? STEEL : INK_SOFT,
      alpha: 0.95 * a,
      weight: 700,
      track: 0.08,
    });
    if (v.boxX0 - v.ruleX0 >= 80) {
      text(ctx, row.note, v.ruleX0 + 13, y + 25, {
        size: 8.5,
        color: MUTED,
        alpha: 0.9 * a,
      });
    }
  });
}

/** Row 1: the model, with words in and words out. Nothing else. */
function drawModel(
  ctx: CanvasRenderingContext2D,
  v: View,
  frame: LectureFrame,
  anim: number,
): void {
  const a = frame.model;
  if (a < 0.02) return;

  const inPath: Pt[] = [
    [px(v, -MODEL_REACH), py(v, 0)],
    [px(v, -MODEL_W / 2), py(v, 0)],
  ];
  const outPath: Pt[] = [
    [px(v, MODEL_W / 2), py(v, 0)],
    [px(v, MODEL_REACH), py(v, 0)],
  ];

  connector(ctx, v, inPath, smoothstep(a / 0.6), INK_SOFT, 0.7 * a);
  connector(ctx, v, outPath, smoothstep((a - 0.2) / 0.6), INK_SOFT, 0.7 * a);

  token(ctx, v, inPath, (anim * 0.34) % 1, STEEL, 0.85 * a, true);
  token(ctx, v, outPath, (anim * 0.34 + 0.5) % 1, SIGNAL, 0.85 * a, true);

  text(ctx, "prompt", px(v, -(MODEL_REACH + MODEL_W / 2) / 2), py(v, 0) - 7, {
    size: v.fs * 0.86,
    color: MUTED,
    alpha: 0.95 * a,
    align: "center",
  });
  text(ctx, "answer", px(v, (MODEL_REACH + MODEL_W / 2) / 2), py(v, 0) - 7, {
    size: v.fs * 0.86,
    color: MUTED,
    alpha: 0.95 * a,
    align: "center",
  });

  const b = box(ctx, v, 0, 0, MODEL_W, MODEL_H, {
    fill: PAPER,
    stroke: INK,
    alpha: 0.9 * a,
    weight: 1.5,
  });
  text(ctx, "MODEL", b.x + b.w / 2, b.y + b.h / 2, {
    size: v.fs,
    color: INK,
    alpha: a,
    weight: 700,
    track: 0.1,
    align: "center",
    baseline: "middle",
  });
}

function docAt(i: number): { wx: number; wy: number; rank: number } {
  const col = i % DOC_COLS;
  const row = Math.floor(i / DOC_COLS);
  const gridW = DOC_COLS * DOC_W + (DOC_COLS - 1) * DOC_GAP;
  const wx = DOC_CX - gridW / 2 + DOC_W / 2 + col * (DOC_W + DOC_GAP);
  const wy = ROWS[1].y - (DOC_H + 0.1) / 2 + row * (DOC_H + 0.1);
  // Reading order, left to right and top to bottom. No jitter: this is a grid.
  return { wx, wy, rank: (row * DOC_COLS + col) / (DOC_COLS * DOC_ROWS - 1) };
}

/** Row 2: the library. Sheets are placed in reading order, not faded up. */
function drawCorpus(
  ctx: CanvasRenderingContext2D,
  v: View,
  frame: LectureFrame,
): void {
  const a = frame.corpus;
  if (a < 0.02) return;

  for (let i = 0; i < DOC_COLS * DOC_ROWS; i++) {
    const doc = docAt(i);
    const present = arrival(doc.rank, a, 0.3);
    if (present < 0.02) continue;
    const b = box(ctx, v, doc.wx, doc.wy, DOC_W, DOC_H, {
      fill: PAPER,
      stroke: LINE,
      alpha: 0.95 * present,
      weight: 1,
    });
    // Two ruled lines per sheet: enough to read as a document, not as a tile.
    for (let k = 0; k < 2; k++) {
      rule(
        ctx,
        b.x + b.w * 0.18,
        b.y + b.h * (0.34 + k * 0.28),
        b.x + b.w * (k === 0 ? 0.82 : 0.66),
        MUTED,
        0.45 * present,
      );
    }
  }

  const gridW = DOC_COLS * DOC_W + (DOC_COLS - 1) * DOC_GAP;
  text(ctx, "YOUR DOCUMENTS", px(v, DOC_CX - gridW / 2), py(v, 1.9), {
    size: v.fs * 0.86,
    color: MUTED,
    alpha: 0.95 * a,
    weight: 600,
    track: 0.09,
  });
}

/** The retrieve-and-cite return path: find the passage, answer from it. */
function drawGround(
  ctx: CanvasRenderingContext2D,
  v: View,
  frame: LectureFrame,
  anim: number,
): void {
  const a = frame.ground;
  if (a < 0.02) return;
  const gridW = DOC_COLS * DOC_W + (DOC_COLS - 1) * DOC_GAP;
  const path: Pt[] = [
    [px(v, DOC_CX + gridW / 2), py(v, ROWS[1].y)],
    [px(v, 0), py(v, ROWS[1].y)],
    [px(v, 0), py(v, MODEL_H / 2)],
  ];
  connector(ctx, v, path, smoothstep(a / 0.7), STEEL, 0.8 * a, 1.3);
  token(ctx, v, path, (anim * 0.26) % 1, STEEL, 0.9 * a);
  text(ctx, "retrieve + cite", px(v, 0) + 7, py(v, 0.85), {
    size: v.fs * 0.9,
    color: STEEL,
    alpha: 0.95 * a,
    weight: 600,
  });
}

function cycleCorner(i: number): Pt {
  const node = CYCLE[i];
  return [node.sx * CYCLE_DX, ROWS[2].y + node.sy * CYCLE_DY];
}

/** The runner's closed path: PLAN → ACT → OBSERVE → STOP → PLAN, clockwise. */
function cyclePath(v: View): Pt[] {
  const order = [0, 1, 2, 3, 0];
  return order.map((i) => {
    const [wx, wy] = cycleCorner(i);
    return [px(v, wx), py(v, wy)] as Pt;
  });
}

/**
 * Where the runner sits at `anim`. Monotone in time, but it spends most of a lap
 * waiting at the gate once `gate` is up — the pause is the teaching point, so it
 * is a reparameterisation of the lap rather than a stop.
 */
export function runnerPhase(anim: number, gate: number): number {
  const TAU = Math.PI * 2;
  const base = (anim * RUN_RATE) % 1;
  const brake = clamp01(gate) * GATE_BRAKE;
  return base - (brake / TAU) * Math.sin(TAU * (base - GATE_U));
}

/** Row 3: the control cycle, and the gate that can stop it. */
function drawLoop(
  ctx: CanvasRenderingContext2D,
  v: View,
  frame: LectureFrame,
  anim: number,
): void {
  const a = frame.loop;
  if (a < 0.02) return;

  // Arrows between the corners, made in order: the cycle is assembled, not lit.
  for (let i = 0; i < 4; i++) {
    const from = cycleCorner(i);
    const to = cycleCorner((i + 1) % 4);
    const horizontal = Math.abs(from[1] - to[1]) < 1e-6;
    const dir = horizontal ? Math.sign(to[0] - from[0]) : Math.sign(to[1] - from[1]);
    const path: Pt[] = horizontal
      ? [
          [px(v, from[0] + dir * (CYCLE_BOX_W / 2)), py(v, from[1])],
          [px(v, to[0] - dir * (CYCLE_BOX_W / 2)), py(v, to[1])],
        ]
      : [
          [px(v, from[0]), py(v, from[1] + dir * (CYCLE_BOX_H / 2))],
          [px(v, to[0]), py(v, to[1] - dir * (CYCLE_BOX_H / 2))],
        ];
    connector(ctx, v, path, smoothstep((a - i * 0.2) / 0.28), INK_SOFT, 0.75 * a);
  }

  // The runner goes under the boxes, which are opaque: work enters a step, is
  // consumed, and leaves. Drawn before them for exactly that reason.
  if (frame.runner > 0.02) {
    const path = cyclePath(v);
    const phase = runnerPhase(anim, frame.gate);
    const at = pointAlong(path, phase);
    const s = strokeWeight(3.6, v.zoom);
    ctx.fillStyle = rgba(SIGNAL, 0.95 * frame.runner);
    ctx.fillRect(at.x - s / 2, at.y - s / 2, s, s);

    // The wait at the bar is the teaching point, so it is marked.
    const waiting = Math.abs(((phase - GATE_U + 1.5) % 1) - 0.5) < 0.04;
    if (waiting && frame.gate > 0.3) {
      ctx.strokeStyle = rgba(WARN, 0.6 * frame.gate);
      ctx.lineWidth = strokeWeight(1.2, v.zoom);
      ctx.strokeRect(at.x - s * 1.7, at.y - s * 1.7, s * 3.4, s * 3.4);
    }
  }

  CYCLE.forEach((node, i) => {
    const present = smoothstep((a - i * 0.2) / 0.24);
    if (present < 0.02) return;
    const [wx, wy] = cycleCorner(i);
    const b = box(ctx, v, wx, wy, CYCLE_BOX_W, CYCLE_BOX_H, {
      fill: PAPER,
      stroke: INK,
      alpha: 0.9 * present,
      weight: 1.3,
    });
    text(ctx, node.label, b.x + b.w / 2, b.y + b.h / 2, {
      size: v.fs * 0.94,
      color: INK,
      alpha: present,
      weight: 700,
      track: 0.08,
      align: "center",
      baseline: "middle",
    });
  });

  if (frame.gate > 0.02) {
    const g = frame.gate;
    const y = py(v, ROWS[2].y);
    const x = px(v, CYCLE_DX);
    const half = 0.25 * v.scale;
    ctx.strokeStyle = rgba(WARN, 0.95 * g);
    ctx.lineWidth = strokeWeight(2.8, v.zoom);
    ctx.beginPath();
    ctx.moveTo(x - half, y);
    ctx.lineTo(x + half, y);
    ctx.stroke();

    // The caption waits until the camera has finished making room for it: the
    // frame widens over the first half of the channel, the type arrives after.
    const caption = smoothstep((g - 0.45) / 0.35);
    rule(ctx, x + half, y, px(v, 1.38), WARN, 0.5 * caption, 1);
    const tx = px(v, 1.44);
    text(ctx, "HUMAN APPROVE", tx, y - v.fs * 0.6, {
      size: v.fs * 0.94,
      color: WARN,
      alpha: 0.95 * caption,
      weight: 700,
      track: 0.07,
    });
    text(ctx, "max steps · max €", tx, y + v.fs * 0.75, {
      size: v.fs * 0.82,
      color: INK_SOFT,
      alpha: 0.9 * caption,
    });
    text(ctx, "tool allowlist", tx, y + v.fs * 1.95, {
      size: v.fs * 0.82,
      color: INK_SOFT,
      alpha: 0.9 * caption,
    });
  }
}

/** Row 4: one bus, four systems, live reads and writes. */
function drawReach(
  ctx: CanvasRenderingContext2D,
  v: View,
  frame: LectureFrame,
  anim: number,
): void {
  const a = frame.reach;
  if (a < 0.02) return;

  // The trunk tees off the bottom of the cycle: the loop reaches out.
  const trunk: Pt[] = [
    [px(v, 0), py(v, ROWS[2].y + CYCLE_DY)],
    [px(v, 0), py(v, BUS_Y)],
  ];
  connector(ctx, v, trunk, smoothstep(a / 0.35), INK_SOFT, 0.7 * a);
  token(ctx, v, trunk, (anim * 0.4) % 1, STEEL, 0.85 * a);
  text(ctx, "tool calls", px(v, 0) - 7, py(v, (ROWS[2].y + CYCLE_DY + BUS_Y) / 2), {
    size: v.fs * 0.86,
    color: MUTED,
    alpha: 0.95 * a,
    align: "right",
    baseline: "middle",
  });

  const spread = smoothstep((a - 0.2) / 0.5);
  rule(
    ctx,
    px(v, -BUS_X),
    py(v, BUS_Y),
    px(v, -BUS_X + 2 * BUS_X * spread),
    STEEL,
    0.85 * a,
    strokeWeight(2.2, v.zoom),
  );
  text(ctx, "MCP", px(v, -BUS_X), py(v, BUS_Y) - 7, {
    size: v.fs * 0.9,
    color: STEEL,
    alpha: 0.95 * a,
    weight: 700,
    track: 0.09,
  });
  text(ctx, "one contract, many tools", px(v, -BUS_X) + v.fs * 2.9, py(v, BUS_Y) - 7, {
    size: v.fs * 0.82,
    color: MUTED,
    alpha: 0.9 * a,
  });

  TOOLS.forEach((tool, i) => {
    const rank = i / (TOOLS.length - 1);
    const drawn = leadLag(a, rank, 0.32);
    if (drawn < 0.02) return;
    const drop: Pt[] = [
      [px(v, tool.x), py(v, BUS_Y)],
      [px(v, tool.x), py(v, ROWS[3].y - TOOL_H / 2)],
    ];
    connector(ctx, v, drop, drawn, INK_SOFT, 0.6 * a);
    // Calls go down, answers come back: every other drop runs the other way.
    const raw = (anim * 0.33 + i * 0.25) % 1;
    token(ctx, v, drop, i % 2 === 0 ? raw : 1 - raw, i % 2 === 0 ? STEEL : SIGNAL, 0.8 * a);

    const present = arrival(rank, a, 0.3);
    if (present < 0.02) return;
    const b = box(ctx, v, tool.x, ROWS[3].y, TOOL_W, TOOL_H, {
      fill: PAPER,
      stroke: INK_SOFT,
      alpha: 0.85 * present,
      weight: 1.1,
    });
    text(ctx, tool.label, b.x + b.w / 2, b.y + b.h / 2, {
      size: v.fs * 0.86,
      color: INK_SOFT,
      alpha: present,
      weight: 600,
      track: 0.06,
      align: "center",
      baseline: "middle",
    });
  });
}

/** Row 5: a peer under another owner, keeping its own tools. */
function drawPeers(
  ctx: CanvasRenderingContext2D,
  v: View,
  frame: LectureFrame,
  anim: number,
): void {
  const a = frame.peers * (1 - 0.7 * frame.thin);
  if (a < 0.02) return;

  const handoff: Pt[] = [
    [px(v, -CYCLE_DX - CYCLE_BOX_W / 2), py(v, ROWS[2].y + CYCLE_DY)],
    [px(v, HANDOFF_X), py(v, ROWS[2].y + CYCLE_DY)],
    [px(v, HANDOFF_X), py(v, ROWS[4].y)],
    [px(v, PEER_X - PEER_W / 2), py(v, ROWS[4].y)],
  ];
  connector(ctx, v, handoff, smoothstep(frame.peers / 0.7), STEEL, 0.75 * a, 1.3);
  token(ctx, v, handoff, (anim * 0.15) % 1, STEEL, 0.9 * a, true);
  text(ctx, "task handoff", px(v, HANDOFF_X) + 6, py(v, ROWS[4].y) - 7, {
    size: v.fs * 0.82,
    color: STEEL,
    alpha: 0.95 * a,
    weight: 600,
  });

  const peer = box(ctx, v, PEER_X, ROWS[4].y, PEER_W, PEER_H, {
    fill: PAPER,
    stroke: STEEL,
    alpha: 0.9 * a,
    weight: 1.4,
  });
  text(ctx, "PEER AGENT", peer.x + peer.w / 2, peer.y + peer.h * 0.4, {
    size: v.fs * 0.94,
    color: STEEL,
    alpha: a,
    weight: 700,
    track: 0.08,
    align: "center",
    baseline: "middle",
  });
  text(ctx, "its own loop", peer.x + peer.w / 2, peer.y + peer.h * 0.76, {
    size: v.fs * 0.78,
    color: MUTED,
    alpha: 0.95 * a,
    align: "center",
    baseline: "middle",
  });

  const bridge: Pt[] = [
    [px(v, PEER_X + PEER_W / 2), py(v, ROWS[4].y)],
    [px(v, PEER_TOOLS_X - PEER_TOOLS_W / 2), py(v, ROWS[4].y)],
  ];
  connector(ctx, v, bridge, smoothstep((frame.peers - 0.4) / 0.4), INK_SOFT, 0.6 * a);

  const own = box(ctx, v, PEER_TOOLS_X, ROWS[4].y, PEER_TOOLS_W, PEER_TOOLS_H, {
    fill: PAPER,
    stroke: INK_SOFT,
    alpha: 0.8 * a,
    weight: 1.1,
  });
  text(ctx, "ITS OWN MCP TOOLS", own.x + own.w / 2, own.y + own.h / 2, {
    size: v.fs * 0.82,
    color: INK_SOFT,
    alpha: 0.95 * a,
    weight: 600,
    track: 0.06,
    align: "center",
    baseline: "middle",
  });
}

export function drawExhibit(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: LectureFrame,
  motion: Motion = STILL,
): void {
  ctx.clearRect(0, 0, width, height);
  const v = makeView(frame, motion, width, height);
  // Reduced motion freezes every time-driven channel, so the exhibit settles on
  // the picture the beat arrived at rather than on an empty panel.
  const anim = motion.life > 0 ? motion.time : 0;

  ctx.lineCap = "butt";
  drawFocus(ctx, v, frame);
  drawRows(ctx, v, frame);
  drawGround(ctx, v, frame, anim);
  drawReach(ctx, v, frame, anim);
  drawPeers(ctx, v, frame, anim);
  drawLoop(ctx, v, frame, anim);
  drawCorpus(ctx, v, frame);
  drawModel(ctx, v, frame, anim);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  if ("letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      "0em";
  }
}

/** Exposed for the unit test: the drawn geometry must not depend on hashing. */
export const EXHIBIT_GEOMETRY = {
  ROWS,
  ROW_END,
  WIDEST_SPAN,
  GATE_U,
  CYCLE_DX,
  CYCLE_DY,
  CYCLE_BOX_H,
  docCount: DOC_COLS * DOC_ROWS,
  focusBand,
  hash,
};
