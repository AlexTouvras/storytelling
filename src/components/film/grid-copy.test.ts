import { describe, expect, it } from "vitest";
import manifest from "@/stories/manifests/how-much-fast-reserve.json";
import {
  GRID_BEATS,
  GRID_FEATURED,
  GRID_FILM,
  gridCopyFor,
  gridNarration,
  gridValidation,
} from "@/components/film/grid-copy";

const all = () => gridNarration().flatMap((b) => [b.kicker, b.title, ...b.paragraphs, b.caveat ?? ""]);

describe("grid narration", () => {
  it("has one beat per name, and the names match the manifest", () => {
    expect(gridNarration()).toHaveLength(GRID_BEATS.length);
    expect(manifest.reader.beats).toEqual([...GRID_BEATS]);
  });

  it("reads its figures from the pack", () => {
    expect(GRID_FILM.trips).toBe(19);
    expect(GRID_FILM.lightHours).toBe(873);
    expect(GRID_FILM.summer2026).toBe(584);
    expect(GRID_FILM.noReserveAbove).toBe(200);
    expect(GRID_FILM.publishedLast).toEqual({ year: "2024", hours: 339 });
    expect(gridValidation().medianDepthRatio).toBeGreaterThan(1.3);
    expect(gridCopyFor(1).paragraphs[0]).toContain(`${GRID_FEATURED.nadir.toFixed(2)} Hz`);
  });

  it("keeps the manifest's figure labels in step with the pack", () => {
    const labels = manifest.dataRefs.map((r) => r.label).join(" | ");
    expect(labels).toContain(`${GRID_FEATURED.nadir} Hz`);
    expect(labels).toContain(`${GRID_FEATURED.nadir_s} s`);
    expect(labels).toContain(`${GRID_FILM.trips} trips`);
    expect(labels).toContain(`${GRID_FILM.lightHours} hours`);
    expect(labels).toContain(`${GRID_FILM.summer2026} of them`);
    expect(labels).toContain(`${Math.round(GRID_FILM.reserveShare120 * 100)}% of hours`);
    expect(labels).toContain(`none above ${GRID_FILM.noReserveAbove} GWs`);
  });

  it("never quotes the model as a figure, and never calls the grid unsafe", () => {
    const text = all().join(" ");
    expect(text).not.toMatch(/48\.7|49\.05|49\.13/);
    expect(text).not.toMatch(/unsafe|near-miss|blackout/i);
  });

  it("puts at most two figures in a sentence", () => {
    for (const block of gridNarration().flatMap((b) => b.paragraphs)) {
      for (const sentence of block.split(/(?<=[.!?])\s+/)) {
        const figures = (sentence.match(/\d[\d,.]*(?:–\d[\d,.]*)?/g) ?? []).filter((f) => !/^(19|20)\d\d$/.test(f));
        expect(figures.length, sentence).toBeLessThanOrEqual(2);
      }
    }
  });
});
