/**
 * Where a figure comes from. One vocabulary for every story, so a badge means
 * the same thing in every film and on every method page.
 */
export const EVIDENCE_KINDS = [
  "observed",
  "published",
  "calculated",
  "modelled",
  "hypothetical",
  "illustrative",
] as const;

export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const KIND_INFO: Record<EvidenceKind, { label: string; definition: string }> = {
  observed: {
    label: "observed",
    definition: "Measured in the source data and shown as it was recorded.",
  },
  published: {
    label: "published",
    definition: "A figure stated by a named authority, quoted with its source.",
  },
  calculated: {
    label: "calculated",
    definition: "Arithmetic on observed data: counts, shares, medians. The method page gives the rule.",
  },
  modelled: {
    label: "modelled",
    definition: "Output of our model. It shows a mechanism or a design case, not a measurement.",
  },
  hypothetical: {
    label: "hypothetical",
    definition: "A what-if: what the data would look like under a rule nobody has applied.",
  },
  illustrative: {
    label: "illustrative",
    definition: "A picture of the idea. Nothing is read off it.",
  },
};

const ALIASES: Record<string, EvidenceKind> = {
  modeled: "modelled",
  "observed-published": "published",
};

export function isEvidenceKind(value: string): value is EvidenceKind {
  return (EVIDENCE_KINDS as readonly string[]).includes(value);
}

/** Packs and older manifests spell some kinds differently. */
export function normaliseKind(value: string): EvidenceKind | null {
  if (isEvidenceKind(value)) return value;
  return ALIASES[value] ?? null;
}

export const kindAnchor = (kind: EvidenceKind) => `kind-${kind}`;

export function methodHref(slug: string, anchor?: string): string {
  return `/stories/${slug}/method${anchor ? `#${anchor}` : ""}`;
}

export function filmHref(slug: string): string {
  return `/stories/${slug}/film`;
}

export function packHref(slug: string): string {
  return `/stories/${slug}/method/evidence.json`;
}
