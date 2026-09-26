import { describe, expect, it } from "vitest";
import {
  RECOVERY_HOLDS,
  recoveryBeatAt,
  recoveryFrameAt,
  recoveryVariantIndex,
  BUDGET_STRENGTHS,
} from "@/components/film/recovery-frame";

const STEPS = 400;

describe("recovery film frame", () => {
  it("runs the ten acts in order, one beat at a time", () => {
    expect(recoveryBeatAt(0)).toBe(0);
    expect(recoveryBeatAt(1)).toBe(10);

    let prev = 0;
    const seen = new Set<number>([0]);
    for (let i = 0; i <= STEPS; i++) {
      const beat = recoveryBeatAt(i / STEPS);
      expect(beat).toBeGreaterThanOrEqual(prev);
      expect(beat - prev).toBeLessThanOrEqual(1);
      prev = beat;
      seen.add(beat);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("opens on the whole network and closes on the decision", () => {
    const open = recoveryFrameAt(0);
    expect(open.lineFocus).toBe(0);
    expect(open.spanX).toBe(1);
    expect(open.population).toBeGreaterThan(0);
    expect(open.curve).toBe(0);
    expect(open.decide).toBe(0);

    const end = recoveryFrameAt(1);
    expect(end.lineFocus).toBe(1);
    expect(end.curve).toBe(1);
    expect(end.margin).toBe(1);
    expect(end.budget).toBe(1);
    expect(end.decide).toBe(1);
  });

  it("narrows once and never widens back to the network", () => {
    let prev = 0;
    for (let i = 0; i <= STEPS; i++) {
      const { lineFocus } = recoveryFrameAt(i / STEPS);
      expect(lineFocus).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = lineFocus;
    }
  });

  it("builds travel through the opening move rather than easing out early", () => {
    const first = recoveryFrameAt(0.09).spanX - recoveryFrameAt(0.055).spanX;
    const last = recoveryFrameAt(0.215).spanX - recoveryFrameAt(0.18).spanX;
    expect(Math.abs(last)).toBeGreaterThan(Math.abs(first));
  });

  it("scrubs the budget forward only, and never past the frozen range", () => {
    let prev = 0;
    for (let i = 0; i <= STEPS; i++) {
      const { budget } = recoveryFrameAt(i / STEPS);
      expect(budget).toBeGreaterThanOrEqual(prev - 1e-9);
      expect(budget).toBeLessThanOrEqual(1);
      prev = budget;
    }
  });

  it("reaches quarter strength in the first third of the scrub", () => {
    // Most of the counterfactual's effect lands by quarter strength, so the
    // reader must see the curve answer early instead of only at the end.
    expect(recoveryFrameAt(0.81).budget).toBeGreaterThanOrEqual(0.25 - 1e-9);
  });

  it("declares a hold for each beat that only moves a panel", () => {
    expect(RECOVERY_HOLDS).toHaveLength(2);
    const [season, decision] = RECOVERY_HOLDS;
    expect(season.beat).toBe(6);
    expect(decision.beat).toBe(10);
    for (const hold of RECOVERY_HOLDS) {
      const mid = (hold.from + hold.to) / 2;
      expect(recoveryFrameAt(mid).hold).toBeGreaterThan(0);
    }
  });

  it("does not report a hold while the canvas is moving", () => {
    for (const progress of [0.1, 0.25, 0.34, 0.4, 0.6, 0.72, 0.83]) {
      expect(recoveryFrameAt(progress).hold).toBe(0);
    }
  });

  it("snaps to pose endpoints under reduced motion", () => {
    const frame = recoveryFrameAt(0.3, true);
    expect(frame.run === 0 || frame.run === 1).toBe(true);
    expect(frame.beat).toBe(recoveryBeatAt(0.3));
    expect(frame.hold).toBe(0);
  });

  it("snaps a printed figure to a frozen variant", () => {
    expect(recoveryVariantIndex(0)).toBe(0);
    expect(recoveryVariantIndex(0.3)).toBe(1);
    expect(recoveryVariantIndex(0.49)).toBe(2);
    expect(recoveryVariantIndex(1)).toBe(BUDGET_STRENGTHS.length - 1);
  });
});
