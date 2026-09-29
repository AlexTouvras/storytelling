/**
 * The grid inside one hour, as a Rive illustration.
 *
 * A row of wheels on one shaft is the spinning mass of every synchronous
 * generator; a larger violet wheel is the plant that trips. A dial above reads
 * the shaft's frequency against the 49.0 Hz floor. Fast reserve is a block
 * under the shaft that fires on its own when the frequency crosses its
 * activation point.
 *
    10| * It is an illustration, not a chart: nothing is read off it and its wheels do
 * not have real masses. What it does carry comes from the frequency model
 * (`src/lib/sim/grid-frequency.ts`), so the picture cannot disagree with the
 * curves drawn beside it:
 *   - wheels in a light hour = `WHEELS × light / typical` kinetic energy;
 *   - the dial needle follows the modelled trace of the reference trip, to scale;
 *   - fast reserve lights at the sample where the modelled frequency reaches
 *     its activation point.
 * The wheels' slow-down is exaggerated (`SLOWDOWN_PER_HZ`): a real 1 Hz fall is
 * 2% of the speed and would be invisible. The dial is the honest reading.
 */

import { ArtboardBuilder, type Handle, type Key } from "@/lib/rive/artboard-builder";
import { argb } from "@/lib/rive/riv-writer";
import {
  FFR_OPTIONS,
  FLOOR_HZ,
  NOMINAL_HZ,
  simulateTrip,
  type GridModel,
} from "@/lib/sim/grid-frequency";

export const GRID = {
  name: "Grid",
  stateMachine: "Grid",
  viewModel: "Grid",
  width: 400,
  height: 400,
  props: {
    /** Trigger: the plant trips and the fall plays. */
    trip: "trip",
    /** Boolean: jump straight to the end state of the trip, no animation. */
    tripped: "tripped",
    /** Boolean: a light hour, with fewer wheels. Read when the trip fires. */
    light: "light",
    /** Boolean: fast reserve is held. Read when the trip fires. */
    reserve: "reserve",
  },
  /** Enums the machine writes as each layer changes state: what it is showing. */
  reports: ["machine", "mass", "reserveShown"],
  /** Length of the trip animation, so the director can caption its end. */
  tripSeconds: 4,
  /** Model seconds per illustration second. */
  timeScale: 5,
} as const;

/** The hours the illustration stands for, kinetic energy in GWs. */
export const GRID_HOURS = {
  /** Mean pre-disturbance kinetic energy 2022–2024: 193, 194, 194 GWs (Nordic TSOs 2025). */
  typical: 194,
  /** The operators' very-low-inertia reference case (Nordic TSOs 2025). */
  light: 100,
} as const;

/** The reference incident, MW (Oskarshamn 3; Nordic TSOs 2025). */
export const GRID_LOSS_MW = 1450;
/** FFR held in the reserve variants: the published need at 100 GWs. */
export const GRID_RESERVE_MW = 300;
const RESERVE_OPTION = FFR_OPTIONS[1];

const WHEELS = 8;
const FPS = 60;
/** Frames between keys of the trip: 0.1 s of illustration, 0.5 s of model. */
const KEY_FRAMES = 6;
const TRIP_FRAMES = GRID.tripSeconds * FPS;
const SPIN_FRAMES = 120;
/** Wheel speed lost per Hz of frequency fall, as a share of full speed. */
export const SLOWDOWN_PER_HZ = 0.6;
/** Radians of needle per Hz; 50 Hz points straight up. */
const NEEDLE_PER_HZ = Math.PI / 2;
/** The spokes repeat every quarter turn, which is what lets a held wheel loop. */
const SYMMETRY = Math.PI / 2;

export type GridVariantKey = "heavy" | "light" | "heavyReserve" | "lightReserve";

export type GridVariant = {
  key: GridVariantKey;
  light: boolean;
  reserve: boolean;
  kineticGWs: number;
  /** Modelled frequency every `KEY_FRAMES`, from the trip to the end of the animation. */
  traceHz: number[];
  nadirHz: number;
  /** Key index where fast reserve fires, or null. */
  fireIndex: number | null;
  /** Key indices where the needle is below the floor, as [first, first back above] or null. */
  belowFloor: readonly [number, number] | null;
};

export type GridValues = {
  wheelsTypical: number;
  wheelsLight: number;
  variants: Record<GridVariantKey, GridVariant>;
};

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

