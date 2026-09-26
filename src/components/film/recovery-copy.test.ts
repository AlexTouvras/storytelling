import { describe, expect, it } from "vitest";
import pack from "../../../data/figures/where-should-the-recovery-time-sit.v1.json";
import {
  COMMUTER_FLOOR,
  COMMUTER_LINES_SHORT_OF_LONG_DISTANCE,
  FOCUS_LINE,
  LONG_DISTANCE_TODAY,
  RECOVERY_BEATS,
  bestVariant,
  currentVariant,
  recoveryCopyFor,
} from "@/components/film/recovery-copy";

describe("recovery film narration", () => {
  it("gives every beat copy and a badge", () => {
    for (const beat of RECOVERY_BEATS) {
      const copy = recoveryCopyFor(beat);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.paragraphs.length).toBeGreaterThan(0);
      for (const paragraph of copy.paragraphs) {
        expect(paragraph).not.toMatch(/undefined|NaN/);
      }
      expect(copy.kind).not.toBeNull();
    }
  });

  it("titles the film on the reader's question and holds the decision to the close", () => {
    expect(recoveryCopyFor(0).title).toBe("Why don't delays die?");
    expect(recoveryCopyFor(10).title).toContain("where should the recovery time sit");
  });

  it("never answers the title with a cause of delays", () => {
    // The pack attributes ~1% of rows, so the film explains what keeps a delay
    // alive and must not name what created it.
    const forbidden = /\b(weather|snow|storm|breakdown|rolling stock failure|strike)\b/i;
    for (const beat of RECOVERY_BEATS) {
      const copy = recoveryCopyFor(beat);
      const text = [copy.title, ...copy.paragraphs].join(" ");
      expect(text).not.toMatch(forbidden);
    }
  });

  it("never calls the counterfactual optimal", () => {
    for (const beat of RECOVERY_BEATS) {
      const copy = recoveryCopyFor(beat, { budget: 1 });
      const text = [copy.title, ...copy.paragraphs, copy.caveat ?? ""].join(" ");
      expect(text).not.toMatch(/optimal|optimis|optimiz|best possible/i);
    }
  });

  it("badges the counterfactual beats modelled and the measured ones observed", () => {
    expect(recoveryCopyFor(3).kind).toBe("observed");
    expect(recoveryCopyFor(7).kind).toBe("calculated");
    expect(recoveryCopyFor(9).kind).toBe("modelled");
    expect(recoveryCopyFor(10).kind).toBe("modelled");
    expect(recoveryCopyFor(2).kind).toBe("illustrative");
  });

  it("keeps the in-beat caveats the Spec requires in their own beats", () => {
    expect(recoveryCopyFor(7).caveat).toMatch(/percentile/i);
    expect(recoveryCopyFor(9).caveat).toMatch(/five strengths/i);
  });

  it("prints only figures the pack froze", () => {
    const shares = FOCUS_LINE.counterfactual.variants.map((v) =>
      `${(v.curve[0].share * 100).toFixed(1)}%`,
    );
    for (const budget of [0, 0.13, 0.25, 0.4, 0.62, 0.8, 1]) {
      expect(shares).toContain(recoveryCopyFor(9, { budget }).figure);
    }
  });

  it("reads the survival figures out of the pack rather than the prose", () => {
    const carry = `${(pack.survival.all[0].median * 100).toFixed(0)}%`;
    expect(recoveryCopyFor(3).figure).toBe(carry);
    expect(recoveryCopyFor(3).paragraphs.join(" ")).toContain(carry);
  });

  it("picks the best frozen variant, not the strongest one", () => {
    // Only the focus line improves at every strength. On the others the rule is
    // non-monotone, so the last variant is not the best one.
    const nonMonotone = pack.lines.filter((line) => {
      const shares = line.counterfactual.variants.map((v) => v.curve[0].share);
      return shares.some((share, i) => i > 0 && share > shares[i - 1] + 1e-9);
    });
    expect(nonMonotone.length).toBeGreaterThan(0);

    for (const line of pack.lines) {
      const best = bestVariant(line);
      const last = line.counterfactual.variants[line.counterfactual.variants.length - 1];
      expect(best.curve[0].share).toBeLessThanOrEqual(last.curve[0].share + 1e-9);
      expect(best.strength).toBeGreaterThan(0);
      expect(best.curve[0].share).toBeLessThan(currentVariant(line).curve[0].share);
    }
  });

  it("states the commuter floor against where long-distance already sits", () => {
    expect(COMMUTER_FLOOR.low).toBeGreaterThan(0.74);
    expect(COMMUTER_FLOOR.high).toBeLessThan(0.82);
    expect(LONG_DISTANCE_TODAY.low).toBeGreaterThan(0.74);
    expect(LONG_DISTANCE_TODAY.high).toBeLessThan(0.78);
    // Three of four commuter lines cannot reach the worst long-distance line
    // today; the fourth just does, and the close names it rather than burying it.
    expect(COMMUTER_LINES_SHORT_OF_LONG_DISTANCE).toBe(3);
  });

  it("does not rank the selectable lines", () => {
    const copy = recoveryCopyFor(8);
    const text = [copy.title, ...copy.paragraphs].join(" ");
    expect(text).not.toMatch(/\b(worst|best) line\b/i);
    expect(text).toMatch(/do not reliably separate/i);
  });
});
