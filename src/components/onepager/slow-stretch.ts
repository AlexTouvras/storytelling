/**
 * Approval still for the lane-2 minute. Not mounted in the film.
 *
 * One locator shows the first 1,200 feet, ahead to the right. Under it, the
 * same cars are enlarged across a 500-foot window that contains the slowest
 * 100-foot cell. Places and speeds are the frozen pack. Car length is
 * illustrative. The 9.1 mph walk is written only on the pair.
 */
import pack from "../../../data/figures/where-should-the-speed-be-held.v1.json";

export const WINDOW_FT = 1200;
export const CLOSE_FT = 500;
/** Drawn length. The pack does not freeze a per-vehicle length. */
export const CAR_FT = 16;
const CELL_FT = 100;

const PAPER = "#f4efe4";
const INK = "#221e19";
const MUTED = "#6a6258";
const FAINT = "#a39888";
const BLUE = "#1a446f";
const GLASS = "#d7e6f3";
const CREAM = "#f7f3ea";
const AMBER = "#a16207";
const WASH = "#e8b15a";
const ROAD = "#e7dfd0";
const GRID = "#e4d9c6";
const SERIF = "Liberation Serif, serif";
const SANS = "Inter, sans-serif";

export type StretchId = "now" | "later" | "pair";

type Car = { y: number; mph: number };

type Frame = {
  seconds: number;
  clock: string;
  downstream: number;
  cellFt: number;
  cellMph: number;
  /** Feet at the left edge of the enlarged window. */
  closeFt: number;
  cars: Car[];
};

const walk = pack.featured.walk;
const [rawNow, rawLater] = pack.featured.frames;

function clockAt(seconds: number) {
  const total = 7 * 60 + 50 + Math.floor(seconds / 60);
  const h = Math.floor(total / 60);
  const m = String(total % 60).padStart(2, "0");
  return `${h}:${m} a.m.`;
}

function inSpan(cars: readonly { y: number; mph: number }[], from: number, to: number): Car[] {
  return cars
    .filter((car) => car.y >= from && car.y <= to)
    .map((car) => ({ y: car.y, mph: car.mph }))
    .sort((a, b) => a.y - b.y);
}

export const SLOW_STRETCH_FRAMES: readonly Frame[] = [
  {
    seconds: rawNow.seconds,
    clock: clockAt(rawNow.seconds),
    downstream: rawNow.downstream_mph ?? 0,
    cellFt: walk.from_y_ft,
    cellMph: walk.from_mph,
    closeFt: 600,
    cars: inSpan(rawNow.cars, 0, WINDOW_FT),
  },
  {
    seconds: rawLater.seconds,
    clock: clockAt(rawLater.seconds),
    downstream: rawLater.downstream_mph ?? 0,
    cellFt: walk.to_y_ft,
    cellMph: walk.to_mph,
    closeFt: 0,
    cars: inSpan(rawLater.cars, 0, WINDOW_FT),
  },
];

const one = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
const ft = (n: number) => Math.round(n).toLocaleString("en-US");

function carGlyph(cx: number, ground: number, length: number) {
  const s = length / 32;
  return `<g transform="translate(${cx.toFixed(1)} ${ground.toFixed(1)}) scale(${s.toFixed(3)})">
    <ellipse cx="1" cy="-1" rx="14" ry="2.2" fill="${INK}" opacity="0.08"/>
    <path fill="${BLUE}" d="M-15-4 L-15-11 Q-14-14-9-14 L-6-14 L-2-19 H5 L9-14 H13 Q16-11 16-7 V-4 Z"/>
    <path fill="${GLASS}" d="M-5-14 L-1.4-18.2 H4.5 L8-14 Z"/>
    <circle cx="-8" cy="-3.1" r="3.15" fill="${INK}"/>
    <circle cx="8.2" cy="-3.1" r="3.15" fill="${INK}"/>
    <circle cx="-8" cy="-3.1" r="1.15" fill="${CREAM}"/>
    <circle cx="8.2" cy="-3.1" r="1.15" fill="${CREAM}"/>
  </g>`;
}

type Plot = {
  left: number;
  right: number;
  width: number;
  from: number;
  span: number;
  x: (feet: number) => number;
};

