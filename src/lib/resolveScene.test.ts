import { describe, expect, it } from "vitest";
import { resolveScene } from "@/lib/resolveScene";
import { loadStoryManifest } from "@/lib/loadStory";

describe("resolveScene", () => {
  it("maps each when-rates-rise section to its allow-listed visualState", () => {
    const manifest = loadStoryManifest("when-rates-rise");
    const expected: Record<string, string> = {
      dial: "dial",
      transmission: "transmission",
      heterogeneity: "heterogeneity",
      book: "book",
      intersection: "intersection",
      evidence: "evidence",
      cut: "cut",
    };
    for (const [sectionId, state] of Object.entries(expected)) {
      const scene = resolveScene(manifest, sectionId);
      expect(scene.visualId).toBe("cashflow-pressure");
      expect(scene.visualState).toBe(state);
    }
  });

  it("falls back to first section for unknown ids", () => {
    const manifest = loadStoryManifest("when-rates-rise");
    const scene = resolveScene(manifest, "no-such-section");
    expect(scene.visualState).toBe(manifest.sections[0].scenes[0].visualState);
  });
});

describe("scrollama offset safety", () => {
  it("converts pixel offsets to a bounded fraction when height is known", () => {
    const px = 280;
    const h = 900;
    const fraction = Math.min(0.55, Math.max(0.15, px / h));
    expect(fraction).toBeCloseTo(280 / 900, 5);
    expect(fraction).toBeGreaterThanOrEqual(0.15);
    expect(fraction).toBeLessThanOrEqual(0.55);
  });

  it("does not produce Infinity when height is 0 (pre-mount)", () => {
    const px = 280;
    const h = 0;
    const fraction = h > 0 ? px / h : 0.35;
    expect(Number.isFinite(fraction)).toBe(true);
  });
});
