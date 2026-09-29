import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROP, TYPE, decodeRiv } from "@/lib/rive/riv-writer";
import { FLOOR_HZ, simulateTrip } from "@/lib/sim/grid-frequency";
import {
  GRID,
  GRID_HOURS,
  GRID_LOSS_MW,
  buildGrid,
  gridValues,
  heldLoopFrames,
  lightWheels,
  needleAngle,
  wheelLag,
} from "@/illustrations/grid";

const key = (name: keyof typeof PROP) => PROP[name][0];
const values = gridValues();
const { heavy, light, heavyReserve, lightReserve } = values.variants;

describe("gridValues", () => {
  it("takes the wheel count from the two hours' kinetic energy", () => {
    expect(values.wheelsLight).toBe(Math.round((values.wheelsTypical * GRID_HOURS.light) / GRID_HOURS.typical));
    expect(values.wheelsLight).toBeLessThan(values.wheelsTypical);
  });

  it("draws the modelled reference trip, sample for sample", () => {
    const run = simulateTrip({ kineticGWs: GRID_HOURS.typical, lossMW: GRID_LOSS_MW }, { seconds: 20.5, sampleSeconds: 0.5 });
    expect(heavy.traceHz).toHaveLength(GRID.tripSeconds * 10 + 1);
    heavy.traceHz.forEach((hz, i) => expect(hz).toBeCloseTo(run.trace[i], 3));
    expect(heavy.nadirHz).toBeCloseTo(run.nadirHz, 3);
  });

  it("only the light hour without reserve crosses the floor, as the film says", () => {
    expect(light.belowFloor).not.toBeNull();
    expect(light.nadirHz).toBeLessThan(FLOOR_HZ);
    for (const v of [heavy, heavyReserve, lightReserve]) {
      expect(v.belowFloor).toBeNull();
      expect(v.nadirHz).toBeGreaterThanOrEqual(FLOOR_HZ);
    }
  });

  it("fires reserve only where it is held, and sooner in the lighter hour", () => {
    expect(heavy.fireIndex).toBeNull();
    expect(light.fireIndex).toBeNull();
    expect(lightReserve.fireIndex).not.toBeNull();
    expect(heavyReserve.fireIndex).not.toBeNull();
    expect(lightReserve.fireIndex!).toBeLessThan(heavyReserve.fireIndex!);
  });
});

describe("grid motion", () => {
  it("points the needle up at 50 Hz and a quarter turn left at the floor", () => {
    expect(needleAngle(50)).toBe(0);
    expect(needleAngle(FLOOR_HZ)).toBeCloseTo(-Math.PI / 2, 4);
  });

  it("lags the wheels more in the lighter hour", () => {
    const heavyLag = wheelLag(heavy.traceHz);
    const lightLag = wheelLag(light.traceHz);
    expect(heavyLag[0]).toBe(0);
    for (let i = 1; i < heavyLag.length; i++) expect(heavyLag[i]).toBeLessThanOrEqual(heavyLag[i - 1]);
    expect(lightLag.at(-1)!).toBeLessThan(heavyLag.at(-1)!);
  });

  it("holds a wheel's end speed within a tenth of its speed at the end of the trip", () => {
    for (const v of Object.values(values.variants)) {
      const lag = wheelLag(v.traceHz);
      const endRate = (lag.at(-1)! - lag.at(-2)!) / 6;
      const heldRate = -(Math.PI / 2) / heldLoopFrames(v.traceHz.at(-1)!);
      expect(Math.abs(heldRate - endRate)).toBeLessThan(Math.abs(endRate) * 0.1);
    }
  });

  it("thins the row evenly in a light hour", () => {
    expect(lightWheels(8, 4)).toEqual([1, 3, 5, 7]);
    expect(lightWheels(8, 8)).toEqual([]);
  });
});

describe("grid.riv", () => {
  const committed = readFileSync(join(process.cwd(), "src/illustrations/grid.riv"));

  it("is exactly what the model produces today", () => {
    expect(Buffer.compare(committed, Buffer.from(buildGrid(values)))).toBe(0);
  });

  it("carries the state machine and the view model the director drives, and no inputs", () => {
    const { objects } = decodeRiv(new Uint8Array(committed));
    const machine = objects.find((o) => o.type === TYPE.stateMachine)!;
    expect(machine.props.get(key("animName"))).toBe(GRID.stateMachine);
    const names = (type: number) => objects.filter((o) => o.type === type).map((o) => o.props.get(key("vmName")));
    expect(names(TYPE.viewModel)).toEqual([GRID.viewModel]);
    expect(names(TYPE.vmPropertyTrigger)).toEqual([GRID.props.trip]);
    expect(names(TYPE.vmPropertyBoolean)).toEqual([GRID.props.tripped, GRID.props.light, GRID.props.reserve]);
    expect(names(TYPE.vmPropertyEnumCustom)).toEqual([...GRID.reports]);
    expect(objects.some((o) => o.type === TYPE.smTrigger || o.type === TYPE.smBool)).toBe(false);
    const artboard = objects.find((o) => o.type === TYPE.artboard)!;
    expect(artboard.props.get(key("name"))).toBe(GRID.name);
  });

  it("stays a KB-size asset", () => {
    expect(committed.byteLength).toBeLessThan(32 * 1024);
  });
});