function plot(left: number, right: number, from: number, span: number): Plot {
  const width = right - left;
  return {
    left,
    right,
    width,
    from,
    span,
    x: (feet) => left + ((feet - from) / span) * width,
  };
}

function carsOn(p: Plot, cars: readonly Car[], ground: number) {
  const length = (CAR_FT / p.span) * p.width;
  return cars
    .filter((car) => car.y >= p.from && car.y <= p.from + p.span)
    .map((car) => carGlyph(p.x(car.y), ground, length))
    .join("");
}

function wash(p: Plot, cellFt: number, top: number, height: number, opacity: number) {
  const x = p.x(cellFt);
  const w = p.x(cellFt + CELL_FT) - x;
  return `<rect x="${x.toFixed(1)}" y="${top}" width="${Math.max(w, 1).toFixed(1)}" height="${height}" fill="${WASH}" opacity="${opacity}"/>`;
}

function ticks(p: Plot, y: number, at: number[]) {
  return at
    .map((feet) => {
      const x = p.x(feet);
      const anchor = feet === p.from ? "start" : feet === p.from + p.span ? "end" : "middle";
      return `<text x="${x.toFixed(1)}" y="${y}" fill="${MUTED}" font-size="13" font-family="${SANS}" text-anchor="${anchor}">${ft(feet)}</text>`;
    })
    .join("");
}

function arrowLeft(xFrom: number, xTo: number, y: number) {
  const head = 12;
  return `<line x1="${xFrom.toFixed(1)}" y1="${y}" x2="${(xTo + head).toFixed(1)}" y2="${y}" stroke="${AMBER}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M${(xTo + head).toFixed(1)} ${(y - 7).toFixed(1)} L${xTo.toFixed(1)} ${y} L${(xTo + head).toFixed(1)} ${(y + 7).toFixed(1)}" fill="none" stroke="${AMBER}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`;
}

function speedChart(p: Plot, top: number, height: number, cars: readonly Car[], guide: number, cellFt: number) {
  const max = 50;
  const base = top + height;
  const yOf = (mph: number) => base - (mph / max) * height;
  const shown = cars.filter((car) => car.y >= p.from && car.y <= p.from + p.span);
  const grids = [0, 25, 50]
    .map((mph) => {
      const y = yOf(mph);
      return `<line x1="${p.left}" y1="${y.toFixed(1)}" x2="${p.right}" y2="${y.toFixed(1)}" stroke="${GRID}"/>
        <text x="${p.left - 12}" y="${(y + 4).toFixed(1)}" fill="${MUTED}" font-size="12" font-family="${SANS}" text-anchor="end">${mph}</text>`;
    })
    .join("");
  const d = shown
    .map((car, i) => `${i === 0 ? "M" : "L"}${p.x(car.y).toFixed(1)} ${yOf(car.mph).toFixed(1)}`)
    .join(" ");
  const dots = shown
    .map(
      (car) =>
        `<circle cx="${p.x(car.y).toFixed(1)}" cy="${yOf(car.mph).toFixed(1)}" r="4" fill="${BLUE}" stroke="${PAPER}" stroke-width="1.4"/>`,
    )
    .join("");
  const gy = yOf(guide);
  return `${wash(p, cellFt, top, height, 0.28)}${grids}
    <line x1="${p.left}" y1="${gy.toFixed(1)}" x2="${p.right}" y2="${gy.toFixed(1)}" stroke="${BLUE}" stroke-width="1.3" stroke-dasharray="5 4" opacity="0.8"/>
    <text x="${(p.right - 8).toFixed(1)}" y="${(gy + 16).toFixed(1)}" fill="${BLUE}" font-size="12" font-family="${SANS}" text-anchor="end">past 1,700 ft · ${one(guide)} mph</text>
    <path d="${d}" fill="none" stroke="${BLUE}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    <text x="${p.left - 12}" y="${top - 6}" fill="${MUTED}" font-size="12" font-family="${SANS}" text-anchor="end">mph</text>`;
}

const W = 1440;
const L = 92;
const R = 1348;

