import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadAllStoryManifests } from "@/lib/loadStory";
import { termOrderProblems } from "@/lib/reader/terms";
import { schemaProblems } from "@/lib/reader/method";
import { NARRATION } from "@/stories/reader/narration";
import { METHOD_REGISTRY } from "@/stories/method/registry";
import { safeParseStoryManifest } from "@/stories/schemas/manifest";

const manifests = loadAllStoryManifests();

describe("reader kit coverage", () => {
  it.each(manifests.filter((m) => m.meta.role === "reference").map((m) => [m.meta.slug, m] as const))(
    "%s declares a reader and a method page",
    (_slug, manifest) => {
      expect(manifest.reader).toBeDefined();
      expect(manifest.method).toBeDefined();
    },
  );

  it("rejects a reference manifest without them", () => {
    const [reference] = manifests.filter((m) => m.meta.role === "reference");
    const { reader: _reader, method: _method, ...bare } = reference;
    const result = safeParseStoryManifest(bare);
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path.join(".")) ?? [];
    expect(paths).toEqual(expect.arrayContaining(["reader", "method"]));
  });
});

describe.each(manifests.filter((m) => m.reader).map((m) => [m.meta.slug, m] as const))("%s: terms", (slug, manifest) => {
  const reader = manifest.reader!;

  it("has its narration registered, one entry per beat", () => {
    expect(NARRATION[slug], `add ${slug} to src/stories/reader/narration.ts`).toBeDefined();
    expect(NARRATION[slug]()).toHaveLength(reader.beats.length);
  });

  it("teaches every term where it is first used, and never before", () => {
    expect(termOrderProblems(reader.terms, NARRATION[slug]())).toEqual([]);
  });
});

describe.each(manifests.filter((m) => m.method).map((m) => [m.meta.slug, m] as const))(
  "%s: method page",
  (slug, manifest) => {
    it("is registered, and its pack is the file the manifest names", () => {
      const method = METHOD_REGISTRY[slug];
      expect(method, `add ${slug} to src/stories/method/registry.ts`).toBeDefined();
      const onDisk = JSON.parse(readFileSync(path.join(process.cwd(), manifest.method!.pack), "utf8"));
      expect(Object.keys(method.pack)).toEqual(Object.keys(onDisk));
      expect(method.pack.id ?? null).toEqual(onDisk.id ?? null);
    });

    it("documents every block of its pack", () => {
      expect(schemaProblems(METHOD_REGISTRY[slug].pack, METHOD_REGISTRY[slug].schema)).toEqual([]);
    });

    it("names a Decision Spec that exists", () => {
      expect(() => readFileSync(path.join(process.cwd(), manifest.method!.spec))).not.toThrow();
    });
  },
);
