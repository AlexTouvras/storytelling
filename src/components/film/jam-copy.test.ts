import { describe, expect, it } from "vitest";
import pack from "../../../data/figures/where-should-the-speed-be-held.v1.json";
import { jamDecision, jamNarration } from "@/components/film/jam-copy";
import { subtitleCues } from "@/components/film/subtitles";

const text = () => jamNarration().flatMap((beat) => [beat.title, ...beat.paragraphs]).join(" ");

describe("jam narration", () => {
  it("quotes the pack, rounded, and does not call the variant optimal", () => {
    const beats = jamNarration();
    expect(beats).toHaveLength(5);
    const spoken = text();
    expect(spoken).toContain(String(Math.round(pack.featured.walk.walk_mph)));
    expect(spoken).toContain(String(Math.round(pack.featured.frames[0].downstream_mph ?? 0)));
    expect(spoken.toLowerCase()).not.toContain("optimal");
    expect(spoken.toLowerCase()).not.toContain("variable speed limit");
  });

  it("holds the walk speed until the pocket has been seen in both places", () => {
    const cues = subtitleCues(jamNarration()[2].paragraphs);
    expect(cues).toHaveLength(3);
    expect(cues[0]).toMatch(/\bpocket\b/i);
    expect(cues[0]).not.toMatch(/\d/);
    expect(cues[1]).not.toMatch(/\d/);
    expect(cues[2]).toContain(`${pack.featured.walk.walk_ft} feet`);
    expect(cues[2]).toContain(`${Math.round(pack.featured.walk.walk_mph)} mph`);
    expect(cues[2]).toContain(String(Math.round(pack.featured.frames[0].downstream_mph ?? 0)));
    expect(cues[2]).toMatch(/against the traffic/);
    const opening = subtitleCues(jamNarration()[0].paragraphs);
    expect(opening).toHaveLength(1);
    expect(opening[0]).not.toMatch(/\d/);
  });

  it("puts the modelled sentence on the decision, labelled as the model's depth", () => {
    const decision = jamDecision();
    expect(decision.model).toBeTruthy();
    expect(decision.model?.toLowerCase()).not.toContain("optimal");
    expect(decision.model).toContain("not a measurement");
  });
});
