/**
 * Allow-listed visual IDs and per-visual states.
 * Kept free of React so validate:stories can import it.
 */
export const VISUAL_ALLOWLIST = {
  "rate-risk-mechanism": [
    "baseline",
    "rate-step-up",
    "buffer-shrink",
    "risk-band-shift",
    "segment-focus",
    "conclusion",
  ],
  "cashflow-pressure": [
    "dial",
    "transmission",
    "heterogeneity",
    "book",
    "intersection",
    "evidence",
    "cut",
  ],
} as const;

export type AllowlistedVisualId = keyof typeof VISUAL_ALLOWLIST;

export type AllowlistedVisualState =
  (typeof VISUAL_ALLOWLIST)[AllowlistedVisualId][number];

export function isAllowlistedVisualId(id: string): id is AllowlistedVisualId {
  return id in VISUAL_ALLOWLIST;
}

export function isAllowlistedVisualState(
  visualId: string,
  state: string,
): boolean {
  if (!isAllowlistedVisualId(visualId)) return false;
  return (VISUAL_ALLOWLIST[visualId] as readonly string[]).includes(state);
}
