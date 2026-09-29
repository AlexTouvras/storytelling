import { describe, expect, it } from "vitest";
import { jamModel, jamModelDrawn, replayMinute } from "@/lib/sim/car-following";

describe("the featured minute", () => {
  const { base, variant } = jamModel();

  it("walks the slow cell upstream and leaves the far end in the forties", () => {
    expect(base.passes).toBe(true);
    expect(base.walkMph).toBeGreaterThan(7);
    expect(base.walkMph).toBeLessThan(11);
    const end = base.samples[base.samples.length - 1];
    expect(end.t).toBe(300);
    expect(end.yFt).toBeLessThan(200);
    expect(end.slowMph).toBeGreaterThan(5);
    expect(end.downstreamMph).toBeGreaterThan(40);
    expect(base.samples.map((s) => s.yFt)).toEqual([800, 500, 200, 100]);
  });

  it("does not draw a follower that is allowed to brake harder than the car ahead", () => {
    expect(variant.passes).toBe(false);
    expect(jamModelDrawn()).toBe(true);
    const end = variant.samples[variant.samples.length - 1];
    expect(end.slowMph).toBeGreaterThan(30);
    expect(variant.walkMph).toBeLessThan(4);
  });

  it("is the same run twice", () => {
    const again = replayMinute(false);
    expect(again.walkMph).toBeCloseTo(base.walkMph, 5);
    expect(again.samples.map((s) => s.yFt)).toEqual(base.samples.map((s) => s.yFt));
  });
});
