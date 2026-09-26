/**
 * The agentic stack, drawn as a lecture board.
 *
 * One camera over one set of objects, as the films do: the language core, a
 * corpus, a control loop, four systems, a peer across a boundary, and a build
 * ladder. The camera only ever pulls back, so nothing the reader has already
 * been shown leaves the frame — the diagram at the end is the sum of the beats.
 *
 * Two departures from the landing flight's craft rules, both deliberate:
 *
 *   1. **This picture is labelled.** Rule 6 there ("the picture stays
 *      unlabelled") protects a metaphor from being captioned into a diagram.
 *      Here the diagram *is* the subject — a named taxonomy is what the field
 *      card publishes — so the labels are the content. The canvas stays
 *      `aria-hidden` and every label is also in the DOM.
 *   2. **Horizontal squeeze on narrow frames.** The stack is taller than it is
 *      wide, so on a phone the vertical fit would push the peer ring off the
 *      side. `xk` compresses world x once that would happen, the same trick the
 *      landing uses to fill a portrait frame.
 *
 * Everything else is the shared craft layer: marks arrive in an order, one side
 * leads, weight follows the camera, and held beats creep and keep living.
 */

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
  STILL,
  type Motion,
} from "@/components/film/craft";
import type { LectureFrame } from "@/components/lecture/lecture-frame";

const TAU = Math.PI * 2;

type Rgb = readonly [number, number, number];

const CYAN: Rgb = [92, 214, 226];
const VIOLET: Rgb = [167, 139, 250];
const AMBER: Rgb = [235, 171, 88];
const MIST: Rgb = [176, 196, 208];
const STEEL: Rgb = [92, 128, 152];

/** Widest span the cue table reaches, so zoom is 1 at the pulled-back end. */
const WIDEST_SPAN = 7;

/**
 * World y of each layer's own row, and how far above it the section rule sits.
 * The gaps are uneven because the loop is a tall object: its top station needs
 * headroom the corpus does not.
 */
const BAND = {
  llm: 0,
  rag: 1.05,
  agent: 2.6,
  mcp: 4.05,
  a2a: 5.25,
} as const;

const LOOP_R = 0.78;
/** Where Approve sits on the loop: after act, before the write lands. */
const GATE_U = 0.3;
/** How hard the gate brakes the runner. Under 1, so the loop never reverses. */
const GATE_BRAKE = 0.93;
/** Laps per second of the control loop. */
const RUN_RATE = 0.13;
/** Where the spokes leave the ring: just after act. */
const REACH_U = 0.38;
/** Where the handoff leaves for the peer. */
const HANDOFF_U = 0.34;

const SYSTEMS = [
  { label: "ERP", x: -1.62 },
  { label: "JIRA", x: -0.54 },
  { label: "LEDGER", x: 0.54 },
  { label: "STRIPE", x: 1.62 },
] as const;

const STATIONS = [
  { u: 0, label: "PLAN" },
  { u: 0.25, label: "ACT" },
  { u: 0.5, label: "OBSERVE" },
  { u: 0.75, label: "STOP" },
] as const;

const LADDER_TOP = -0.05;
const LADDER_BOTTOM = 5.5;

/**
 * The board sits above the beat copy, not behind it. Everything the camera
 * frames has to land in the top band of the viewport, or the reader loses the
 * bottom layer exactly when the copy is telling them about it.
 */
const STAGE_HEIGHT = 0.7;
const STAGE_CENTER = 0.36;

