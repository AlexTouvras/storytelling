import { describe, expect, it } from "vitest";
import { filmForms, type Term } from "@/lib/reader/terms";
import { NARRATION } from "@/stories/reader/narration";
import whenRates from "@/stories/manifests/when-rates-rise.json";
import cutoff from "@/stories/manifests/where-should-the-cutoff-sit.json";
import grid from "@/stories/manifests/how-much-fast-reserve.json";
import { RATE_BEAT_STARTS } from "@/components/film/frame";
import { CUTOFF_BEAT_STARTS } from "@/components/film/cutoff-frame";
import { GRID_BEAT_STARTS } from "@/lib/director/grid-film";
import { beatLocal, cueIndex, firstCueAt, picturePlot, subtitleCues, SUBTITLE_BAND } from "@/components/film/subtitles";

describe("subtitle cues", () => {
  it("keeps each cue to two lines and does not drop words", () => {
    const paragraphs = [
      "One short sentence. A second that is also short.",
      "This sentence is long enough that it has to break across more than two subtitle lines, and it should come back as more than one cue without losing a word.",
    ];
    const cues = subtitleCues(paragraphs);
    expect(cues[0]).toBe("One short sentence.");
    expect(cues[1]).toBe("A second that is also short.");
    for (const cue of cues) expect(cue.length).toBeLessThanOrEqual(36 * 2);
    expect(cues.join(" ").replace(/\s+/g, " ")).toBe(paragraphs.join(" ").replace(/\s+/g, " "));
  });

  it("breaks a long sentence on a comma instead of mid-phrase", () => {
    const cues = subtitleCues([
      "A minute later it is at the back of the stretch, near 11 mph, and the road ahead is still near 40 mph.",
    ]);
    expect(cues[0]).toBe("A minute later it is at the back of the stretch, near 11 mph,");
    expect(cues.at(-1)).toMatch(/^and the road ahead/);
    for (const cue of cues) expect(cue.length).toBeLessThanOrEqual(36 * 2);
  });

  it("steps through the cues of a beat and holds the last one at the end", () => {
    const starts = [0, 0.2, 0.5];
    expect(beatLocal(0.2, starts)).toBe(0);
    expect(beatLocal(0.35, starts)).toBeCloseTo(0.5);
    expect(cueIndex(0, 4)).toBe(0);
    expect(cueIndex(0.5, 4)).toBe(2);
    expect(cueIndex(1, 4)).toBe(3);
    expect(cueIndex(0.2, 1)).toBe(0);
  });

  it("gives the plot the frame above the subtitle", () => {
    const plot = picturePlot(800);
    expect(plot.top).toBeLessThan(800 * 0.1);
    expect(plot.top + plot.height).toBe(800 - SUBTITLE_BAND);
    expect(plot.height).toBeGreaterThan(800 * 0.68);
  });
});

/**
 * Reader-kit scrolls that must land on the cue teaching the term. The button
 * is only drawn while that cue is up.
 */
const TAUGHT: { slug: string; at: number; beat: number; term: string; starts: readonly number[] }[] = [
  { slug: "when-rates-rise", at: 0.2, beat: 1, term: "buffer", starts: RATE_BEAT_STARTS },
  { slug: "where-should-the-cutoff-sit", at: 0.22, beat: 2, term: "pd", starts: CUTOFF_BEAT_STARTS },
  { slug: "how-much-fast-reserve", at: 0.195, beat: 1, term: "trip", starts: GRID_BEAT_STARTS },
];

const TERMS: Record<string, Term[]> = {
  "when-rates-rise": whenRates.reader.terms,
  "where-should-the-cutoff-sit": cutoff.reader.terms,
  "how-much-fast-reserve": grid.reader.terms,
};

describe("the opening subtitle is where a beat's first term is taught", () => {
  it("lands the grid's trip line at the start of its beat", () => {
    const beats = NARRATION["how-much-fast-reserve"]();
    const cues = subtitleCues(beats[1].paragraphs);
    const at = firstCueAt(GRID_BEAT_STARTS[1], GRID_BEAT_STARTS[2], cues.length);
    const cue = cues[cueIndex(beatLocal(at, GRID_BEAT_STARTS), cues.length)];
    expect(cue).toMatch(/\btrip\b/i);
  });
});

describe("subtitle cues still teach the term the reader-kit opens", () => {
  for (const row of TAUGHT) {
    it(`${row.slug} at ${row.at} shows ${row.term}`, () => {
      const beats = NARRATION[row.slug]();
      const term = TERMS[row.slug].find((t) => t.id === row.term);
      expect(term).toBeTruthy();
      const cues = subtitleCues(beats[row.beat].paragraphs);
      const pattern = new RegExp(filmForms(term!).map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i");
      const cue = cues[cueIndex(beatLocal(row.at, row.starts), cues.length)];
      expect(cue, cues.join(" | ")).toMatch(pattern);
    });
  }
});
