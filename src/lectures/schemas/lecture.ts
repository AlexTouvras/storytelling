/**
 * Lecture manifests (Layer 3, teaching register).
 *
 * A field card is a dense reference sheet: eleven rows of problem → use →
 * example that reward a reader who already knows the vocabulary. A lecture is
 * the same material paced for someone meeting it for the first time — one idea
 * per beat, in build order, with the diagram assembling itself as the idea
 * arrives.
 *
 * The rules the decision stories live under apply unchanged here:
 *
 *   - Approach B. The manifest is data; the engine renders it. No per-topic page.
 *   - Allow-listed visuals. `visualId` is mapped through a registry, never eval'd.
 *   - No invented evidence. Every beat declares `cardRefs` — paths into the
 *     frozen field card it teaches — and validation fails if one does not
 *     resolve. A lecture cannot claim something the published card does not say.
 *
 * What is new is only the driver: a lecture is paced, so its cue table doubles
 * as a running order for a live talk (see `LectureFilm`'s presenter mode).
 */

import { z } from "zod";

/** Canvas visuals a lecture may ask for. Mapped in `lectureVisualRegistry`. */
export const LECTURE_VISUAL_IDS = ["agentic-stack"] as const;
export const LectureVisualIdSchema = z.enum(LECTURE_VISUAL_IDS);
export type LectureVisualId = z.infer<typeof LectureVisualIdSchema>;

/**
 * Channels the agentic-stack canvas reads. Named for what the reader sees, so a
 * reviewer can read the cue table as a running order rather than as parameters.
 */
export const AgenticStackCueSchema = z.object({
  at: z.number().min(0).max(1),
  beat: z.number().int().min(0),
  /** World units visible vertically. Grows as the stack grows. */
  spanY: z.number().positive(),
  /** Camera centre, in world units down the stack. */
  cy: z.number(),
  /** Language core: the model itself. */
  core: z.number().min(0).max(1),
  /** Document marks on the knowledge band. */
  corpus: z.number().min(0).max(1),
  /** Citation lines from documents up into the answer. */
  ground: z.number().min(0).max(1),
  /** The control loop ring: plan, act, observe, stop. */
  loop: z.number().min(0).max(1),
  /** The token running that loop. */
  runner: z.number().min(0).max(1),
  /** Spokes from the loop down into systems. */
  reach: z.number().min(0).max(1),
  /** A peer agent across an ownership boundary. */
  peers: z.number().min(0).max(1),
  /** Approve bar across the loop, and the caps beside it. */
  gate: z.number().min(0).max(1),
  /** The build ladder drawn beside the stack. */
  ladder: z.number().min(0).max(1),
  /** Dim the rungs nobody has earned yet. */
  thin: z.number().min(0).max(1),
});

export type AgenticStackCue = z.infer<typeof AgenticStackCueSchema>;

/** Channels the canvas actually draws, in the order the checker reports them. */
export const AGENTIC_STACK_RENDERED = [
  "spanY",
  "cy",
  "core",
  "corpus",
  "ground",
  "loop",
  "runner",
  "reach",
  "peers",
  "gate",
  "ladder",
  "thin",
] as const;

export const LectureBeatSchema = z.object({
  beat: z.number().int().min(0),
  /** Short label above the beat title. */
  kicker: z.string().min(1),
  title: z.string().min(1),
  /** What a reader reads. Two short paragraphs is the working ceiling. */
  paragraphs: z.array(z.string().min(1)).min(1).max(3),
  /** What a presenter says over the same beat. Not shown to readers. */
  notes: z.array(z.string().min(1)).min(1).max(4),
  /** One term or number held large beside the copy. */
  figure: z.string().min(1).optional(),
  /**
   * Paths into the frozen field card this beat teaches, e.g. `layers[2]`,
   * `decisions[7].use`, `killSwitch`. Checked against the card at validate time.
   */
  cardRefs: z.array(z.string().min(1)).min(1),
});

export type LectureBeat = z.infer<typeof LectureBeatSchema>;

export const LectureManifestSchema = z
  .object({
    id: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    /** Editorial title of the lecture, not of the card. */
    title: z.string().min(1),
    kicker: z.string().min(1),
    dek: z.string().min(1),
    /** Who this is paced for. Shown in the prologue. */
    audience: z.string().min(1),
    visualId: LectureVisualIdSchema,
    /** The frozen field card under `data/field-cards/`. */
    card: z.object({
      id: z.string().min(1),
      file: z.string().min(1),
    }),
    /** Scroll track length. Long enough that a beat is not skipped by a flick. */
    trackVh: z.number().int().min(400).max(4000),
    /** Wall-clock length of the same cue table when a clock drives it. */
    presentSeconds: z.number().int().min(60).max(3600),
    cues: z.array(AgenticStackCueSchema).min(2),
    beats: z.array(LectureBeatSchema).min(2),
    /** The closing frame: what to do with the lecture once it ends. */
    closing: z.object({
      kicker: z.string().min(1),
      title: z.string().min(1),
      paragraphs: z.array(z.string().min(1)).min(1),
    }),
  })
  .superRefine((manifest, ctx) => {
    const declared = new Set(manifest.beats.map((b) => b.beat));
    for (const beat of manifest.beats) {
      if (manifest.beats.filter((b) => b.beat === beat.beat).length > 1) {
        ctx.addIssue({
          code: "custom",
          message: `beat ${beat.beat} is declared twice`,
        });
      }
    }
    for (const cue of manifest.cues) {
      if (!declared.has(cue.beat)) {
        ctx.addIssue({
          code: "custom",
          message: `cue at ${cue.at} points at beat ${cue.beat}, which has no copy`,
        });
      }
    }
    const reached = new Set(manifest.cues.map((c) => c.beat));
    for (const beat of manifest.beats) {
      if (!reached.has(beat.beat)) {
        ctx.addIssue({
          code: "custom",
          message: `beat ${beat.beat} has copy but no cue ever reaches it`,
        });
      }
    }
  });

export type LectureManifest = z.infer<typeof LectureManifestSchema>;

/**
 * Resolve a `cardRefs` path against a frozen field card. Supports dotted keys
 * and `[n]` indexes. Returns `undefined` when the path does not exist, which is
 * the only failure mode the validator cares about.
 */
export function resolveCardRef(card: unknown, ref: string): unknown {
  const steps = ref
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);

  let node: unknown = card;
  for (const step of steps) {
    if (node === null || node === undefined) return undefined;
    if (Array.isArray(node)) {
      const index = Number(step);
      if (!Number.isInteger(index)) return undefined;
      node = node[index];
      continue;
    }
    if (typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[step];
  }
  return node;
}

/** Every `cardRefs` entry that does not resolve against the frozen card. */
export function danglingCardRefs(
  manifest: LectureManifest,
  card: unknown,
): string[] {
  const dangling: string[] = [];
  for (const beat of manifest.beats) {
    for (const ref of beat.cardRefs) {
      if (resolveCardRef(card, ref) === undefined) {
        dangling.push(`beat ${beat.beat}: ${ref}`);
      }
    }
  }
  return dangling;
}
