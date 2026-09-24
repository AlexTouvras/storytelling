import { describe, expect, it } from "vitest";
import {
  VISUAL_ALLOWLIST,
  isAllowlistedVisualId,
  isAllowlistedVisualState,
} from "@/stories/schemas/visualAllowlist";
import { StoryManifestSchema } from "@/stories/schemas/manifest";
import { stageFor, PRESSURE_STAGES } from "@/components/storytelling/grammar/stageConfig";
import { loadStoryManifest, listManifestSlugs } from "@/lib/loadStory";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("visual allowlist + grammar stages", () => {
  it("covers every cashflow-pressure act used by the reference story", () => {
    const states = VISUAL_ALLOWLIST["cashflow-pressure"];
    for (const state of states) {
      expect(PRESSURE_STAGES[state], `missing stage for ${state}`).toBeDefined();
      expect(stageFor(state).field).toBeTruthy();
    }
  });

  it("rejects unknown visual ids and states", () => {
    expect(isAllowlistedVisualId("nope")).toBe(false);
    expect(isAllowlistedVisualState("cashflow-pressure", "nope")).toBe(false);
    expect(isAllowlistedVisualState("cashflow-pressure", "dial")).toBe(true);
  });
});

describe("loadStoryManifest", () => {
  it("loads every on-disk manifest", () => {
    const slugs = listManifestSlugs();
    expect(slugs.length).toBeGreaterThanOrEqual(2);
    for (const slug of slugs) {
      const m = loadStoryManifest(slug);
      expect(m.meta.slug).toBe(slug);
      expect(m.sections.length).toBeGreaterThan(0);
    }
  });

  it("rejects invalid manifests", () => {
    const bad = StoryManifestSchema.safeParse({ meta: { slug: "x" } });
    expect(bad.success).toBe(false);
  });

  it("parses the frozen reference manifest", () => {
    const raw = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "src/stories/manifests/when-rates-rise.json"),
        "utf8",
      ),
    );
    const parsed = StoryManifestSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.meta.role).toBe("reference");
      expect(parsed.data.sections).toHaveLength(7);
    }
  });
});
