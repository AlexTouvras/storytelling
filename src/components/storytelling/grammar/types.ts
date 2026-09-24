/**
 * Story Grammar (Layer 2) — earned from When Rates Rise.
 * Behaviors describe what the visual *does*; visualState remains the
 * allow-listed act key in the manifest.
 */

export const VISUAL_BEHAVIORS = [
  "reveal",
  "trace",
  "compare",
  "zoom",
  "filter",
  "annotate",
  "split",
  "transform",
  "highlight",
  "accumulate",
] as const;

export type VisualBehavior = (typeof VISUAL_BEHAVIORS)[number];

export const VISUAL_JOBS = [
  "establish",
  "reveal",
  "compare",
  "zoom",
  "filter",
  "evidence-board",
  "decide",
] as const;

export type VisualJob = (typeof VISUAL_JOBS)[number];

export type TransmissionNodeId =
  | "central-bank"
  | "market"
  | "loan"
  | "payment"
  | "buffer";

export type BufferMark = {
  id: string;
  /** Residual capacity 0–1 (visual height). */
  height: number;
  thin: boolean;
  floating: boolean;
  label?: string;
};

export type FieldMode =
  | "stub"
  | "household"
  | "segments"
  | "population"
  | "sleeve"
  | "annotated"
  | "cut";
