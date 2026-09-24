import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  parseStoryManifest,
  type StoryManifest,
} from "@/stories/schemas/manifest";
import { getTemplate } from "@/stories/templates/registry";

const MANIFESTS_DIR = path.join(process.cwd(), "src", "stories", "manifests");

export function getManifestsDir() {
  return MANIFESTS_DIR;
}

export function listManifestSlugs(): string[] {
  return readdirSync(MANIFESTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

export function loadStoryManifest(slug: string): StoryManifest {
  const filePath = path.join(MANIFESTS_DIR, `${slug}.json`);
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  const manifest = parseStoryManifest(raw);

  if (manifest.meta.slug !== slug) {
    throw new Error(
      `Manifest slug mismatch: file "${slug}.json" has meta.slug "${manifest.meta.slug}"`,
    );
  }

  // Ensures unknown template IDs fail at the registry boundary too.
  getTemplate(manifest.meta.templateId);

  return manifest;
}

export function loadAllStoryManifests(): StoryManifest[] {
  return listManifestSlugs().map((slug) => loadStoryManifest(slug));
}
