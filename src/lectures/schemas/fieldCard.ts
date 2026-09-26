/**
 * Frozen field cards.
 *
 * A card in `data/field-cards/` is a hand-extraction of a published one-pager,
 * stamped with the commit it came from. It is the lecture's only source of
 * claims, in the same way an evidence pack is a decision story's only source of
 * figures: the runtime reads the frozen file, never a live page, and the text is
 * the card's own text.
 */

import { z } from "zod";

const Link = z.object({
  href: z.string().url(),
});

export const FieldCardSchema = z.object({
  id: z.string().min(1),
  card: z.string().min(1),
  eyebrow: z.string().min(1),
  headline: z.string().min(1),
  verbs: z.string().min(1),
  lede: z.string().min(1),
  /** The card's own version stamp, so a lecture can show what it is teaching. */
  version: z.string().min(1),
  reviewed: z.string().min(1),
  source: z.object({
    repo: z.string().min(1),
    file: z.string().min(1),
    commit: z.string().regex(/^[0-9a-f]{40}$/),
    live: z.string().url(),
    extractedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    method: z.string().min(1),
  }),
  layers: z
    .array(z.object({ code: z.string().min(1), job: z.string().min(1) }))
    .min(2),
  decisions: z
    .array(
      Link.extend({
        problem: z.string().min(1),
        use: z.string().min(1),
        example: z.string().min(1),
      }),
    )
    .min(2),
  buildOrder: z.string().min(1),
  frameworks: z
    .array(Link.extend({ name: z.string().min(1), fit: z.string().min(1) }))
    .min(1),
  behavior: z
    .array(z.object({ title: z.string().min(1), body: z.string().min(1) }))
    .min(1),
  ladder: z.array(z.string().min(1)).min(2),
  killSwitch: z.string().min(1),
  antiPatterns: z.array(z.string().min(1)).min(1),
  alwaysOn: z
    .array(z.object({ label: z.string().min(1), body: z.string().min(1) }))
    .min(1),
});

export type FieldCard = z.infer<typeof FieldCardSchema>;
