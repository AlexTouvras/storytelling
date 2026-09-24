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
    kind: z.enum(["observed", "calculated", "illustrative", "hypothetical"]),
    note: z.string().optional(),
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
  })
  .strict()
  .superRefine((manifest, ctx) => {
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

export function parseStoryManifest(data: unknown): StoryManifest {
  return StoryManifestSchema.parse(data);
}

export function safeParseStoryManifest(data: unknown) {
  return StoryManifestSchema.safeParse(data);
}
