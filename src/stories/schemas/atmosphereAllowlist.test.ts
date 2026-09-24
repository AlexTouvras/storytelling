import { describe, expect, it } from "vitest";
import {
  ATMOSPHERE_MOTIF_IDS,
  isAtmosphereMotifId,
} from "@/stories/schemas/atmosphereAllowlist";
import { ATMOSPHERE_REGISTRY } from "@/components/storytelling/atmosphere/registry";

describe("atmosphere motifs", () => {
  it("registry covers every allow-listed motifId", () => {
    for (const id of ATMOSPHERE_MOTIF_IDS) {
      expect(id in ATMOSPHERE_REGISTRY).toBe(true);
      expect(isAtmosphereMotifId(id)).toBe(true);
    }
  });

  it("rejects unknown motif ids", () => {
    expect(isAtmosphereMotifId("neon-soup")).toBe(false);
  });
});
