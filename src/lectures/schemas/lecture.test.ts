import { describe, expect, it } from "vitest";
import card from "../../../data/field-cards/agentic-ai.v2026.36.json";
import manifest from "../manifests/agentic-ai.json";
import {
  LectureManifestSchema,
  danglingCardRefs,
  resolveCardRef,
} from "@/lectures/schemas/lecture";

describe("resolveCardRef", () => {
  it("walks keys and indexes", () => {
    expect(resolveCardRef(card, "killSwitch")).toContain("Max steps");
    expect(resolveCardRef(card, "layers[2].code")).toBe("AGENT");
    expect(resolveCardRef(card, "decisions[7].use")).toBe("Human gate");
    expect(resolveCardRef(card, "ladder")).toHaveLength(6);
  });

  it("returns undefined for a row that is not there", () => {
    expect(resolveCardRef(card, "layers[9]")).toBeUndefined();
    expect(resolveCardRef(card, "noSuchThing")).toBeUndefined();
    expect(resolveCardRef(card, "killSwitch.deeper")).toBeUndefined();
  });
});

describe("the lecture cannot outrun its card", () => {
  const parsed = LectureManifestSchema.parse(manifest);

  it("cites only rows the frozen card publishes", () => {
    expect(danglingCardRefs(parsed, card)).toEqual([]);
  });

  it("catches a citation the card has dropped", () => {
    const thinned = {
      ...card,
      antiPatterns: card.antiPatterns.slice(0, 2),
    };
    // Beat 8 teaches the last anti-pattern; dropping it has to be caught.
    expect(danglingCardRefs(parsed, thinned).length).toBeGreaterThan(0);
  });

  it("gives every beat presenter notes as well as reader copy", () => {
    for (const beat of parsed.beats) {
      expect(beat.notes.length).toBeGreaterThan(0);
      expect(beat.paragraphs.length).toBeGreaterThan(0);
    }
  });

  it("gives every slide the furniture a deck exhibit needs", () => {
    for (const beat of parsed.beats) {
      expect(beat.exhibit.length).toBeGreaterThan(8);
      expect(beat.takeaway.length).toBeGreaterThan(8);
      // A so-what is a sentence, not a label.
      expect(beat.takeaway).toMatch(/[.?!”]$/);
    }
  });

  it("catches a list the card does not publish as a list", () => {
    const broken = {
      ...parsed,
      beats: parsed.beats.map((beat, i) =>
        i === 0 ? { ...beat, listRef: "killSwitch" } : beat,
      ),
    };
    expect(danglingCardRefs(broken, card)).toEqual([
      "beat 0: killSwitch is not a list of strings on the card",
    ]);
  });

  it("rejects a cue that points at a beat with no copy", () => {
    const broken = {
      ...manifest,
      cues: [...manifest.cues, { ...manifest.cues[0], at: 0.95, beat: 42 }],
    };
    expect(LectureManifestSchema.safeParse(broken).success).toBe(false);
  });
});
