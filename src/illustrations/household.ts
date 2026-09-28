/**
 * The household behind one loan, as a Rive illustration.
 *
 * Income falls into a tank; essentials and the mortgage payment drain out of
 * it; what stays in the tank is the buffer. When the floating coupon reprices,
 * the payment pipe widens and the level falls through the thin line. That is the
 * mechanism the rate film states in prose and the data field can only show as a
 * dot moving left.
 *
 * It is an illustration, not a chart: there are no axes and nothing is read off
 * it. The three proportions it does carry come from the modelled loan, so the
 * picture cannot quietly disagree with the evidence:
 *   - the tank starts at `FULL` of its height, standing for the pre-shock buffer;
 *   - after the shock it holds `FULL × bufferAfter / bufferBefore`;
 *   - the thin line sits at `FULL × (6% of income) / bufferBefore`;
 *   - the payment stroke thickens by `paymentAfter / paymentBefore`.
 */

import { ArtboardBuilder, type Handle } from "@/lib/rive/artboard-builder";
import { argb } from "@/lib/rive/riv-writer";

export const HOUSEHOLD = {
  name: "Household",
  stateMachine: "Household",
  width: 400,
  height: 400,
  inputs: {
    /** Trigger: the coupon reprices and the mechanism plays. */
    shock: "shock",
    /** Bool: jump straight to the strained end state, no animation. */
    constrained: "constrained",
  },
  /** Length of the shock animation, so the director can caption its end. */
  shockSeconds: 1.8,
} as const;

/** Tank level standing for the pre-shock buffer. */
const FULL = 0.8;

export type HouseholdLoan = {
  incomeMonthly: number;
  paymentBefore: number;
  paymentAfter: number;
  bufferBefore: number;
  bufferAfter: number;
};

export type HouseholdValues = {
  levelBefore: number;
  levelAfter: number;
  thinLevel: number;
  paymentRatio: number;
};

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function householdValues(loan: HouseholdLoan, thinShare = 0.06): HouseholdValues {
  const before = Math.max(loan.bufferBefore, 1);
  return {
    levelBefore: FULL,
    levelAfter: round3(clamp((FULL * loan.bufferAfter) / before, 0, 1)),
    thinLevel: round3(clamp((FULL * thinShare * loan.incomeMonthly) / before, 0, 1)),
    paymentRatio: round3(clamp(loan.paymentAfter / Math.max(loan.paymentBefore, 1), 0.5, 3)),
  };
}

/* Geometry, artboard units. Exported so layers can anchor annotations. */
const C = 200;
const RING = 300;
const TANK = { cx: 200, top: 206, bottom: 282, width: 118 } as const;
const TANK_H = TANK.bottom - TANK.top;
const INCOME_X = 172;
const INCOME_DROP = { from: 170, to: TANK.top + 10 } as const;
const OUT = { essentialsX: 170, paymentX: 230, from: TANK.bottom + 2, pipeEnd: 306, dropTo: 344 } as const;
const PAYMENT_STROKE = 6;

export function householdGeometry(values: HouseholdValues) {
  const surface = (level: number) => TANK.bottom - TANK_H * level;
  return {
    ring: { cx: C, cy: C, r: RING / 2 },
    tank: { x: TANK.cx - TANK.width / 2, y: TANK.top, width: TANK.width, height: TANK_H },
    surfaceBefore: surface(values.levelBefore),
    surfaceAfter: surface(values.levelAfter),
    thinY: surface(values.thinLevel),
    income: { x: INCOME_X, y: 150 },
    essentials: { x: OUT.essentialsX, y: OUT.pipeEnd },
    payment: { x: OUT.paymentX, y: OUT.pipeEnd },
  };
}

const WHITE = (a: number) => argb(255, 255, 255, a);
const CYAN = argb(92, 214, 226, 0.92);
const VIOLET = argb(186, 104, 255, 1);
const VIOLET_SOFT = argb(186, 104, 255, 0.85);

type LoopKey = readonly [number, number, "linear" | "hold"];

/**
 * Loop keyframes for a mark falling from `from` to `to` once per `cycle`
 * frames, `phase` of a cycle ahead. `cycle` must divide `frames` so the loop
 * closes. The key before each wrap holds, so the mark jumps back to the top
 * instead of sliding up through the picture.
 */
