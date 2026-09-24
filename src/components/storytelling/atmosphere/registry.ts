"use client";

import type { ComponentType } from "react";
import type { AtmosphereMotifId } from "@/stories/schemas/atmosphereAllowlist";
import type { MotifProps } from "./types";
import { PressureFieldMotif } from "./PressureFieldMotif";
import { LedgerDriftMotif } from "./LedgerDriftMotif";
import { DataStreamMotif } from "./DataStreamMotif";
import { SignalRibbonMotif } from "./SignalRibbonMotif";
import { ConstellationMotif } from "./ConstellationMotif";

/**
 * Allow-listed motif registry — never eval names from a manifest.
 */
export const ATMOSPHERE_REGISTRY = {
  "pressure-field": PressureFieldMotif,
  "ledger-drift": LedgerDriftMotif,
  "data-stream": DataStreamMotif,
  "signal-ribbon": SignalRibbonMotif,
  constellation: ConstellationMotif,
} as const satisfies Record<
  AtmosphereMotifId,
  ComponentType<MotifProps>
>;

export function resolveAtmosphereMotif(
  motifId: string,
): ComponentType<MotifProps> | null {
  if (motifId in ATMOSPHERE_REGISTRY) {
    return ATMOSPHERE_REGISTRY[motifId as AtmosphereMotifId];
  }
  return null;
}