export function gridValues(model?: GridModel): GridValues {
  const keys = TRIP_FRAMES / KEY_FRAMES;
  const sampleSeconds = (KEY_FRAMES / FPS) * GRID.timeScale;
  const variant = (key: GridVariantKey, light: boolean, reserve: boolean): GridVariant => {
    const kineticGWs = light ? GRID_HOURS.light : GRID_HOURS.typical;
    const run = simulateTrip(
      {
        kineticGWs,
        lossMW: GRID_LOSS_MW,
        fastReserve: reserve ? { ...RESERVE_OPTION, mw: GRID_RESERVE_MW } : undefined,
      },
      { seconds: (keys + 1) * sampleSeconds, sampleSeconds, model },
    );
    const traceHz = run.trace.slice(0, keys + 1).map(round3);
    const fire = reserve ? traceHz.findIndex((f) => f <= RESERVE_OPTION.activationHz) : -1;
    const down = traceHz.findIndex((f) => f < FLOOR_HZ);
    const up = down < 0 ? -1 : traceHz.findIndex((f, i) => i > down && f >= FLOOR_HZ);
    return {
      key,
      light,
      reserve,
      kineticGWs,
      traceHz,
      nadirHz: round3(run.nadirHz),
      fireIndex: fire < 0 ? null : fire,
      belowFloor: down < 0 ? null : [down, up < 0 ? keys : up],
    };
  };
  return {
    wheelsTypical: WHEELS,
    wheelsLight: Math.round((WHEELS * GRID_HOURS.light) / GRID_HOURS.typical),
    variants: {
      heavy: variant("heavy", false, false),
      light: variant("light", true, false),
      heavyReserve: variant("heavyReserve", false, true),
      lightReserve: variant("lightReserve", true, true),
    },
  };
}

/** Which wheels fade in a light hour: spread evenly, so the row thins rather than shortens. */
export function lightWheels(total: number, kept: number): number[] {
  const drop = total - kept;
  const out: number[] = [];
  for (let k = 0; k < drop; k++) out.push(Math.min(total - 1, Math.floor(((k + 0.5) * total) / drop)));
  return [...new Set(out)];
}

/** Needle rotation for a frequency; negative is anticlockwise. */
export const needleAngle = (hz: number) => round4((hz - NOMINAL_HZ) * NEEDLE_PER_HZ);

/** Accumulated lag of a wheel behind full speed, radians, at every key of a trace. */
export function wheelLag(traceHz: number[]): number[] {
  const speed = (2 * Math.PI * FPS) / SPIN_FRAMES;
  const dt = KEY_FRAMES / FPS;
  const lag = [0];
  for (let i = 1; i < traceHz.length; i++) {
    lag.push(lag[i - 1] - speed * SLOWDOWN_PER_HZ * (NOMINAL_HZ - traceHz[i - 1]) * dt);
  }
  return lag.map(round4);
}

/** Frames for a held wheel to fall one spoke-repeat behind at the trace's final frequency. */
export function heldLoopFrames(finalHz: number): number {
  const speed = (2 * Math.PI * FPS) / SPIN_FRAMES;
  const lagPerFrame = (speed * SLOWDOWN_PER_HZ * Math.max(NOMINAL_HZ - finalHz, 0.01)) / FPS;
  return Math.min(600, Math.max(30, Math.round(SYMMETRY / lagPerFrame)));
}

/* Geometry, artboard units. Exported so layers can anchor annotations. */
const C = 200;
const RING = 300;
const SHAFT_Y = 252;
const PLANT = { x: 108, r: 17 } as const;
const WHEEL = { x0: 140, step: 24, r: 9 } as const;
const DIAL = { cx: 200, cy: 150, r: 64, needle: 54 } as const;
const RESERVE = { x: 200, y: 306, width: 56, height: 16 } as const;

const dialPoint = (hz: number, r: number = DIAL.r) => {
  const a = (hz - NOMINAL_HZ) * NEEDLE_PER_HZ;
  return [round3(DIAL.cx + r * Math.sin(a)), round3(DIAL.cy - r * Math.cos(a))] as const;
};

export function gridGeometry() {
  return {
    ring: { cx: C, cy: C, r: RING / 2 },
    dial: { cx: DIAL.cx, cy: DIAL.cy, r: DIAL.r },
    nominal: dialPoint(NOMINAL_HZ, DIAL.r + 10),
    floor: dialPoint(FLOOR_HZ, DIAL.r + 12),
    plant: { x: PLANT.x, y: SHAFT_Y, r: PLANT.r },
    wheels: Array.from({ length: WHEELS }, (_, i) => ({ x: WHEEL.x0 + WHEEL.step * i, y: SHAFT_Y, r: WHEEL.r })),
    shaft: { x1: WHEEL.x0, x2: WHEEL.x0 + WHEEL.step * (WHEELS - 1), y: SHAFT_Y },
    reserve: { x: RESERVE.x, y: RESERVE.y },
  };
}