function rgba(rgb: Rgb, a: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.max(0, Math.min(1, a))})`;
}

type View = {
  w: number;
  h: number;
  cy: number;
  scale: number;
  /** Where the ladder rail sits, in screen x. */
  railX: number;
  zoom: number;
};

/**
 * How much world width the beat's own objects need, either side of centre. The
 * camera pulls back until this fits, so a narrow screen gets a wider shot rather
 * than a cropped one. This is the whole answer to portrait here: the cue table
 * asks for a vertical span, and the frame is allowed to overrule it.
 */
export function requiredHalfWidth(frame: LectureFrame): number {
  let need = 1.2;
  if (frame.corpus > 0.05) need = Math.max(need, 1.78);
  if (frame.loop > 0.05) need = Math.max(need, 1.3);
  if (frame.reach > 0.05) need = Math.max(need, 1.96);
  if (frame.peers > 0.05) need = Math.max(need, 2.45);
  return need;
}

function makeView(frame: LectureFrame, motion: Motion, w: number, h: number): View {
  const creep = cameraCreep(motion.time, frame.hold, motion.life);
  const spanY = frame.spanY * creep.span;
  const cy = frame.cy + frame.spanY * creep.pan;

  // Portrait keeps less of the frame for the board: the same copy runs to three
  // or four lines, so it takes a taller block at the bottom.
  const portrait = w < 820;
  const stageH = portrait ? STAGE_HEIGHT - 0.1 : STAGE_HEIGHT;
  const stageC = portrait ? STAGE_CENTER - 0.05 : STAGE_CENTER;

  // The ladder rail owns a gutter on the right once it is drawn, so the board
  // has to fit inside what is left of the frame rather than under it.
  const gutter = frame.ladder > 0.05 ? 38 : 0;
  const scale = Math.min(
    (h * stageH) / spanY,
    Math.max(40, w * 0.46 - gutter) / requiredHalfWidth(frame),
  );
  const widest = (h * stageH) / WIDEST_SPAN;

  return {
    w,
    h: h * stageC,
    cy,
    scale,
    railX: w * (portrait ? 0.94 : 0.93),
    zoom: scale / widest,
  };
}

function px(v: View, wx: number): number {
  return v.w * 0.5 + wx * v.scale;
}

function py(v: View, wy: number): number {
  return v.h + (wy - v.cy) * v.scale;
}

function mono(ctx: CanvasRenderingContext2D, size: number, weight = 500): void {
  ctx.font = `${weight} ${size}px ui-monospace, SFMono-Regular, monospace`;
}

/** Rounded rect in screen space. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

/** Quadratic sample, so a path can be drawn only as far as it has been made. */
function quad(
  t: number,
  p0: readonly [number, number],
  c: readonly [number, number],
  p1: readonly [number, number],
): [number, number] {
  const m = 1 - t;
  return [
    m * m * p0[0] + 2 * m * t * c[0] + t * t * p1[0],
    m * m * p0[1] + 2 * m * t * c[1] + t * t * p1[1],
  ];
}

function strokeQuad(
  ctx: CanvasRenderingContext2D,
  p0: readonly [number, number],
  c: readonly [number, number],
  p1: readonly [number, number],
  upTo: number,
  steps = 22,
): void {
  const end = clamp01(upTo);
  if (end <= 0.01) return;
  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]);
  for (let i = 1; i <= steps; i++) {
    const [x, y] = quad((i / steps) * end, p0, c, p1);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function bands(frame: LectureFrame) {
  const unearned = 1 - 0.72 * frame.thin;
  return [
    { code: "LLM", note: "language", y: BAND.llm, gap: 0.8, on: frame.core, tint: CYAN },
    { code: "RAG", note: "knowledge", y: BAND.rag, gap: 0.68, on: frame.corpus, tint: MIST },
    {
      code: "AGENT",
      note: "control loop",
      y: BAND.agent,
      gap: 1,
      on: frame.loop,
      tint: CYAN,
    },
    { code: "MCP", note: "tools", y: BAND.mcp, gap: 0.62, on: frame.reach, tint: CYAN },
    {
      code: "A2A",
      note: "peers",
      y: BAND.a2a,
      gap: 0.7,
      on: frame.peers * unearned,
      tint: VIOLET,
    },
  ];
}

function drawBands(ctx: CanvasRenderingContext2D, v: View, frame: LectureFrame): void {
  const left = v.w * 0.05;
  const right = v.railX - 28;

  for (const band of bands(frame)) {
    if (band.on < 0.02) continue;
    const top = py(v, band.y - band.gap);

    ctx.strokeStyle = rgba(STEEL, 0.16 * band.on);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(right, top);
    ctx.stroke();

    mono(ctx, 10, 600);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = rgba(band.tint, 0.72 * band.on);
    ctx.fillText(band.code, left, top + 14);
    ctx.fillStyle = rgba(MIST, 0.3 * band.on);
    ctx.fillText(band.note, left + ctx.measureText(band.code).width + 8, top + 14);
  }
}

/** The model itself: tokens in, tokens out, nothing else. */
function drawCore(
  ctx: CanvasRenderingContext2D,
  v: View,
  frame: LectureFrame,
  anim: number,
  motion: Motion,
): void {
  const a = frame.core;
  if (a < 0.02) return;

  const cx = px(v, 0);
  const cy = py(v, BAND.llm);
  const r = 0.26 * v.scale;

  const tokens = 20;
  for (let i = 0; i < tokens; i++) {
    const u = (anim * 0.14 + i / tokens) % 1;
    const wx = -1.7 + u * 3.4;
    if (Math.abs(wx) < 0.3) continue;
    const fade = smoothstep(u / 0.14) * smoothstep((1 - u) / 0.14);
    const life = markLife(400 + i, motion.time, 3, motion.life);
    const x = px(v, wx);
    const y = cy + life.dy;
    const long = 0.05 * v.scale;
    ctx.strokeStyle = rgba(wx < 0 ? MIST : CYAN, 0.5 * a * fade * life.glow);
    ctx.lineWidth = strokeWeight(1.4, v.zoom);
    ctx.beginPath();
    ctx.moveTo(x - long, y);
    ctx.lineTo(x + long, y);
    ctx.stroke();
  }

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3.4);
  glow.addColorStop(0, rgba(CYAN, 0.22 * a));
  glow.addColorStop(1, rgba(CYAN, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 3.4, 0, TAU);
  ctx.fill();

  ctx.fillStyle = rgba(CYAN, 0.16 * a);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rgba(CYAN, 0.8 * a);
  ctx.lineWidth = strokeWeight(1.6, v.zoom);
  ctx.stroke();
}

const DOC_COLS = 16;
const DOC_ROWS = 4;

function docAt(i: number): { wx: number; wy: number; rank: number; id: number } {
  const col = i % DOC_COLS;
  const row = Math.floor(i / DOC_COLS);
  const wx = -1.66 + (col + (row % 2) * 0.5) * (3.32 / (DOC_COLS - 0.5));
  const wy = BAND.rag - 0.28 + row * 0.19;
  return { wx, wy, rank: rankJitter(100 + i, col / (DOC_COLS - 1)), id: 100 + i };
}

/** The library. Marks are written on left to right, not faded up as a sheet. */
function drawCorpus(
  ctx: CanvasRenderingContext2D,
  v: View,
  frame: LectureFrame,
  motion: Motion,
): void {
  if (frame.corpus < 0.02) return;
  const dw = 0.075 * v.scale;
  const dh = 0.11 * v.scale;

  for (let i = 0; i < DOC_COLS * DOC_ROWS; i++) {
    const doc = docAt(i);
    const present = arrival(doc.rank, frame.corpus);
    if (present < 0.02) continue;
    const life = markLife(doc.id, motion.time, dh * 0.5, motion.life);
    const x = px(v, doc.wx) + life.dx;
    const y = py(v, doc.wy) + life.dy;
    const a = 0.4 * present * life.glow;

    ctx.fillStyle = rgba(MIST, a * 0.55);
    roundRect(ctx, x - dw / 2, y - dh / 2, dw, dh, Math.min(2, dw / 3));
    ctx.fill();
    ctx.fillStyle = rgba(MIST, a);
    ctx.fillRect(x - dw / 2, y - dh / 2, dw, Math.max(1, dh * 0.16));
  }
}

/** Citations: the passage is fetched, then the answer is given from it. */
function drawGround(
  ctx: CanvasRenderingContext2D,
  v: View,
  frame: LectureFrame,
  anim: number,
): void {
  if (frame.ground < 0.02) return;
  const lines = 6;

  for (let k = 0; k < lines; k++) {
    const doc = docAt(1 + k * 3);
    const rank = k / (lines - 1);
    const drawn = leadLag(frame.ground, rank, 0.35);
    if (drawn < 0.02) continue;

    const p0: [number, number] = [px(v, doc.wx), py(v, doc.wy - 0.08)];
    const p1: [number, number] = [px(v, 0), py(v, BAND.llm + 0.3)];
    const c: [number, number] = [px(v, doc.wx * 0.45), py(v, BAND.llm + 0.72)];

    ctx.strokeStyle = rgba(CYAN, 0.26 * frame.ground);
    ctx.lineWidth = strokeWeight(1, v.zoom);
    strokeQuad(ctx, p0, c, p1, drawn);

    const u = (anim * 0.22 + k * 0.17) % 1;
    const [hx, hy] = quad(u * drawn, p0, c, p1);
    ctx.fillStyle = rgba(CYAN, 0.75 * frame.ground * smoothstep((1 - u) / 0.3));
    ctx.beginPath();
    ctx.arc(hx, hy, strokeWeight(2, v.zoom), 0, TAU);
    ctx.fill();
  }
}

function ringPoint(v: View, u: number, radius: number): [number, number] {
  const a = -Math.PI / 2 + u * TAU;
  return [
    px(v, Math.cos(a) * radius),
    py(v, BAND.agent + Math.sin(a) * radius),
  ];
}

/**
 * Where the runner sits at `anim`. Monotone in time, but it spends most of a lap
 * waiting at the gate once `gate` is up — the pause is the teaching point, so it
 * is a reparameterisation of the lap rather than a stop.
 */
export function runnerPhase(anim: number, gate: number): number {
  const base = (anim * RUN_RATE) % 1;
  const brake = clamp01(gate) * GATE_BRAKE;
  return base - (brake / TAU) * Math.sin(TAU * (base - GATE_U));
}

function drawLoop(
  ctx: CanvasRenderingContext2D,
  v: View,
  frame: LectureFrame,
  anim: number,
): void {
  if (frame.loop < 0.02) return;
  const cx = px(v, 0);
  const cy = py(v, BAND.agent);
  const rr = LOOP_R * v.scale;

  const start = -Math.PI / 2;

  ctx.strokeStyle = rgba(CYAN, 0.42);
  ctx.lineWidth = strokeWeight(1.8, v.zoom);
  ctx.beginPath();
  ctx.arc(cx, cy, rr, start, start + frame.loop * TAU);
  ctx.stroke();

  for (const station of STATIONS) {
    const present = smoothstep((frame.loop - station.u) / 0.14);
    if (present < 0.02) continue;
    const [sx, sy] = ringPoint(v, station.u, LOOP_R);
    ctx.fillStyle = rgba(CYAN, 0.9 * present);
    ctx.beginPath();
    ctx.arc(sx, sy, strokeWeight(3.2, v.zoom), 0, TAU);
    ctx.fill();

    // The ring's poles are crowded by the section rules above and below it, so
    // the vertical stations label inward and the horizontal ones outward.
    const sideways = station.u === 0.25 || station.u === 0.75;
    const [lx, ly] = ringPoint(v, station.u, LOOP_R + (sideways ? 0.22 : -0.26));
    mono(ctx, 10, 600);
    ctx.textBaseline = "middle";
    ctx.textAlign =
      station.u === 0.25 ? "left" : station.u === 0.75 ? "right" : "center";
    ctx.fillStyle = rgba(CYAN, 0.62 * present);
    ctx.fillText(station.label, lx, ly);
  }

  if (frame.gate > 0.02) {
    const [ax, ay] = ringPoint(v, GATE_U, LOOP_R - 0.19);
    const [bx, by] = ringPoint(v, GATE_U, LOOP_R + 0.19);
    ctx.strokeStyle = rgba(AMBER, 0.85 * frame.gate);
    ctx.lineWidth = strokeWeight(2.6, v.zoom);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();

    const [tx, ty] = ringPoint(v, GATE_U, LOOP_R + 0.34);
    mono(ctx, 10, 600);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = rgba(AMBER, 0.8 * frame.gate);
    ctx.fillText("APPROVE", tx, ty);

    // Spelled out where there is room; on a phone the caps are named in the
    // beat copy, so the board only has to say that there are some.
    mono(ctx, 9, 500);
    ctx.textAlign = "left";
    ctx.fillStyle = rgba(AMBER, 0.45 * frame.gate);
    const caps = "STEP · SPEND · TOOL CAPS";
    const room = tx + ctx.measureText(caps).width < v.railX - 20;
    ctx.fillText(room ? caps : "CAPS", tx, ty + 15);
  }

  if (frame.runner > 0.02) {
    const phase = runnerPhase(anim, frame.gate);

    // The wait at the bar is the teaching point, so it is marked.
    const waiting = Math.abs(((phase - GATE_U + 1.5) % 1) - 0.5) < 0.035;
    if (waiting && frame.gate > 0.3) {
      const [gx, gy] = ringPoint(v, GATE_U, LOOP_R);
      ctx.strokeStyle = rgba(AMBER, 0.5 * frame.gate);
      ctx.lineWidth = strokeWeight(1.2, v.zoom);
      ctx.beginPath();
      ctx.arc(gx, gy, strokeWeight(9, v.zoom), 0, TAU);
      ctx.stroke();
    }

    for (let i = 6; i >= 0; i--) {
      const [tx, ty] = ringPoint(v, phase - i * 0.012, LOOP_R);
      const a = frame.runner * (i === 0 ? 1 : 0.32 * (1 - i / 7));
      ctx.fillStyle = rgba(i === 0 ? [255, 255, 255] : CYAN, a);
      ctx.beginPath();
      ctx.arc(tx, ty, strokeWeight(i === 0 ? 4.2 : 3, v.zoom), 0, TAU);
      ctx.fill();
    }
  }
}

/** Hands: the loop reaches into systems and gets today's answer back. */
function drawReach(
  ctx: CanvasRenderingContext2D,
  v: View,
  frame: LectureFrame,
  anim: number,
): void {
  if (frame.reach < 0.02) return;
  const from: [number, number] = ringPoint(v, REACH_U, LOOP_R);
  const bw = 0.62 * v.scale;
  const bh = 0.3 * v.scale;

  for (let i = 0; i < SYSTEMS.length; i++) {
    const sys = SYSTEMS[i];
    const rank = rankJitter(200 + i, i / (SYSTEMS.length - 1), 0.12);
    const drawn = leadLag(frame.reach, rank, 0.3);
    if (drawn < 0.02) continue;

    const to: [number, number] = [px(v, sys.x), py(v, BAND.mcp - 0.19)];
    const c: [number, number] = [px(v, sys.x * 0.5), py(v, BAND.agent + 1.1)];

    ctx.strokeStyle = rgba(STEEL, 0.5 * frame.reach);
    ctx.lineWidth = strokeWeight(1.1, v.zoom);
    strokeQuad(ctx, from, c, to, drawn);

    // Calls go down, answers come back: odd spokes run the other way.
    const dir = i % 2 === 0 ? 1 : -1;
    const raw = (anim * 0.3 + i * 0.27) % 1;
    const u = dir > 0 ? raw : 1 - raw;
    const [hx, hy] = quad(u * drawn, from, c, to);
    ctx.fillStyle = rgba(dir > 0 ? CYAN : MIST, 0.7 * frame.reach);
    ctx.beginPath();
    ctx.arc(hx, hy, strokeWeight(2.2, v.zoom), 0, TAU);
    ctx.fill();

    const box = arrival(rank, frame.reach, 0.22);
    if (box < 0.02) continue;
    const bx = px(v, sys.x) - bw / 2;
    const by = py(v, BAND.mcp) - bh / 2;
    ctx.strokeStyle = rgba(STEEL, 0.75 * box);
    ctx.lineWidth = strokeWeight(1.2, v.zoom);
    roundRect(ctx, bx, by, bw, bh, 4);
    ctx.stroke();
    ctx.fillStyle = rgba(MIST, 0.045 * box);
    ctx.fill();

    mono(ctx, 9, 600);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = rgba(MIST, 0.7 * box);
    ctx.fillText(sys.label, bx + bw / 2, by + bh / 2);
  }
}

const PEER_X = 1.95;
const BOUNDARY_X = 1.18;

/** Peers: another owner's agent, keeping its own tools. */
function drawPeers(
  ctx: CanvasRenderingContext2D,
  v: View,
  frame: LectureFrame,
  anim: number,
): void {
  const a = frame.peers * (1 - 0.72 * frame.thin);
  if (a < 0.02) return;

  const bx = px(v, BOUNDARY_X);
  ctx.save();
  ctx.setLineDash([3, 7]);
  ctx.strokeStyle = rgba(VIOLET, 0.35 * a);
  ctx.lineWidth = strokeWeight(1.2, v.zoom);
  ctx.beginPath();
  ctx.moveTo(bx, py(v, BAND.mcp - 0.86));
  ctx.lineTo(bx, py(v, BAND.a2a + 1.05));
  ctx.stroke();
  ctx.restore();

  mono(ctx, 9, 500);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = rgba(VIOLET, 0.45 * a);
  ctx.fillText("another owner", bx + 8, py(v, BAND.mcp - 0.78));

  const pcx = px(v, PEER_X);
  const pcy = py(v, BAND.a2a);
  const pr = 0.42 * v.scale;

  ctx.strokeStyle = rgba(VIOLET, 0.55 * a);
  ctx.lineWidth = strokeWeight(1.6, v.zoom);
  ctx.beginPath();
  ctx.arc(pcx, pcy, pr, 0, TAU);
  ctx.stroke();

  for (let i = 0; i < 3; i++) {
    const u = i / 3;
    const ang = -Math.PI / 2 + u * TAU;
    ctx.fillStyle = rgba(VIOLET, 0.8 * a);
    ctx.beginPath();
    ctx.arc(
      pcx + Math.cos(ang) * pr,
      pcy + Math.sin(ang) * pr,
      strokeWeight(2.6, v.zoom),
      0,
      TAU,
    );
    ctx.fill();
  }

  // Its own tools, on its own side of the line.
  for (let i = 0; i < 2; i++) {
    const tw = 0.34 * v.scale;
    const th = 0.19 * v.scale;
    const tx = px(v, PEER_X - 0.28 + i * 0.56) - tw / 2;
    const ty = py(v, BAND.a2a + 0.78) - th / 2;
    ctx.strokeStyle = rgba(VIOLET, 0.4 * a);
    ctx.lineWidth = 1;
    roundRect(ctx, tx, ty, tw, th, 3);
    ctx.stroke();
  }

  // The handoff itself: a packet crossing the boundary, not a network hop.
  const p0: [number, number] = ringPoint(v, HANDOFF_U, LOOP_R + 0.06);
  const p1: [number, number] = [px(v, PEER_X - 0.46), pcy];
  const c: [number, number] = [px(v, 1.35), py(v, BAND.agent + 1.5)];
  ctx.strokeStyle = rgba(VIOLET, 0.3 * a);
  ctx.lineWidth = strokeWeight(1.1, v.zoom);
  strokeQuad(ctx, p0, c, p1, 1);

  const u = (anim * 0.17) % 1;
  const [hx, hy] = quad(u, p0, c, p1);
  const s = strokeWeight(3.4, v.zoom);
  ctx.fillStyle = rgba(VIOLET, 0.9 * a * smoothstep((1 - u) / 0.22));
  ctx.fillRect(hx - s / 2, hy - s / 2, s, s);
}

/** The build order, as a rail beside the stack. Rungs above what you need dim. */
function drawLadder(
  ctx: CanvasRenderingContext2D,
  v: View,
  frame: LectureFrame,
): void {
  if (frame.ladder < 0.02) return;
  const rungs = 6;
  const x = v.railX;
  const top = py(v, LADDER_TOP);
  const bottom = py(v, LADDER_BOTTOM);
  const drawn = smoothstep(frame.ladder / 0.55);

  ctx.strokeStyle = rgba(STEEL, 0.4 * frame.ladder);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, top + (bottom - top) * drawn);
  ctx.stroke();

  for (let i = 0; i < rungs; i++) {
    const rank = i / (rungs - 1);
    const present = smoothstep((frame.ladder * 1.2 - rank) / 0.2);
    if (present < 0.02) continue;
    const earned = i < 3 ? 1 : 1 - 0.72 * frame.thin;
    const y = top + (bottom - top) * rank;

    ctx.strokeStyle = rgba(i < 3 ? CYAN : STEEL, 0.55 * present * earned);
    ctx.lineWidth = strokeWeight(1.4, v.zoom);
    ctx.beginPath();
    ctx.moveTo(x - 9, y);
    ctx.lineTo(x + 9, y);
    ctx.stroke();

    mono(ctx, 10, 600);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = rgba(i < 3 ? CYAN : MIST, 0.6 * present * earned);
    ctx.fillText(String(i + 1), x - 15, y);
  }

  if (frame.thin > 0.02) {
    const y0 = top;
    const y1 = top + (bottom - top) * (2 / (rungs - 1));
    ctx.strokeStyle = rgba(CYAN, 0.5 * frame.thin);
    ctx.lineWidth = strokeWeight(1.6, v.zoom);
    ctx.beginPath();
    ctx.moveTo(x + 16, y0);
    ctx.lineTo(x + 22, y0);
    ctx.lineTo(x + 22, y1);
    ctx.lineTo(x + 16, y1);
    ctx.stroke();
  }
}

export function drawStack(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: LectureFrame,
  motion: Motion = STILL,
): void {
  ctx.clearRect(0, 0, width, height);
  const v = makeView(frame, motion, width, height);
  // Reduced motion freezes every time-driven channel, so the board settles on
  // the picture the beat arrived at rather than on an empty stage.
  const anim = motion.life > 0 ? motion.time : 0;

  drawBands(ctx, v, frame);
  drawCorpus(ctx, v, frame, motion);
  drawGround(ctx, v, frame, anim);
  drawReach(ctx, v, frame, anim);
  drawPeers(ctx, v, frame, anim);
  drawLoop(ctx, v, frame, anim);
  drawCore(ctx, v, frame, anim, motion);
  drawLadder(ctx, v, frame);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

/** Exposed for the unit test: the drawn geometry should not depend on hashing. */
export const STACK_GEOMETRY = {
  BAND,
  LOOP_R,
  GATE_U,
  WIDEST_SPAN,
  docCount: DOC_COLS * DOC_ROWS,
  hash,
};