function locator(frame: Frame, top: number, motion?: { from: number; label: string }) {
  const p = plot(L, R, 0, WINDOW_FT);
  const bandTop = top + 64;
  const ground = bandTop + 18;
  const ghostX = motion == null ? 0 : p.x(motion.from);
  const ghostW = motion == null ? 0 : p.x(motion.from + CELL_FT) - ghostX;
  const ghost =
    motion == null
      ? ""
      : `<rect x="${ghostX.toFixed(1)}" y="${bandTop}" width="${ghostW.toFixed(1)}" height="22" fill="none" stroke="${FAINT}" stroke-dasharray="3 3"/>
        <text x="${(ghostX + ghostW / 2).toFixed(1)}" y="${bandTop - 16}" fill="${FAINT}" font-size="12" font-family="${SANS}" text-anchor="middle">where it was</text>`;
  const xStart = motion == null ? 0 : p.x(motion.from + 16);
  const xEnd = motion == null ? 0 : p.x(frame.cellFt + CELL_FT);
  const arrow =
    motion == null
      ? ""
      : `${arrowLeft(xStart, xEnd, top + 30)}
        <text x="${((xStart + xEnd) / 2).toFixed(1)}" y="${top + 18}" fill="${AMBER}" font-size="13" font-family="${SANS}" text-anchor="middle">${motion.label}</text>`;
  const label =
    motion == null
      ? `<text x="${p.x(frame.cellFt + CELL_FT / 2).toFixed(1)}" y="${bandTop - 8}" fill="${AMBER}" font-size="13" font-family="${SANS}" text-anchor="middle">slow stretch</text>`
      : "";
  return `<text x="${L}" y="${top}" fill="${FAINT}" font-size="12" font-family="${SANS}">first 1,200 feet</text>
    ${ghost}
    ${wash(p, frame.cellFt, bandTop, 22, 0.8)}
    <line x1="${p.left}" y1="${ground}" x2="${p.right}" y2="${ground}" stroke="#d9d0c2"/>
    ${carsOn(p, frame.cars, ground)}
    ${arrow}
    ${label}
    ${ticks(p, ground + 20, [0, 400, 800, 1200])}
    <text x="${p.right}" y="${ground + 38}" fill="${FAINT}" font-size="12" font-family="${SANS}" text-anchor="end">ahead →</text>`;
}

function closeup(frame: Frame, top: number) {
  const p = plot(L, R, frame.closeFt, CLOSE_FT);
  const ground = top + 64;
  const end = frame.closeFt + CLOSE_FT;
  const bandTop = ground - 34;
  const cellMid = frame.cellFt + CELL_FT / 2;
  const nearLeft = cellMid - frame.closeFt < 120;
  const labelX = nearLeft ? p.x(frame.cellFt) : p.x(cellMid);
  const anchor = nearLeft ? "start" : "middle";
  return `<text x="${L}" y="${top}" fill="${INK}" font-size="15" font-family="${SANS}">${ft(frame.closeFt)}–${ft(end)} feet, enlarged</text>
    <text x="${labelX.toFixed(1)}" y="${bandTop - 8}" fill="${AMBER}" font-size="13" font-family="${SANS}" text-anchor="${anchor}">slowest 100 feet</text>
    <rect x="${p.left}" y="${bandTop}" width="${p.width}" height="42" rx="6" fill="${ROAD}"/>
    ${wash(p, frame.cellFt, bandTop, 42, 0.55)}
    <line x1="${p.left}" y1="${ground}" x2="${p.right}" y2="${ground}" stroke="#d4cbbd"/>
    ${carsOn(p, frame.cars, ground)}
    <text x="${p.left}" y="${ground + 20}" fill="${FAINT}" font-size="12" font-family="${SANS}">back</text>
    <text x="${p.right}" y="${ground + 20}" fill="${FAINT}" font-size="12" font-family="${SANS}" text-anchor="end">ahead →</text>
    ${ticks(p, ground + 40, [frame.closeFt, frame.closeFt + 100, frame.closeFt + 250, end])}`;
}

function svgDoc(height: number, body: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}">
  <rect width="${W}" height="${height}" fill="${PAPER}"/>
  ${body}