const WHITE = (a: number) => argb(255, 255, 255, a);
const CYAN = argb(92, 214, 226, 0.92);
const VIOLET = argb(186, 104, 255, 1);

export function buildGrid(values: GridValues): Uint8Array {
  const ab = new ArtboardBuilder(GRID.name, GRID.width, GRID.height);
  const g = gridGeometry();
  const ease = ab.cubic(0.42, 0, 0.58, 1);
  const out = ab.cubic(0.2, 0.7, 0.3, 1);
  const fall = ab.cubic(0.55, 0, 0.9, 0.6);

  // Groups, parents first. A wheel is: place (faded by the mass layer) →
  // spin (constant, never re-keyed, so switching states never jumps its angle)
  // → lag (how far it has fallen behind; 0 until a trip).
  const wheels = g.wheels.map((w, i) => {
    const place = ab.group({ name: `wheel ${i}`, x: w.x, y: w.y });
    const spin = ab.group({ name: `wheel ${i} spin`, x: 0, y: 0, parent: place });
    const lag = ab.group({ name: `wheel ${i} lag`, x: 0, y: 0, parent: spin });
    return { place, spin, lag };
  });
  const plant = ab.group({ name: "plant", x: PLANT.x, y: SHAFT_Y });
  const plantSpin = ab.group({ name: "plant spin", x: 0, y: 0, parent: plant });
  const needle = ab.group({ name: "needle", x: DIAL.cx, y: DIAL.cy });
  const reserve = ab.group({ name: "reserve", x: RESERVE.x, y: RESERVE.y, opacity: 0 });

  // Painter's order: first declared is at the back.
  ab.ellipse({ name: "glow", x: C, y: C, width: RING * 1.1, height: RING * 1.1, fill: WHITE(0.045) });
  ab.ellipse({ name: "ring", x: C, y: C, width: RING, height: RING, fill: argb(3, 5, 15, 0.96), stroke: { color: WHITE(0.85), thickness: 3 } });

  const arc: Array<readonly [number, number]> = [];
  for (let hz = 50.3; hz >= 48.6 - 1e-9; hz -= 0.05) arc.push(dialPoint(hz));
  ab.polyline({ name: "dial", x: 0, y: 0, points: arc, stroke: { color: WHITE(0.4), thickness: 2 } });
  const tick = (name: string, hz: number, inner: number, outer: number, color: number, thickness: number) =>
    ab.polyline({ name, x: 0, y: 0, points: [dialPoint(hz, inner), dialPoint(hz, outer)], stroke: { color, thickness } });
  tick("tick 50", NOMINAL_HZ, DIAL.r - 6, DIAL.r + 6, WHITE(0.85), 2);
  tick("tick 49.5", 49.5, DIAL.r - 4, DIAL.r + 4, WHITE(0.4), 2);
  tick("floor", FLOOR_HZ, DIAL.r - 8, DIAL.r + 8, VIOLET, 3);
  tick("shedding", 48.8, DIAL.r - 4, DIAL.r + 4, argb(186, 104, 255, 0.5), 2);

  const needleShape = ab.polyline({ name: "needle hand", x: 0, y: 0, parent: needle, points: [[0, 8], [0, -DIAL.needle]], stroke: { color: WHITE(0.95), thickness: 3 } });
  ab.ellipse({ name: "needle hub", x: DIAL.cx, y: DIAL.cy, width: 9, height: 9, fill: WHITE(0.95) });

  ab.polyline({ name: "shaft", x: 0, y: 0, points: [[g.shaft.x1, SHAFT_Y], [g.shaft.x2, SHAFT_Y]], stroke: { color: WHITE(0.5), thickness: 3 } });
  const plantLink = ab.polyline({ name: "plant link", x: 0, y: 0, points: [[PLANT.x, SHAFT_Y], [g.shaft.x1, SHAFT_Y]], stroke: { color: WHITE(0.5), thickness: 3 } });

  const drawWheel = (name: string, spin: Handle, r: number, color: number) => {
    ab.ellipse({ name: `${name} rim`, x: 0, y: 0, parent: spin, width: r * 2, height: r * 2, fill: argb(3, 5, 15, 1), stroke: { color, thickness: 2 } });
    ab.polyline({ name: `${name} spokes a`, x: 0, y: 0, parent: spin, points: [[-r + 2, 0], [r - 2, 0]], stroke: { color, thickness: 1.5 } });
    ab.polyline({ name: `${name} spokes b`, x: 0, y: 0, parent: spin, points: [[0, -r + 2], [0, r - 2]], stroke: { color, thickness: 1.5 } });
  };
  wheels.forEach((w, i) => drawWheel(`wheel ${i}`, w.lag, WHEEL.r, WHITE(0.85)));
  drawWheel("plant", plantSpin, PLANT.r, VIOLET);

  const reserveLink = ab.polyline({ name: "reserve link", x: 0, y: 0, parent: reserve, points: [[0, -RESERVE.height / 2], [0, SHAFT_Y - RESERVE.y]], stroke: { color: CYAN, thickness: 3 } });
  ab.rect({ name: "reserve block", x: 0, y: 0, parent: reserve, width: RESERVE.width, height: RESERVE.height, cornerRadius: 4, fill: argb(92, 214, 226, 0.12), stroke: { color: CYAN, thickness: 2 } });
  const pulse = ab.ellipse({ name: "reserve pulse", x: 0, y: SHAFT_Y - RESERVE.y, parent: reserve, width: 24, height: 24, stroke: { color: CYAN, thickness: 2 }, opacity: 0 });

  const needleColor = needleShape.strokeColor!;
  const white = WHITE(0.95);
  const lagOf = wheels.map((w) => w.lag);

  // Spin layer: one state, forever.
  const spinAll = ab.animation("spin", SPIN_FRAMES, "loop");
  for (const h of [...wheels.map((w) => w.spin), plantSpin]) spinAll.key(h, "rotation", [[0, 0], [SPIN_FRAMES, 2 * Math.PI]]);

  // Machine layer: the dial, the lag, the plant and the reserve's firing.
  const steady = ab.animation("steady", 180, "loop")
    .key(needle, "rotation", [[0, 0, ease], [50, needleAngle(50.012), ease], [110, needleAngle(49.992), ease], [180, 0]])
    .keyColor(needleColor, [[0, white]])
    .key(plant, "y", [[0, SHAFT_Y]])
    .key(plant, "opacity", [[0, 1]])
    .key(plantLink.shape, "opacity", [[0, 1]])
    .key(reserveLink.shape, "opacity", [[0, 0.3]])
    .key(pulse.shape, "opacity", [[0, 0]]);
  for (const h of lagOf) steady.key(h, "rotation", [[0, 0]]);

  const trip = (v: GridVariant) => {
    const a = ab.animation(`trip ${v.key}`, TRIP_FRAMES, "oneShot");
    a.key(needle, "rotation", v.traceHz.map((hz, i): Key => [i * KEY_FRAMES, needleAngle(hz)]));
    const lag = wheelLag(v.traceHz);
    for (const h of lagOf) a.key(h, "rotation", lag.map((r, i): Key => [i * KEY_FRAMES, r]));
    a.key(plant, "y", [[0, SHAFT_Y, fall], [36, SHAFT_Y + 46]]);
    a.key(plant, "opacity", [[0, 1, "hold"], [8, 1, ease], [36, 0]]);
    a.key(plantLink.shape, "opacity", [[0, 1, "hold"], [3, 0]]);
    if (v.belowFloor) {
      const [down, up] = v.belowFloor;
      const colors: Array<readonly [number, number, "hold"]> = [[0, white, "hold"], [down * KEY_FRAMES, VIOLET, "hold"]];
      if (up * KEY_FRAMES < TRIP_FRAMES) colors.push([up * KEY_FRAMES, white, "hold"]);
      a.keyColor(needleColor, colors);
    } else {
      a.keyColor(needleColor, [[0, white]]);
    }
    if (v.fireIndex !== null) {
      const at = v.fireIndex * KEY_FRAMES;
      const end = Math.min(TRIP_FRAMES, at + 36);
      a.key(reserveLink.shape, "opacity", [[0, 0.3, "hold"], [at, 1]]);
      a.key(pulse.shape, "opacity", [[0, 0, "hold"], [at, 0.9, out], [end, 0]]);
      a.key(pulse.shape, "scaleX", [[0, 0.6, "hold"], [at, 0.6, out], [end, 2.4]]);
      a.key(pulse.shape, "scaleY", [[0, 0.6, "hold"], [at, 0.6, out], [end, 2.4]]);
    } else {
      a.key(reserveLink.shape, "opacity", [[0, 0.3]]);
      a.key(pulse.shape, "opacity", [[0, 0]]);
    }
    return a;
  };

  const held = (v: GridVariant) => {
    const last = v.traceHz[v.traceHz.length - 1];
    const lagEnd = wheelLag(v.traceHz).at(-1)!;
    const frames = heldLoopFrames(last);
    const a = ab.animation(`held ${v.key}`, frames, "loop")
      .key(needle, "rotation", [[0, needleAngle(last)]])
      .keyColor(needleColor, [[0, last < FLOOR_HZ ? VIOLET : white]])
      .key(plant, "y", [[0, SHAFT_Y + 46]])
      .key(plant, "opacity", [[0, 0]])
      .key(plantLink.shape, "opacity", [[0, 0]])
      .key(reserveLink.shape, "opacity", [[0, v.fireIndex !== null ? 1 : 0.3]])
      .key(pulse.shape, "opacity", [[0, 0]]);
    for (const h of lagOf) a.key(h, "rotation", [[0, lagEnd], [frames, round4(lagEnd - SYMMETRY)]]);
    return a;
  };

  const order: GridVariantKey[] = ["heavy", "light", "heavyReserve", "lightReserve"];
  const trips = order.map((k) => trip(values.variants[k]));
  const helds = order.map((k) => held(values.variants[k]));

  // Mass layer: a light hour fades wheels out of the row.
  const faded = lightWheels(values.wheelsTypical, values.wheelsLight).map((i) => wheels[i].place);
  const heavyMass = ab.animation("heavy", 60, "loop");
  const lightMass = ab.animation("light", 60, "loop");
  for (const h of faded) {
    heavyMass.key(h, "opacity", [[0, 1]]);
    lightMass.key(h, "opacity", [[0, 0.08]]);
  }

  const reserveOff = ab.animation("reserve off", 60, "loop").key(reserve, "opacity", [[0, 0]]);
  const reserveOn = ab.animation("reserve on", 60, "loop").key(reserve, "opacity", [[0, 1]]);

  const vm = ab.viewModel(GRID.viewModel);
  const tripProp = vm.trigger(GRID.props.trip);
  const tripped = vm.boolean(GRID.props.tripped);
  const light = vm.boolean(GRID.props.light);
  const reserveProp = vm.boolean(GRID.props.reserve);

  const sm = ab.stateMachine(GRID.stateMachine);
  const [machineReport, massReport, reserveReport] = GRID.reports;
  const spinLayer = sm.layer("spin");
  spinLayer.transition(spinLayer.entry, spinLayer.play(spinAll));

  const machine = sm.layer(machineReport);
  const sSteady = machine.play(steady);
  machine.transition(machine.entry, sSteady);
  order.forEach((k, i) => {
    const v = values.variants[k];
    const sTrip = machine.play(trips[i]);
    const sHeld = machine.play(helds[i]);
    const which = [
      { vm: light, value: v.light },
      { vm: reserveProp, value: v.reserve },
    ];
    machine.transition(sSteady, sTrip, { conditions: [{ vmTrigger: tripProp }, ...which] });
    machine.transition(sSteady, sHeld, { conditions: [{ vm: tripped, value: true }, ...which] });
    machine.transition(sTrip, sHeld, { conditions: [], exitAtPercent: 100 });
  });
  machine.report(vm.enum(machineReport, machine.stateNames()));

  const mass = sm.layer(massReport);
  const sHeavy = mass.play(heavyMass);
  const sLight = mass.play(lightMass);
  mass.transition(mass.entry, sHeavy);
  mass.transition(sHeavy, sLight, { conditions: [{ vm: light, value: true }], durationMs: 450 });
  mass.transition(sLight, sHeavy, { conditions: [{ vm: light, value: false }], durationMs: 450 });
  mass.report(vm.enum(massReport, mass.stateNames()));

  const reserveLayer = sm.layer(reserveReport);
  const sOff = reserveLayer.play(reserveOff);
  const sOn = reserveLayer.play(reserveOn);
  reserveLayer.transition(reserveLayer.entry, sOff);
  reserveLayer.transition(sOff, sOn, { conditions: [{ vm: reserveProp, value: true }], durationMs: 300 });
  reserveLayer.transition(sOn, sOff, { conditions: [{ vm: reserveProp, value: false }], durationMs: 300 });
  reserveLayer.report(vm.enum(reserveReport, reserveLayer.stateNames()));

  return ab.encode(0x6e1d);
}
