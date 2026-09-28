import { describe, expect, it } from "vitest";
import {
  FIELD_RANGE,
  GRID_HOLDS,
  GRID_POSES,
  GRID_RUNS,
  fieldPoint,
  gridBeatAt,
  gridFrameAt,
  gridLayout,
  gridRunAt,
} from "@/lib/director/grid-film";
import { GRID_BEATS } from "@/components/film/grid-copy";

describe("grid film timeline", () => {
  it("walks the six beats in order and ends on the decision", () => {
    const beats = [...new Set(GRID_POSES.map((p) => p.beat))];
    expect(beats).toEqual(GRID_BEATS.map((_, i) => i));
    expect(gridBeatAt(1)).toBe(GRID_BEATS.length - 1);
  });

  it("holds on the hour until the pullback, and ends wide", () => {
    for (const p of [0, 0.2, 0.5, 0.8]) expect(gridFrameAt(p).focus).toBe(1);
    expect(gridFrameAt(1).focus).toBe(0);
    expect(gridFrameAt(1).field).toBe(1);
  });

  it("only opens the machine once the trace has folded away", () => {
    for (let p = 0; p <= 1; p += 0.005) {
      const f = gridFrameAt(p);
      expect(f.trace * f.open, `at ${p.toFixed(3)}`).toBeLessThan(0.02);
    }
  });

  it("fires each run's trip while the machine is open, in its own segment", () => {
    GRID_RUNS.forEach((run, i) => {
      expect(gridRunAt(run.cue.at)).toBe(i);
      expect(gridFrameAt(run.cue.at).open).toBeGreaterThan(0.99);
      expect(run.cue.at).toBeGreaterThan(run.from);
    });
    expect(GRID_RUNS.map((r) => [r.light, r.reserve])).toEqual([
      [false, false],
      [true, false],
      [true, true],
    ]);
  });

  it("lists holds for the camera to creep through", () => {
    expect(GRID_HOLDS.length).toBeGreaterThanOrEqual(4);
  });

  it("cuts under reduced motion: no channel is ever between two poses", () => {
    const values = new Set(GRID_POSES.map((p) => p.pen));
    for (let p = 0; p <= 1; p += 0.01) expect(values.has(gridFrameAt(p, true).pen)).toBe(true);
    expect(gridFrameAt(0.05, true).pen).toBe(60);
  });
});

describe("grid layout", () => {
  it("keeps the picture right of the narration on a laptop and above it on a phone", () => {
    const laptop = gridLayout({ width: 1280, height: 800 });
    expect(laptop.screen.x - laptop.machine.width / 2).toBeGreaterThan(0.38 * 1280);
    const phone = gridLayout({ width: 390, height: 844 });
    expect(phone.screen.y + phone.machine.height / 2).toBeLessThan(0.58 * 844);
    expect(phone.chart.y + phone.chart.height + phone.screen.y).toBeLessThanOrEqual(0.56 * 844 + 1);
  });

  it("places an hour inside the field", () => {
    const { field } = gridLayout({ width: 1280, height: 800 });
    const p = fieldPoint(field, 7310, 8760, 169.6, FIELD_RANGE);
    expect(p.x).toBeGreaterThan(field.x);
    expect(p.x).toBeLessThan(field.x + field.width);
    expect(p.y).toBeGreaterThan(field.y);
    expect(p.y).toBeLessThan(field.y + field.height);
  });
});
