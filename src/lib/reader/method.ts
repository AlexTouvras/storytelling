/**
 * A story's method page, as data. The engine renders the parts every story has
 * (the decision, the labels, the terms, sources, schema, limitations) from the
 * manifest and the frozen pack; a story adds its own sections — its pipeline,
 * its event tables, its model — built from the same pack, so nothing on the
 * page is typed by hand.
 */

import { normaliseKind, type EvidenceKind } from "@/lib/reader/kinds";

export type Cell = string | number;

export type MethodBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: readonly string[] }
  | { type: "code"; text: string }
  | {
      type: "table";
      caption?: string;
      columns: readonly string[];
      rows: readonly (readonly Cell[])[];
      /** Columns to right-align, by index. Numbers are right-aligned by default. */
      left?: readonly number[];
    };

export type MethodSection = {
  id: string;
  title: string;
  kind?: EvidenceKind;
  blocks: readonly MethodBlock[];
};

/** What the method page needs from a story beyond its manifest. */
export type StoryMethod = {
  /** The frozen evidence pack, imported as JSON. */
  pack: Record<string, unknown>;
  /** One line per top-level block of the pack: what it holds. Every block needs one. */
  schema: Record<string, string>;
  /** Story-specific sections, in reading order, placed after the terms. */
  sections?: () => MethodSection[];
};

export type SchemaRow = {
  key: string;
  holds: string;
  shape: string;
  kind: EvidenceKind | null;
  source: string;
};

function shapeOf(value: unknown): string {
  if (Array.isArray(value)) return `list of ${value.length.toLocaleString("en-GB")}`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    return `object, ${keys.length} ${keys.length === 1 ? "field" : "fields"}`;
  }
  if (typeof value === "string") return "text";
  return typeof value;
}

function sourceOf(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const block = value as Record<string, unknown>;
  if (typeof block.source === "string") return block.source;
  if (Array.isArray(block.sources)) return block.sources.filter((s) => typeof s === "string").join(", ");
  return "";
}

function kindOf(value: unknown): EvidenceKind | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const kind = (value as Record<string, unknown>).kind;
  return typeof kind === "string" ? normaliseKind(kind) : null;
}

/** One row per top-level block, with its kind and source read out of the pack itself. */
export function packSchema(pack: Record<string, unknown>, notes: Record<string, string>): SchemaRow[] {
  return Object.entries(pack).map(([key, value]) => ({
    key,
    holds: notes[key] ?? "",
    shape: shapeOf(value),
    kind: kindOf(value),
    source: sourceOf(value),
  }));
}

/** Pack blocks with no note, and notes for blocks the pack no longer has. */
export function schemaProblems(pack: Record<string, unknown>, notes: Record<string, string>): string[] {
  const problems: string[] = [];
  for (const key of Object.keys(pack)) {
    if (!notes[key]?.trim()) problems.push(`pack block "${key}" has no schema note`);
  }
  for (const key of Object.keys(notes)) {
    if (!(key in pack)) problems.push(`schema note "${key}" names a block the pack does not have`);
  }
  return problems;
}

/** Packs keep limitations as a list or a string; manifests as a string. */
export function limitationsOf(pack: Record<string, unknown>, fallback: string): string[] {
  const value = pack.limitations;
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string" && value.trim()) return [value];
  return [fallback];
}

export function packStamp(pack: Record<string, unknown>): { id: string; version: string; generated: string } {
  const text = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");
  return {
    id: text(pack.id),
    version: text(pack.version),
    generated: text(pack.generated ?? pack.frozenAt),
  };
}
