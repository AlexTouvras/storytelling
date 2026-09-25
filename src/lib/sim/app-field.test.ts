import { describe, expect, it } from "vitest";
import { approvalStats, buildAppField } from "@/lib/sim/app-field";
import { cutoffBeatAt, cutoffFrameAt } from "@/components/film/cutoff-frame";
import { ootAtCutoff } from "@/components/film/CutoffHorizonChart";

describe("app-field", () => {
  it("builds a stable seeded cloud near 8% defaults", () => {
    const a = buildAppField();
    const b = buildAppField();
    expect(a.points.length).toBe(2400);
    expect(a.featured.id).toBe(b.featured.id);
    expect(a.defaultRate).toBeGreaterThan(0.05);
    expect(a.defaultRate).toBeLessThan(0.12);
  });

  it("approvalStats respond to the gate", () => {
    const model = buildAppField();
    const tight = approvalStats(model.points, 0.05);
    const loose = approvalStats(model.points, 0.2);
    expect(loose.approvalRate).toBeGreaterThan(tight.approvalRate);
  });
});

describe("cutoff-frame", () => {
  it("maps progress to beats 0–7", () => {
    expect(cutoffBeatAt(0)).toBe(0);
    expect(cutoffBeatAt(0.1)).toBe(1);
    expect(cutoffBeatAt(0.5)).toBe(4);
    expect(cutoffBeatAt(0.95)).toBe(7);
  });

  it("snaps under reduced motion", () => {
    const frame = cutoffFrameAt(0.6, true);
    expect(frame.gatePd).toBeCloseTo(0.075, 3);
    expect(frame.filter).toBe(1);
  });
});

describe("OOT frontier marker", () => {
  it("interpolates bad among approved onto the frozen curve", () => {
    const at15 = ootAtCutoff(0.15);
    expect(at15.approvalRate).toBeGreaterThan(0.88);
    expect(at15.approvalRate).toBeLessThan(0.93);
    expect(at15.badRateApproved).toBeGreaterThan(0.055);
    expect(at15.badRateApproved).toBeLessThan(0.062);
    const at23 = ootAtCutoff(0.23);
    expect(at23.badRateApproved).toBeGreaterThan(0.06);
    expect(at23.badRateApproved).toBeLessThan(0.07);
  });
});
