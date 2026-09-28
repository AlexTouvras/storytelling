import { describe, expect, it } from "vitest";
import pack from "../../../data/figures/how-much-fast-reserve.v1.json";
import { simulateTrip } from "@/lib/sim/grid-frequency";
import { checkTrip, lossFromInitialFall, summarise, type TripCheck } from "@/lib/sim/grid-validation";

const trips = pack.events.all.filter((e) => e.class === "trip");
const checks = trips.map((t) => checkTrip(t)).filter((c): c is TripCheck => c !== null);
const summary = summarise(checks);

describe("lossFromInitialFall", () => {
  it("recovers a known loss from the model's own first second", () => {
    const { trace } = simulateTrip({ kineticGWs: 170, lossMW: 800, startHz: 49.98 }, { seconds: 1.2, sampleSeconds: 0.1 });
    expect(lossFromInitialFall(170, trace[10] - trace[0], 49.98)).toBeCloseTo(800, -1);
  });
});

describe("the design-case model against Fingrid's measured trips", () => {
  it("checks every trip", () => {
    expect(checks).toHaveLength(trips.length);
  });

  it("gets the timing of the nadir right", () => {
    expect(Math.abs(summary.medianNadirSecondsModeled - summary.medianNadirSecondsObserved)).toBeLessThan(1.5);
  });

  it("falls deeper than real trips did: the design case is conservative", () => {
    expect(summary.medianDepthRatio).toBeGreaterThan(1.3);
    expect(summary.medianDepthRatio).toBeLessThan(2.2);
    const deeper = checks.filter((c) => c.modeledDepthMHz > c.observedDepthMHz).length;
    expect(deeper / checks.length).toBeGreaterThanOrEqual(0.8);
  });
});
