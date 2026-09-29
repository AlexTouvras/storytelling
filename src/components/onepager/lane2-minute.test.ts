import { describe, expect, it } from "vitest";
import { LANE2_MINUTE } from "./lane2-minute";

const [now, later] = LANE2_MINUTE.frames;

describe("lane 2 minute", () => {
  it("holds the two observed frames", () => {
    expect(now.cars).toHaveLength(25);
    expect(later.cars).toHaveLength(27);
    expect(later.seconds - now.seconds).toBe(60);
  });

  it("moves the slow cars backward while the far end stays fast", () => {
    const slowest = (cars: { y: number; mph: number }[]) =>
      cars.reduce((a, b) => (a.mph < b.mph ? a : b));
    const ahead = (cars: { y: number; mph: number }[]) =>
      cars.filter((c) => c.y > 1800);
    const mean = (cars: { mph: number }[]) =>
      cars.reduce((s, c) => s + c.mph, 0) / cars.length;

    const a = slowest(now.cars);
    const b = slowest(later.cars);
    expect(a.y).toBeGreaterThan(800);
    expect(a.mph).toBeLessThan(20);
    expect(b.y).toBeLessThan(200);
    expect(b.mph).toBeLessThan(12);
    expect(b.y).toBeLessThan(a.y - 600);
    expect(mean(ahead(now.cars))).toBeGreaterThan(40);
    expect(mean(ahead(later.cars))).toBeGreaterThan(40);
  });
});
