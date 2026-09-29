import { describe, expect, it } from "vitest";
import pack from "../../../data/figures/where-should-the-speed-be-held.v1.json";
import { jamDecision, jamNarration } from "@/components/film/jam-copy";

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

  it("puts the modelled sentence on the decision, labelled as the model's depth", () => {
    const decision = jamDecision();
    expect(decision.model).toBeTruthy();
    expect(decision.model?.toLowerCase()).not.toContain("optimal");
    expect(decision.model).toContain("not a measurement");
  });
});
