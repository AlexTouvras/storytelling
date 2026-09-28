import { z } from "zod";
import {
  isAllowlistedVisualId,
  isAllowlistedVisualState,
} from "@/stories/schemas/visualAllowlist";
import {
  ATMOSPHERE_MOTIF_IDS,
  ATMOSPHERE_ROLES,
  ATMOSPHERE_INTENSITIES,
  isAtmosphereMotifId,
} from "@/stories/schemas/atmosphereAllowlist";
import { EVIDENCE_KINDS } from "@/lib/reader/kinds";
import { orientationProblems } from "@/lib/reader/terms";

/**
 * Allow-listed visual IDs — registry keys, not free-form component names.
 * States are scoped per visualId (see visualAllowlist.ts).
 */
export const VisualIdSchema = z.enum([
  "rate-risk-mechanism",
  "cashflow-pressure",
]);

/** Opaque string; validated against the active visualId at load/validate time. */
export const VisualStateSchema = z.string().min(1);

export const TemplateIdSchema = z.enum(["scrolling-narrative"]);

export const SceneTriggerSchema = z.enum(["section-visible", "progress"]);

export const AtmosphereMotifIdSchema = z.enum(ATMOSPHERE_MOTIF_IDS);

export const AtmosphereSchema = z
  .object({
    motifId: AtmosphereMotifIdSchema,
    roles: z
      .array(z.enum(ATMOSPHERE_ROLES))
      .min(1)
      .default(["intro", "outro", "ambient"]),
    intensity: z.enum(ATMOSPHERE_INTENSITIES).optional(),
  })
  .strict();

export const SceneSchema = z
  .object({
    id: z.string().min(1),
    trigger: SceneTriggerSchema,
    visualId: VisualIdSchema,
    visualState: VisualStateSchema,
    transition: z.string().optional(),
  })
  .strict();

export const SectionSchema = z
  .object({
    id: z.string().min(1),
    headline: z.string().min(1),
    body: z.string().min(1),
    scenes: z.array(SceneSchema).min(1),
  })
  .strict();

export const DataRefSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    kind: z.enum(EVIDENCE_KINDS),
    note: z.string().optional(),
  })
  .strict();

export const TermSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "term id must be kebab-case"),
    word: z.string().min(1),
    forms: z.array(z.string().min(1)).optional(),
    technical: z.string().min(1),
    definition: z.string().min(1).max(220, "a definition is one line"),
    beat: z.number().int().min(0),
  })
  .strict();

/** Labels on an illustration the first time it opens, and the caption that stays. */
export const LegendSchema = z
  .object({
    beat: z.number().int().min(0),
    labels: z.array(z.string().min(1)).min(1).max(4, "at most four legend labels"),
    caption: z.string().min(1),
  })
  .strict();

/**
 * What a reader needs before they reason with the story: a short orientation,
 * the film's beats by name, the terms each beat teaches, and a legend for any
 * illustration that is not self-explanatory.
 */
export const ReaderSchema = z
  .object({
    orientation: z.string().min(1),
    beats: z.array(z.string().min(1)).min(1),
    terms: z.array(TermSchema).min(1),
    legend: LegendSchema.optional(),
  })
  .strict();

/** Where the method page gets its figures and where the reasoning is written down. */
export const MethodRefSchema = z
  .object({
    pack: z.string().regex(/^data\/figures\/[a-z0-9.-]+\.json$/, "pack must be a file in data/figures/"),
    spec: z.string().regex(/^docs\/decision-specs\/[a-z0-9-]+\.md$/, "spec must be a file in docs/decision-specs/"),
  })
  .strict();

export const SourceSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    url: z.string().url().optional(),
  })
  .strict();

export const A11ySchema = z
  .object({
    alt: z.string().min(1),
    reducedMotionNote: z.string().min(1),
  })
  .strict();

export const StoryHeroSchema = z
  .object({
    kicker: z.string().min(1),
    title: z.string().min(1),
    question: z.string().min(1),
  })
  .strict();

