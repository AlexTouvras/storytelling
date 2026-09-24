import type { TemplateId } from "@/stories/schemas/manifest";

export type TemplateDefinition = {
  id: TemplateId;
  name: string;
  purpose: string;
  chapterHints: string[];
  /** Future templates can add layout/config without rewriting the registry. */
  layout: "two-column-sticky";
};

export const scrollingNarrativeTemplate: TemplateDefinition = {
  id: "scrolling-narrative",
  name: "Scrolling Narrative",
  purpose:
    "Narrative-driven chapters with a sticky visual that updates as the reader scrolls.",
  chapterHints: [
    "Hook",
    "Context",
    "Mechanism",
    "Evidence",
    "Implications",
    "Conclusion",
  ],
  layout: "two-column-sticky",
};

const registry: Record<TemplateId, TemplateDefinition> = {
  "scrolling-narrative": scrollingNarrativeTemplate,
};

export function getTemplate(templateId: string): TemplateDefinition {
  if (!(templateId in registry)) {
    throw new Error(
      `Unknown templateId "${templateId}". Supported: ${Object.keys(registry).join(", ")}`,
    );
  }
  return registry[templateId as TemplateId];
}

export function listTemplates(): TemplateDefinition[] {
  return Object.values(registry);
}

export function isKnownTemplateId(id: string): id is TemplateId {
  return id in registry;
}
