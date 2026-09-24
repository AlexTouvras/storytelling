import { describe, expect, it } from "vitest";
import {
  runBaseCase,
  runSensitivityGrid,
  STORY_SIM,
} from "@/lib/sim/rate-buffer-book";
import {
  CALIBRATION_V2,
  withinBand,
} from "@/lib/sim/calibration";

describe("rate-buffer-book", () => {
  it("is deterministic for seed 42", () => {
    const a = runBaseCase();
    const b = runBaseCase();
    expect(a).toEqual(b);
    expect(a.assumptions.seed).toBe(42);
    expect(a.assumptions.thinBufferCutoff).toBe(0.06);
  });

  it("keeps calibrated thin shares inside WP 3053 rhyme bands", () => {
    const r = runBaseCase();
    expect(
      withinBand(
        r.before.thinBalanceShare,
        CALIBRATION_V2.thinBalanceShareBefore.target,
        CALIBRATION_V2.thinBalanceShareBefore.band,
      ),
    ).toBe(true);
    expect(
      withinBand(
        r.after.thinBalanceShare,
        CALIBRATION_V2.thinBalanceShareAfter.target,
        CALIBRATION_V2.thinBalanceShareAfter.band,
      ),
    ).toBe(true);
    expect(r.after.thinBalanceShare).toBeGreaterThan(r.before.thinBalanceShare);
  });

  it("exposes STORY_SIM display strings used by the panel", () => {
    expect(STORY_SIM.display.floatingThin).toMatch(/%$/);
    expect(STORY_SIM.display.n).toBe(2000);
    expect(STORY_SIM.display.shockBps).toBe(300);
  });

  it("sensitivity grid covers float × shock cells", () => {
    const grid = runSensitivityGrid();
    expect(grid).toHaveLength(9);
    const base = grid.find(
      (c) => c.floatingShare === 0.35 && c.shockBps === 300,
    );
    expect(base?.floatingThinBalanceShare).toBeCloseTo(
      STORY_SIM.base.actionableSlice.floatingThinBalanceShare,
      5,
    );
  });
});