export const StoryMetaSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),
    title: z.string().min(1),
    summary: z.string().min(1),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
    templateId: TemplateIdSchema,
    hero: StoryHeroSchema.optional(),
    /** Marks engine fixtures vs the platform reference story. */
    role: z.enum(["reference", "fixture"]).optional(),
    /** Cinematic atmosphere motif for intro / outro / ambient. */
    atmosphere: AtmosphereSchema.optional(),
  })
  .strict();

export const StoryManifestSchema = z
  .object({
    meta: StoryMetaSchema,
    sections: z.array(SectionSchema).min(1),
    dataRefs: z.array(DataRefSchema).default([]),
    sources: z.array(SourceSchema).default([]),
    methodology: z.string().min(1),
    limitations: z.string().min(1),
    a11y: A11ySchema,
    reader: ReaderSchema.optional(),
    method: MethodRefSchema.optional(),
  })
  .strict()
  .superRefine((manifest, ctx) => {
    const reader = manifest.reader;
    if (reader) {
      for (const problem of orientationProblems(reader.orientation, reader.terms)) {
        ctx.addIssue({ code: "custom", path: ["reader", "orientation"], message: problem });
      }
      const ids = new Set<string>();
      for (const [ti, term] of reader.terms.entries()) {
        if (ids.has(term.id)) {
          ctx.addIssue({ code: "custom", path: ["reader", "terms", ti, "id"], message: `duplicate term "${term.id}"` });
        }
        ids.add(term.id);
        if (term.beat >= reader.beats.length) {
          ctx.addIssue({
            code: "custom",
            path: ["reader", "terms", ti, "beat"],
            message: `beat ${term.beat} is past the last beat (${reader.beats.length - 1})`,
          });
        }
      }
      if (reader.legend && reader.legend.beat >= reader.beats.length) {
        ctx.addIssue({
          code: "custom",
          path: ["reader", "legend", "beat"],
          message: `beat ${reader.legend.beat} is past the last beat (${reader.beats.length - 1})`,
        });
      }
    }
    if (
      manifest.meta.atmosphere &&
      !isAtmosphereMotifId(manifest.meta.atmosphere.motifId)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["meta", "atmosphere", "motifId"],
        message: `Unknown atmosphere motifId "${manifest.meta.atmosphere.motifId}"`,
      });
    }
    for (const [si, section] of manifest.sections.entries()) {
      for (const [ci, scene] of section.scenes.entries()) {
        if (!isAllowlistedVisualId(scene.visualId)) {
          ctx.addIssue({
            code: "custom",
            path: ["sections", si, "scenes", ci, "visualId"],
            message: `Unknown visualId "${scene.visualId}"`,
          });
          continue;
        }
        if (!isAllowlistedVisualState(scene.visualId, scene.visualState)) {
          ctx.addIssue({
            code: "custom",
            path: ["sections", si, "scenes", ci, "visualState"],
            message: `visualState "${scene.visualState}" is not valid for visualId "${scene.visualId}"`,
          });
        }
      }
    }
  });

export type StoryManifest = z.infer<typeof StoryManifestSchema>;
export type StorySection = z.infer<typeof SectionSchema>;
export type StoryScene = z.infer<typeof SceneSchema>;
export type VisualId = z.infer<typeof VisualIdSchema>;
export type VisualState = z.infer<typeof VisualStateSchema>;
export type TemplateId = z.infer<typeof TemplateIdSchema>;
export type StoryHero = z.infer<typeof StoryHeroSchema>;
export type StoryAtmosphere = z.infer<typeof AtmosphereSchema>;
export type StoryReader = z.infer<typeof ReaderSchema>;
export type StoryTerm = z.infer<typeof TermSchema>;
export type StoryMethodRef = z.infer<typeof MethodRefSchema>;

export function parseStoryManifest(data: unknown): StoryManifest {
  return StoryManifestSchema.parse(data);
}

export function safeParseStoryManifest(data: unknown) {
  return StoryManifestSchema.safeParse(data);
}
