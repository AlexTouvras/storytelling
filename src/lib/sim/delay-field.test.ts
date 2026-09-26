import { describe, expect, it } from "vitest";
import pack from "../../../data/figures/where-should-the-recovery-time-sit.v1.json";
import {
  LATE_MIN,
  buildDelayField,
  fieldCarryOver,
  lateAt,
  marksOfRun,
  RUNS_PER_LINE,
} from "@/lib/sim/delay-field";

const model = buildDelayField();

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function carryByService(service: 0 | 1): number {
  const indices = model.lines
    .map((line, i) => (line.service === service ? i : -1))
    .filter((i) => i >= 0);
  return indices.reduce((total, i) => total + fieldCarryOver(model, i), 0) / indices.length;
}

describe("delay field", () => {
  it("stays inside the mark budget the frame cost was measured at", () => {
    // Act IV only lights one line's marks, so the field has to be dense enough
    // that a single line still reads as a population. The ceiling is the one the
    // frame-cost gate in `e2e/frame-cost.spec.ts` actually measured.
    expect(model.marks.length).toBeGreaterThan(5000);
    expect(model.marks.length).toBeLessThanOrEqual(7000);
  });

  it("draws one mark per stop of every run on every line in the pack", () => {
    expect(model.lines).toHaveLength(pack.lines.length);
    for (const [i, line] of model.lines.entries()) {
      expect(line.stopCodes).toHaveLength(pack.lines[i].stops.length);
      expect(line.margin).toHaveLength(pack.lines[i].stops.length - 1);
      const onLine = model.marks.filter((mark) => mark.lineIndex === i);
      expect(onLine).toHaveLength(RUNS_PER_LINE * pack.lines[i].stops.length);
    }
  });

  it("conserves each line's total margin when it re-lays it", () => {
    for (const line of model.lines) {
      expect(sum(line.marginAlt)).toBeCloseTo(sum(line.margin), 6);
      // Re-allocation never hands a leg negative margin, so the counterfactual
      // cannot invent a schedule below its own floor.
      for (const value of line.marginAlt) expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it("reproduces the measured carry-over per service type", () => {
    expect(carryByService(1)).toBeCloseTo(pack.survival.by_category["Long-distance"][0].median, 1);
    expect(carryByService(0)).toBeCloseTo(pack.survival.by_category.Commuter[0].median, 1);
    // The Act V claim has to be visible in the picture, not only in the copy.
    expect(carryByService(0)).toBeGreaterThan(carryByService(1));
  });

  it("lands every line within ten points of its measured carry-over", () => {
    for (const [i, line] of model.lines.entries()) {
      const measured = pack.lines[i].survival[0].median;
      expect(Math.abs(fieldCarryOver(model, i) - measured)).toBeLessThan(0.1);
      expect(line.id).toBe(pack.lines[i].id);
    }
  });

  it("calibrates the scrub to the frozen replay instead of re-deriving it", () => {
    // The gains are solved on a large internal sample, so they are checked on a
    // large field. Sixteen drawn runs cannot resolve a carry-over to a point.
    const wide = buildDelayField(400);
    for (const [i, line] of wide.lines.entries()) {
      const variants = pack.lines[i].counterfactual.variants;
      expect(line.variantGain).toHaveLength(variants.length);
      expect(line.variantGain[0]).toBe(1);

      // Each frozen strength moves the field by the ratio the pack froze, so the
      // marks and the caption cannot disagree about direction or size.
      const today = fieldCarryOver(wide, i);
      for (const [v, variant] of variants.entries()) {
        const wanted = (variant.curve[0].share / variants[0].curve[0].share) * today;
        expect(Math.abs(fieldCarryOver(wide, i, v) - wanted)).toBeLessThan(0.05);
      }
    }
  });

  it("lets a commuter line get worse past its best variant, because the replay does", () => {
    const rebounds = model.lines
      .filter((line) => line.service === 0)
      .filter((line, i) => {
        const shares = pack.lines
          .filter((p) => p.category === "Commuter")
          [i].counterfactual.variants.map((v) => v.curve[0].share);
        const best = Math.min(...shares.slice(1));
        return shares[shares.length - 1] > best + 1e-6;
      });
    expect(rebounds.length).toBeGreaterThan(0);
  });

  it("moves the marks continuously between frozen strengths", () => {
    const line = model.lines[model.focusLineIndex];
    const mark = model.marks.find(
      (m) => m.lineIndex === model.focusLineIndex && m.late > LATE_MIN,
    );
    expect(mark).toBeDefined();
    const strengths = line.variantStrength;
    expect(lateAt(mark!, strengths, 0)).toBe(mark!.late);
    const eighth = lateAt(mark!, strengths, 0.125);
    expect(eighth).toBeLessThan(mark!.late);
    expect(eighth).toBeGreaterThan(lateAt(mark!, strengths, 0.25));
  });

  it("re-lays the focus line's margin toward the legs that shed least", () => {
    const line = model.lines[model.focusLineIndex];
    const tightest = line.margin.indexOf(Math.min(...line.margin));
    const slackest = line.margin.indexOf(Math.max(...line.margin));
    expect(line.marginAlt[tightest]).toBeGreaterThan(line.margin[tightest]);
    expect(line.marginAlt[slackest]).toBeLessThan(line.margin[slackest]);
  });

  it("follows a run that leaves on time and then picks a delay up", () => {
    const run = marksOfRun(model, model.featured.lineIndex, model.featured.runIndex);
    expect(run.length).toBeGreaterThan(4);
    expect(run[0].late).toBe(0);
    expect(Math.max(...run.map((mark) => mark.late))).toBeGreaterThanOrEqual(LATE_MIN);
    for (const [i, mark] of run.entries()) expect(mark.stop).toBe(i);
  });

  it("is a conditioned field, and does not pretend to be the network's late share", () => {
    // Every run picks up a delay, so this is much higher than the network's
    // median day. The Open beat quotes the pack for that, never this.
    expect(model.lateShare).toBeGreaterThan(pack.baseline.late_share.high);
  });

  it("is deterministic for a seed and different across seeds", () => {
    const minutes = (seed: number) => sum(buildDelayField(RUNS_PER_LINE, seed).marks.map((m) => m.late));
    expect(minutes(23)).toBe(sum(model.marks.map((m) => m.late)));
    expect(minutes(24)).not.toBe(minutes(23));
  });
});
