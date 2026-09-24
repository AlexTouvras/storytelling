import { describe, expect, it } from "vitest";
import { buildField, FIELD_CUTOFF, pickFeatured } from "@/lib/sim/book-field";
import { STORY_SIM } from "@/lib/sim/rate-buffer-book";

describe("book field", () => {
  const field = buildField();

  it("matches the frozen base-case shares", () => {
    expect(field.summary.before.thinBalanceShare).toBe(
      STORY_SIM.base.before.thinBalanceShare,
    );
    expect(field.summary.after.thinBalanceShare).toBe(
      STORY_SIM.base.after.thinBalanceShare,
    );
    expect(field.summary.actionableSlice.floatingThinBalanceShare).toBe(
      STORY_SIM.base.actionableSlice.floatingThinBalanceShare,
    );
    expect(field.points).toHaveLength(2000);
  });

  it("features a floating loan that crosses the thin line", () => {
    const f = field.featured;
    expect(f.floating).toBe(true);
    expect(f.shareBefore).toBeGreaterThanOrEqual(FIELD_CUTOFF);
    expect(f.shareAfter).toBeLessThan(FIELD_CUTOFF);
    expect(f.bufferAfter).toBeLessThan(f.bufferBefore);
    expect(pickFeatured(field.points).id).toBe(f.id);
  });

  it("keeps fixed-rate payments unchanged", () => {
    const fixed = field.points.find((p) => !p.floating);
    expect(fixed).toBeDefined();
    expect(fixed?.paymentAfter).toBe(fixed?.paymentBefore);
    expect(fixed?.shareAfter).toBe(fixed?.shareBefore);
  });
});
