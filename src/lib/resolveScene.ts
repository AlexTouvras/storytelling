import type { StoryManifest } from "@/stories/schemas/manifest";

/**
 * Resolve the active section's primary scene (section-visible preferred).
 * Pure — safe for validate/unit tests without mounting Scrollama.
 */
export function resolveScene(manifest: StoryManifest, sectionId: string) {
  const section =
    manifest.sections.find((s) => s.id === sectionId) ?? manifest.sections[0];
  const scene =
    section.scenes.find((s) => s.trigger === "section-visible") ??
    section.scenes[0];
  return scene;
}
