/**
 * Validate before render, on both halves of a lecture.
 *
 * The manifest is parsed, the frozen card is parsed, and every `cardRefs` path
 * is resolved against that card. A lecture that quotes a row the card no longer
 * publishes fails here rather than teaching it — that is the whole mechanism
 * keeping the briefing and the reference sheet from drifting apart.
 *
 * Failures throw outside production and report in it, matching the cue-table
 * checker: a broken manifest is a bug the suite should have caught, not a reason
 * to take a live page down.
 */

import agenticAiCard from "../../data/field-cards/agentic-ai.v2026.36.json";
import agenticAiManifest from "./manifests/agentic-ai.json";
import { FieldCardSchema, type FieldCard } from "./schemas/fieldCard";
import {
  LectureManifestSchema,
  danglingCardRefs,
  type LectureManifest,
} from "./schemas/lecture";

export type Lecture = {
  manifest: LectureManifest;
  card: FieldCard;
};

const CARDS: Record<string, unknown> = {
  "agentic-ai": agenticAiCard,
};

const MANIFESTS: Record<string, unknown> = {
  "agentic-ai": agenticAiManifest,
};

export const LECTURE_SLUGS = Object.keys(MANIFESTS);

function fail(message: string): void {
  if (process.env.NODE_ENV === "production") console.error(message);
  else throw new Error(message);
}

export function loadLecture(slug: string): Lecture | null {
  const rawManifest = MANIFESTS[slug];
  if (!rawManifest) return null;

  const parsedManifest = LectureManifestSchema.safeParse(rawManifest);
  if (!parsedManifest.success) {
    fail(`lecture ${slug}: ${parsedManifest.error.message}`);
    return null;
  }
  const manifest = parsedManifest.data;

  const parsedCard = FieldCardSchema.safeParse(CARDS[manifest.card.id]);
  if (!parsedCard.success) {
    fail(`field card ${manifest.card.id}: ${parsedCard.error.message}`);
    return null;
  }
  const card = parsedCard.data;

  const dangling = danglingCardRefs(manifest, card);
  if (dangling.length > 0) {
    fail(
      `lecture ${slug} cites rows the card does not have: ${dangling.join("; ")}`,
    );
    return null;
  }

  return { manifest, card };
}