</svg>`;
}

function kicker() {
  return `<text x="56" y="44" fill="${MUTED}" font-size="13" font-family="${SANS}" letter-spacing="1.6">LANE 2  ·  SOUTHBOUND US-101</text>`;
}

function note(y: number, line: string) {
  return `<text x="56" y="${y}" fill="${MUTED}" font-size="13" font-family="${SANS}">${line}</text>
    <text x="56" y="${y + 18}" fill="${MUTED}" font-size="13" font-family="${SANS}">Positions and speeds are measured. Car length is illustrative. The tint is the slowest 100-foot cell over ten seconds, not the single slowest car.</text>`;
}

function downstream(mph: number) {
  return `<text x="${R}" y="132" fill="${INK}" font-size="16" font-family="${SANS}" text-anchor="end">Past 1,700 ft, still ${one(mph)} mph</text>`;
}

/** Which still is on screen. The walk speed belongs to the last cue of the beat. */
export function slowStretchPhase(cue: number, count: number): StretchId {
  if (count <= 1 || cue <= 0) return "now";
  if (cue >= count - 1) return "pair";
  return "later";
}

export function slowStretchScene(
  id: StretchId,
  opts?: { compact?: boolean },
): { id: StretchId; width: number; height: number; svg: string } {
  if (opts?.compact) return compactScene(id);
  const [now, later] = SLOW_STRETCH_FRAMES;
  const closePlot = (frame: Frame) => plot(L, R, frame.closeFt, CLOSE_FT);

  if (id === "now" || id === "later") {
    const frame = id === "now" ? now : later;
    const H = 880;
    const title =
      id === "now"
        ? "Every car points ahead."
        : "A minute later, the cars still point ahead.";
    const sub =
      id === "now"
        ? `${frame.clock}  The tint is the slow part of this stretch.`
        : `${frame.clock}  The slow part is at the back of the window.`;
    const motion = id === "later" ? { from: now.cellFt, label: "walks back" } : undefined;
    const chartTop = 520;
    const body = `
      ${kicker()}
      <text x="56" y="96" fill="${INK}" font-size="36" font-family="${SERIF}">${title}</text>
      <text x="56" y="132" fill="${MUTED}" font-size="18" font-family="${SANS}">${sub}</text>
      ${downstream(frame.downstream)}
      ${locator(frame, 168, motion)}
      ${closeup(frame, 340)}
      ${speedChart(closePlot(frame), chartTop, 180, frame.cars, frame.downstream, frame.cellFt)}
      ${note(800, "Dots are the cars in the enlarged window, at that second. The dashed line is the lane past 1,700 feet.")}
    `;
    return { id, width: W, height: H, svg: svgDoc(H, body) };
  }

  const H = 960;
  const body = `
    ${kicker()}
    <text x="56" y="92" fill="${INK}" font-size="32" font-family="${SERIF}">Every car points ahead. The slow stretch walks back.</text>
    <text x="56" y="126" fill="${INK}" font-size="18" font-family="${SANS}">800 feet in this minute, at ${one(walk.walk_mph)} mph, against the traffic.</text>
    <text x="56" y="162" fill="${MUTED}" font-size="15" font-family="${SANS}">${now.clock} · past 1,700 ft, still ${one(now.downstream)} mph</text>
    ${locator(now, 180)}
    ${closeup(now, 330)}
    <text x="56" y="530" fill="${MUTED}" font-size="15" font-family="${SANS}">${later.clock} · past 1,700 ft, still ${one(later.downstream)} mph</text>
    ${locator(later, 548, { from: now.cellFt, label: "walks back" })}
    ${closeup(later, 710)}
    ${note(880, "Both enlargements are 500 feet at the same scale. The arrow is the slow stretch over this minute.")}
  `;
  return { id, width: W, height: H, svg: svgDoc(H, body) };
}

/**
 * The same claims, drawn for a phone-width picture. The enlargement is 200
 * feet so a car is still a car. The wide stills stay the ones that were approved.
 */
function compactScene(id: StretchId): { id: StretchId; width: number; height: number; svg: string } {
  const [now, later] = SLOW_STRETCH_FRAMES;
  const CW = 390;
  const left = 46;
  const right = 368;
  const doc = (height: number, body: string) =>
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${height}" viewBox="0 0 ${CW} ${height}">
  <rect width="${CW}" height="${height}" fill="${PAPER}"/>
  ${body}
</svg>`;
  const locatorC = (frame: Frame, top: number, motion?: { from: number; label: string }) => {
    const p = plot(left, right, 0, WINDOW_FT);
    const ground = top + 36;
    const bandTop = ground - 16;
    const ghost =
      motion == null
        ? ""
        : `<rect x="${p.x(motion.from).toFixed(1)}" y="${bandTop}" width="${(p.x(motion.from + CELL_FT) - p.x(motion.from)).toFixed(1)}" height="20" fill="none" stroke="${FAINT}" stroke-dasharray="3 3"/>`;
    const arrow =
      motion == null
        ? ""
        : arrowLeft(p.x(motion.from + 8), p.x(frame.cellFt + CELL_FT), top + 12);
    const label =
      motion == null
        ? `<text x="${p.x(frame.cellFt + CELL_FT / 2).toFixed(1)}" y="${top + 10}" fill="${AMBER}" font-size="11" font-family="${SANS}" text-anchor="middle">slow stretch</text>`
        : `<text x="${right}" y="${top + 8}" fill="${AMBER}" font-size="11" font-family="${SANS}" text-anchor="end">${motion.label}</text>`;
    return `${ghost}
      ${wash(p, frame.cellFt, bandTop, 20, 0.8)}
      <line x1="${p.left}" y1="${ground}" x2="${p.right}" y2="${ground}" stroke="#d9d0c2"/>
      ${carsOn(p, frame.cars, ground)}
      ${arrow}
      ${label}
      ${ticks(p, ground + 16, [0, 800, 1200])}
      <text x="${p.right}" y="${ground + 30}" fill="${FAINT}" font-size="11" font-family="${SANS}" text-anchor="end">ahead →</text>`;
  };
  const closeC = (frame: Frame, top: number, from: number, span: number) => {
    const p = plot(left, right, from, span);
    const ground = top + 52;
    const bandTop = ground - 30;
    const end = from + span;
    return `<text x="${left}" y="${top}" fill="${INK}" font-size="13" font-family="${SANS}">${ft(from)}–${ft(end)} ft</text>
      <rect x="${p.left}" y="${bandTop}" width="${p.width}" height="38" rx="6" fill="${ROAD}"/>
      ${wash(p, frame.cellFt, bandTop, 38, 0.55)}
      <line x1="${p.left}" y1="${ground}" x2="${p.right}" y2="${ground}" stroke="#d4cbbd"/>
      ${carsOn(p, frame.cars, ground)}
      <text x="${p.left}" y="${ground + 16}" fill="${FAINT}" font-size="11" font-family="${SANS}">back</text>
      <text x="${p.right}" y="${ground + 16}" fill="${FAINT}" font-size="11" font-family="${SANS}" text-anchor="end">ahead →</text>`;
  };

  if (id === "now" || id === "later") {
    const frame = id === "now" ? now : later;
    const from = id === "now" ? 760 : 0;
    const span = 200;
    const motion = id === "later" ? { from: now.cellFt, label: "walks back" } : undefined;
    const H = 430;
    const body = `
      <text x="16" y="22" fill="${MUTED}" font-size="11" font-family="${SANS}">${frame.clock} · past 1,700 ft, ${one(frame.downstream)} mph</text>
      ${locatorC(frame, 36, motion)}
      ${closeC(frame, 118, from, span)}
      ${speedChart(plot(left, right, from, span), 210, 150, frame.cars, frame.downstream, frame.cellFt)}
      <text x="16" y="400" fill="${MUTED}" font-size="11" font-family="${SANS}">Car length is illustrative. The tint is the slowest 100 feet.</text>
    `;
    return { id, width: CW, height: H, svg: doc(H, body) };
  }

  const H = 520;
  const body = `
    <text x="16" y="24" fill="${INK}" font-size="15" font-family="${SANS}">800 feet back, at ${one(walk.walk_mph)} mph</text>
    <text x="16" y="46" fill="${MUTED}" font-size="12" font-family="${SANS}">${now.clock} · ahead still ${one(now.downstream)} mph</text>
    ${locatorC(now, 58)}
    ${closeC(now, 140, 760, 200)}
    <text x="16" y="250" fill="${MUTED}" font-size="12" font-family="${SANS}">${later.clock} · ahead still ${one(later.downstream)} mph</text>
    ${locatorC(later, 264, { from: now.cellFt, label: "walks back" })}
    ${closeC(later, 360, 0, 200)}
    <text x="16" y="490" fill="${MUTED}" font-size="11" font-family="${SANS}">Against the traffic. Car length is illustrative.</text>
  `;
  return { id, width: CW, height: H, svg: doc(H, body) };
}
