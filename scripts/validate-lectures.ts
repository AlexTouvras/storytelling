#!/usr/bin/env tsx
/**
 * Validate lecture manifests and the frozen field cards they teach.
 *
 * Three checks, in the order they fail most often:
 *
 *   1. The manifest parses (cue table shape, beat copy, presenter notes).
 *   2. The cue table is well formed, and its held spans are reported — a lecture
 *      holds far longer than a decision film does, because a beat is a paragraph
 *      someone is reading or a point someone is making.
 *   3. Every `cardRefs` path resolves against the frozen card. This is the check
 *      worth having: it is what stops the briefing and the reference sheet from
 *      drifting apart when the card's weekly pass rewrites a row.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  AGENTIC_STACK_RENDERED,
  LectureManifestSchema,
  danglingCardRefs,
} from "../src/lectures/schemas/lecture";
import { FieldCardSchema } from "../src/lectures/schemas/fieldCard";
import { cueTableHolds, cueTableProblems } from "../src/components/film/cue-table";

const MANIFESTS_DIR = path.join(process.cwd(), "src", "lectures", "manifests");

function main() {
  let files: string[];
  try {
    files = readdirSync(MANIFESTS_DIR).filter((f) => f.endsWith(".json"));
  } catch (err) {
    console.error(`Cannot read lecture manifests: ${MANIFESTS_DIR}`);
    console.error(err);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error("No lecture manifests found.");
    process.exit(1);
  }

  let failed = 0;

  for (const file of files) {
    const slug = file.replace(/\.json$/, "");
    try {
      const raw = JSON.parse(
        readFileSync(path.join(MANIFESTS_DIR, file), "utf8"),
      ) as unknown;
      const parsed = LectureManifestSchema.safeParse(raw);
      if (!parsed.success) {
        console.error(`✗ ${file}`);
        for (const issue of parsed.error.issues) {
          console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
        }
        failed += 1;
        continue;
      }
      const manifest = parsed.data;

      if (manifest.slug !== slug) {
        console.error(`✗ ${file}: slug "${manifest.slug}" does not match filename`);
        failed += 1;
        continue;
      }

      const problems = cueTableProblems(manifest.cues, {
        rendered: AGENTIC_STACK_RENDERED,
      });
      if (problems.length > 0) {
        console.error(`✗ ${file}: cue table: ${problems.join("; ")}`);
        failed += 1;
        continue;
      }

      const cardRaw = JSON.parse(
        readFileSync(path.join(process.cwd(), manifest.card.file), "utf8"),
      ) as unknown;
      const card = FieldCardSchema.safeParse(cardRaw);
      if (!card.success) {
        console.error(`✗ ${manifest.card.file}`);
        for (const issue of card.error.issues) {
          console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
        }
        failed += 1;
        continue;
      }

      const dangling = danglingCardRefs(manifest, card.data);
      if (dangling.length > 0) {
        console.error(`✗ ${file}: card rows cited but missing:`);
        for (const ref of dangling) console.error(`  - ${ref}`);
        failed += 1;
        continue;
      }

      const holds = cueTableHolds(manifest.cues, {
        rendered: AGENTIC_STACK_RENDERED,
      });
      const held = holds.reduce((sum, hold) => sum + (hold.to - hold.from), 0);
      const refs = manifest.beats.reduce((n, b) => n + b.cardRefs.length, 0);
      console.log(
        `✓ ${file} (${manifest.beats.length} beats, ${refs} card refs, ${holds.length} held span(s) = ${Math.round(held * 100)}% of the run)`,
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

  console.log(`\nAll ${files.length} lecture manifest(s) valid.`);
}

main();
