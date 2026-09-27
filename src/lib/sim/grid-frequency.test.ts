import { describe, expect, it } from "vitest";
import {
  FFR_OPTIONS,
  GRID_CALIBRATION_TARGETS as T,
  fastReserveNeeded,
  simulateTrip,
} from "@/lib/sim/grid-frequency";

const reference = (kineticGWs: number, ffrMW = 0) =>
  simulateTrip({
    kineticGWs,
    lossMW: 1450,
    fastReserve: ffrMW ? { ...FFR_OPTIONS[1], mw: ffrMW } : undefined,
  });

describe("grid frequency model: calibration", () => {
  it("holds the published design point: FCR-D alone keeps 49.0 Hz at 150 GWs", () => {
    expect(reference(T.designPoint.kineticGWs).nadirHz).toBeCloseTo(T.designPoint.nadirHz, 1);
    expect(Math.abs(reference(150).nadirHz - 49.0)).toBeLessThan(0.05);
  });

  it("holds the low-inertia point: about 300 MW of FFR keeps 49.0 Hz at 100 GWs", () => {
    expect(Math.abs(reference(100, T.lowInertia.ffrMW).nadirHz - 49.0)).toBeLessThan(0.05);
    expect(reference(100).nadirHz).toBeLessThan(49.0);
  });

  it("misses Ørum's mass-for-a-tenth figure by about half, which is why it is never quoted", () => {
    const base = reference(80).nadirHz;
    let extra = 0;
    while (reference(80 + extra).nadirHz < base + 0.1) extra++;
    expect(extra).toBeGreaterThanOrEqual(8);
    expect(extra).toBeLessThan(T.massForTenthHz.extraGWs);
  });
});

describe("grid frequency model: shape", () => {
  it("falls faster and deeper with less spinning mass", () => {
    const heavy = reference(190);
    const light = reference(100);
    expect(light.nadirHz).toBeLessThan(heavy.nadirHz);
    const earlyDrop = (r: ReturnType<typeof reference>) => r.trace[0] - r.trace[10];
    expect(earlyDrop(light)).toBeGreaterThan(earlyDrop(heavy) * 1.7);
  });

  it("fast reserve lifts the nadir and brings it earlier", () => {
    const without = reference(100);
    const withFfr = reference(100, 300);
    expect(withFfr.nadirHz).toBeGreaterThan(without.nadirHz);
    expect(withFfr.nadirSeconds).toBeLessThan(without.nadirSeconds);
  });

  it("the three FFR activation options perform alike, as the product design says", () => {
    const nadirs = FFR_OPTIONS.map(
      (o) => simulateTrip({ kineticGWs: 100, lossMW: 1450, fastReserve: { ...o, mw: 300 } }).nadirHz,
    );
    expect(Math.max(...nadirs) - Math.min(...nadirs)).toBeLessThan(0.06);
  });

  it("needs no fast reserve on a heavy hour and more as inertia falls", () => {
    expect(fastReserveNeeded(190, 1450)).toBe(0);
    const at120 = fastReserveNeeded(120, 1450);
    const at100 = fastReserveNeeded(100, 1450);
    expect(at120).toBeGreaterThan(0);
    expect(at100).toBeGreaterThan(at120);
    expect(at100).toBeLessThanOrEqual(400);
  });

  it("recovers above the nadir: FCR-D arrests the fall rather than the trace running off", () => {
    const r = reference(150);
    expect(r.trace[r.trace.length - 1]).toBeGreaterThan(r.nadirHz + 0.1);
  });
});
