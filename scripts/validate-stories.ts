#!/usr/bin/env tsx
/**
 * Validate all story manifests under src/stories/manifests/.
 * Exit 0 on success, non-zero on failure.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  StoryManifestSchema,
  VisualIdSchema,
} from "../src/stories/schemas/manifest";
import { isKnownTemplateId } from "../src/stories/templates/registry";
import {
  VISUAL_ALLOWLIST,
  isAllowlistedVisualId,
  isAllowlistedVisualState,
} from "../src/stories/schemas/visualAllowlist";
import { PRESSURE_STAGES } from "../src/components/storytelling/grammar/stageConfig";
import {
  ATMOSPHERE_MOTIF_IDS,
  isAtmosphereMotifId,
} from "../src/stories/schemas/atmosphereAllowlist";
import { ATMOSPHERE_REGISTRY } from "../src/components/storytelling/atmosphere/registry";
import type { StoryManifest } from "../src/stories/schemas/manifest";
import { termOrderProblems } from "../src/lib/reader/terms";
import { schemaProblems } from "../src/lib/reader/method";
import { NARRATION } from "../src/stories/reader/narration";
import { METHOD_REGISTRY } from "../src/stories/method/registry";

const MANIFESTS_DIR = path.join(process.cwd(), "src", "stories", "manifests");

/** Registry keys must stay in sync with Zod VisualIdSchema + VISUAL_ALLOWLIST. */
function assertVisualParity(): string[] {
  const errors: string[] = [];
  const schemaIds = new Set<string>(VisualIdSchema.options);
  const allowIds = new Set(Object.keys(VISUAL_ALLOWLIST));

  for (const id of schemaIds) {
    if (!allowIds.has(id)) {
      errors.push(`VisualIdSchema has "${id}" missing from VISUAL_ALLOWLIST`);
    }
  }
  for (const id of allowIds) {
    if (!schemaIds.has(id)) {
      errors.push(`VISUAL_ALLOWLIST has "${id}" missing from VisualIdSchema`);
    }
  }

  for (const state of VISUAL_ALLOWLIST["cashflow-pressure"]) {
    if (!PRESSURE_STAGES[state]) {
      errors.push(
        `cashflow-pressure state "${state}" missing PRESSURE_STAGES entry`,
      );
    }
  }

  for (const id of ATMOSPHERE_MOTIF_IDS) {
    if (!(id in ATMOSPHERE_REGISTRY)) {
      errors.push(`atmosphere motif "${id}" missing from ATMOSPHERE_REGISTRY`);
    }
  }
  for (const id of Object.keys(ATMOSPHERE_REGISTRY)) {
    if (!isAtmosphereMotifId(id)) {
      errors.push(`ATMOSPHERE_REGISTRY has unknown motif "${id}"`);
    }
  }

  return errors;
}

/** The reader kit: narration and method page registered, terms taught in order, every pack block documented. */
function readerKitProblems(manifest: StoryManifest): string[] {
  const slug = manifest.meta.slug;
  const problems: string[] = [];
  if (manifest.reader) {
    const narration = NARRATION[slug];
    if (!narration) {
      problems.push(`no narration in src/stories/reader/narration.ts`);
    } else {
      const beats = narration();
      if (beats.length !== manifest.reader.beats.length) {
        problems.push(`narration has ${beats.length} beats; reader.beats names ${manifest.reader.beats.length}`);
      }
      problems.push(...termOrderProblems(manifest.reader.terms, beats));
    }
  }
  if (manifest.method) {
    const method = METHOD_REGISTRY[slug];
    if (!method) {
      problems.push(`no method page in src/stories/method/registry.ts`);
    } else {
      problems.push(...schemaProblems(method.pack, method.schema));
    }
    for (const file of [manifest.method.pack, manifest.method.spec]) {
      try {
        readFileSync(path.join(process.cwd(), file));
      } catch {
        problems.push(`${file} does not exist`);
      }
    }
  }
  return problems;
}

function main() {
  const parityErrors = assertVisualParity();
  if (parityErrors.length > 0) {
    console.error("✗ Visual allowlist / schema / grammar parity failed:");
    for (const e of parityErrors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(
    "✓ visual allowlist ↔ VisualIdSchema ↔ PRESSURE_STAGES ↔ atmosphere motifs parity",
  );

  let files: string[];
  try {
    files = readdirSync(MANIFESTS_DIR).filter((f) => f.endsWith(".json"));
  } catch (err) {
    console.error(`Cannot read manifests directory: ${MANIFESTS_DIR}`);
    console.error(err);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error("No story manifests found.");
    process.exit(1);
  }

  let failed = 0;

  for (const file of files) {
    const filePath = path.join(MANIFESTS_DIR, file);
    const slug = file.replace(/\.json$/, "");
    try {
      const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
      const result = StoryManifestSchema.safeParse(raw);
      if (!result.success) {
        console.error(`✗ ${file}`);
        for (const issue of result.error.issues) {
          console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
        }
        failed += 1;
        continue;
      }

      const manifest = result.data;
      if (!isKnownTemplateId(manifest.meta.templateId)) {
        console.error(
          `✗ ${file}: unknown templateId "${manifest.meta.templateId}"`,
        );
        failed += 1;
        continue;
      }

      if (manifest.meta.slug !== slug) {
        console.error(
          `✗ ${file}: meta.slug "${manifest.meta.slug}" does not match filename`,
        );
        failed += 1;
        continue;
      }

      const unknownVisuals = new Set<string>();
      const badStates = new Set<string>();
      const sectionIds = new Set<string>();
      let duplicateSection = false;
      for (const section of manifest.sections) {
        if (sectionIds.has(section.id)) {
          console.error(`✗ ${file}: duplicate section id "${section.id}"`);
          duplicateSection = true;
        }
        sectionIds.add(section.id);
        for (const scene of section.scenes) {
          if (!isAllowlistedVisualId(scene.visualId)) {
            unknownVisuals.add(scene.visualId);
          } else if (
            !isAllowlistedVisualState(scene.visualId, scene.visualState)
          ) {
            badStates.add(`${scene.visualId}:${scene.visualState}`);
          }
        }
      }
      if (duplicateSection) {
        failed += 1;
        continue;
      }
      if (unknownVisuals.size > 0) {
        console.error(
          `✗ ${file}: visualId not in allowlist: ${[...unknownVisuals].join(", ")} (known: ${Object.keys(VISUAL_ALLOWLIST).join(", ")})`,
        );
        failed += 1;
        continue;
      }
      if (badStates.size > 0) {
        console.error(
          `✗ ${file}: invalid visualState for visualId: ${[...badStates].join(", ")}`,
        );
        failed += 1;
        continue;
      }

      const kitProblems = readerKitProblems(manifest);
      if (kitProblems.length > 0) {
        console.error(`✗ ${file}: reader kit`);
        for (const problem of kitProblems) console.error(`  - ${problem}`);
        failed += 1;
        continue;
      }

      console.log(
        `✓ ${file} (${manifest.meta.templateId}, ${manifest.sections.length} sections${manifest.meta.role ? `, ${manifest.meta.role}` : ""}${manifest.reader ? `, ${manifest.reader.terms.length} terms` : ""}${manifest.method ? ", method page" : ""})`,
      );
    } catch (err) {
      console.error(`✗ ${file}: ${err instanceof Error ? err.message : err}`);
      failed += 1;
    }
  }

  if (failed > 0) {
    console.error(`\nValidation failed: ${failed}/${files.length} invalid`);
    process.exit(1);
  }

  console.log(`\nAll ${files.length} story manifest(s) valid.`);
}

main();