export function fallingKeys(
  frames: number,
  cycle: number,
  phase: number,
  from: number,
  to: number,
): { y: LoopKey[]; opacity: LoopKey[] } {
  if (frames % cycle !== 0) throw new Error(`cycle ${cycle} does not divide ${frames}`);
  const wraps = new Set<number>();
  for (let k = 1; cycle * (k - phase) <= frames; k++) {
    const w = Math.round(cycle * (k - phase));
    if (w > 0) wraps.add(w);
  }
  const at = new Set<number>([0, frames]);
  for (let f = 0; f <= frames; f += 6) at.add(f);
  for (const w of wraps) {
    at.add(w);
    if (w - 1 > 0) at.add(w - 1);
  }
  const y: LoopKey[] = [];
  const opacity: LoopKey[] = [];
  for (const f of [...at].sort((a, b) => a - b)) {
    const raw = Math.round((f / cycle + phase) * 1e6) / 1e6;
    const u = raw - Math.floor(raw);
    const easing = wraps.has(f + 1) ? "hold" : "linear";
    y.push([f, round3(from + (to - from) * u), easing]);
    opacity.push([f, round3(Math.sin(Math.PI * u) ** 0.6), easing]);
  }
  return { y, opacity };
}

export function buildHousehold(values: HouseholdValues): Uint8Array {
  const ab = new ArtboardBuilder(HOUSEHOLD.name, HOUSEHOLD.width, HOUSEHOLD.height);
  const g = householdGeometry(values);
  const ease = ab.cubic(0.42, 0, 0.58, 1);
  const out = ab.cubic(0.2, 0.7, 0.3, 1);

  // Painter's order: first declared is at the back.
  ab.ellipse({ name: "glow", x: C, y: C, width: RING * 1.1, height: RING * 1.1, fill: WHITE(0.045) });
  // The page's void, nearly opaque, so the household is not drawn over the
  // rest of the book still behind it in the data layer.
  ab.ellipse({ name: "ring", x: C, y: C, width: RING, height: RING, fill: argb(3, 5, 15, 0.96), stroke: { color: WHITE(0.85), thickness: 3 } });

  const warn = ab.group({ name: "warn", x: C, y: C, opacity: 0 });
  ab.ellipse({ name: "warn ring", x: 0, y: 0, parent: warn, width: RING, height: RING, stroke: { color: VIOLET, thickness: 3 } });

  const houseStroke = { color: WHITE(0.9), thickness: 4 };
  ab.polyline({ name: "roof", x: 0, y: 0, points: [[112, 196], [C, 124], [288, 196]], stroke: houseStroke });
  ab.polyline({ name: "walls", x: 0, y: 0, points: [[130, 182], [130, 292], [270, 292], [270, 182]], stroke: houseStroke });

  ab.polyline({ name: "income pipe", x: 0, y: 0, points: [[88, 150], [INCOME_X, 150], [INCOME_X, 166]], stroke: { color: WHITE(0.55), thickness: 3 } });

  ab.rect({ name: "tank", x: TANK.cx, y: (TANK.top + TANK.bottom) / 2 + 1, width: TANK.width + 6, height: TANK_H + 6, cornerRadius: 8, fill: WHITE(0.04), stroke: { color: WHITE(0.5), thickness: 2 } });
  const water = ab.rect({ name: "buffer", x: TANK.cx, y: TANK.bottom, width: TANK.width, height: TANK_H * values.levelBefore, cornerRadius: 4, originY: 1, fill: CYAN });
  const thin = ab.rect({ name: "thin line", x: TANK.cx, y: g.thinY, width: TANK.width + 18, height: 2, fill: WHITE(0.6) });

  ab.polyline({ name: "essentials pipe", x: 0, y: 0, points: [[OUT.essentialsX, OUT.from], [OUT.essentialsX, OUT.pipeEnd]], stroke: { color: WHITE(0.35), thickness: PAYMENT_STROKE } });
  const payment = ab.polyline({ name: "payment pipe", x: 0, y: 0, points: [[OUT.paymentX, OUT.from], [OUT.paymentX, OUT.pipeEnd]], stroke: { color: VIOLET_SOFT, thickness: PAYMENT_STROKE } });

  const drop = (name: string, x: number, y: number, size: number, color: number) =>
    ab.ellipse({ name, x, y, width: size, height: size, fill: color, opacity: 0 }).shape;
  const incomeDrops = [0, 1, 2].map((i) => drop(`income drop ${i}`, INCOME_X, INCOME_DROP.from, 8, WHITE(0.9)));
  const essentialDrops = [0, 1].map((i) => drop(`essentials drop ${i}`, OUT.essentialsX, OUT.pipeEnd, 7, WHITE(0.45)));
  const paymentDrops = [0, 1, 2].map((i) => drop(`payment drop ${i}`, OUT.paymentX, OUT.pipeEnd, 8, VIOLET));

  const hBefore = TANK_H * values.levelBefore;
  const hAfter = Math.max(TANK_H * values.levelAfter, 1.5);
  const wide = PAYMENT_STROKE * values.paymentRatio;
  const thinWhite = WHITE(0.6);

  // Main layer: the buffer.
  const calm = ab.animation("calm", 120, "loop")
    .key(water.path, "height", [[0, hBefore, ease], [60, hBefore + 1.4, ease], [120, hBefore]])
    .key(payment.stroke!, "thickness", [[0, PAYMENT_STROKE]])
    .key(warn, "opacity", [[0, 0]])
    .key(warn, "scaleX", [[0, 1]])
    .key(warn, "scaleY", [[0, 1]])
    .keyColor(thin.fillColor!, [[0, thinWhite]]);

  const shockFrames = Math.round(HOUSEHOLD.shockSeconds * 60);
  const shock = ab.animation("shock", shockFrames, "oneShot")
    .key(water.path, "height", [[0, hBefore, "hold"], [12, hBefore, ease], [96, hAfter]])
    .key(payment.stroke!, "thickness", [[0, PAYMENT_STROKE, out], [20, wide]])
    .key(warn, "opacity", [[0, 0, out], [10, 0.9, ease], [70, 0]])
    .key(warn, "scaleX", [[0, 1, out], [70, 1.12]])
    .key(warn, "scaleY", [[0, 1, out], [70, 1.12]])
    .keyColor(thin.fillColor!, [[0, thinWhite, "hold"], [60, thinWhite], [84, VIOLET]]);

  const strained = ab.animation("strained", 120, "loop")
    .key(water.path, "height", [[0, hAfter, ease], [60, hAfter + 0.8, ease], [120, hAfter]])
    .key(payment.stroke!, "thickness", [[0, wide]])
    .key(warn, "opacity", [[0, 0]])
    .key(warn, "scaleX", [[0, 1]])
    .key(warn, "scaleY", [[0, 1]])
    .keyColor(thin.fillColor!, [[0, VIOLET]]);

  // Flow layer: the drops. Income and essentials never change; the payment
  // runs faster once it has repriced.
  const FLOW = 144;
  const flow = (name: string, paymentCycle: number) => {
    const a = ab.animation(name, FLOW, "loop");
    const track = (h: Handle, cycle: number, phase: number, from: number, to: number) => {
      const k = fallingKeys(FLOW, cycle, phase, from, to);
      a.key(h, "y", k.y);
      a.key(h, "opacity", k.opacity);
    };
    incomeDrops.forEach((h, i) => track(h, 72, i / 3, INCOME_DROP.from, INCOME_DROP.to));
    essentialDrops.forEach((h, i) => track(h, 72, i / 2, OUT.pipeEnd, OUT.dropTo));
    paymentDrops.forEach((h, i) => track(h, paymentCycle, i / 3, OUT.pipeEnd, OUT.dropTo));
    return a;
  };
  const flowCalm = flow("flow calm", 72);
  const flowStrained = flow("flow strained", 48);

  const sm = ab.stateMachine(HOUSEHOLD.stateMachine);
  const shockInput = sm.trigger(HOUSEHOLD.inputs.shock);
  const constrained = sm.bool(HOUSEHOLD.inputs.constrained);

  const main = sm.layer("buffer");
  const sCalm = main.play(calm);
  const sShock = main.play(shock);
  const sStrained = main.play(strained);
  main.transition(main.entry, sCalm);
  main.transition(sCalm, sShock, { conditions: [{ trigger: shockInput }] });
  main.transition(sCalm, sStrained, { conditions: [{ bool: constrained, equals: true }] });
  main.transition(sShock, sStrained, { conditions: [], exitAtPercent: 100 });

  const drops = sm.layer("flow");
  const fCalm = drops.play(flowCalm);
  const fStrained = drops.play(flowStrained);
  drops.transition(drops.entry, fCalm);
  drops.transition(fCalm, fStrained, { conditions: [{ trigger: shockInput }] });
  drops.transition(fCalm, fStrained, { conditions: [{ bool: constrained, equals: true }] });

  return ab.encode(0x1d0d);
}
