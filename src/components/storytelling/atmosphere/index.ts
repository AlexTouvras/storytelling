"use client";

import { createElement } from "react";
import {
  defaultIntensityForRole,
  type AtmosphereIntensity,
  type AtmosphereMotifId,
  type AtmosphereRole,
} from "@/stories/schemas/atmosphereAllowlist";
import { resolveAtmosphereMotif } from "./registry";

type Props = {
  motifId: AtmosphereMotifId | string;
  role: AtmosphereRole;
  intensity?: AtmosphereIntensity;
  className?: string;
};

/**
 * Renders an allow-listed atmosphere motif for intro / outro / ambient.
 */
export function AtmosphereLayer({
  motifId,
  role,
  intensity,
  className,
}: Props) {
  const Motif = resolveAtmosphereMotif(motifId);
  if (!Motif) return null;
  const level = intensity ?? defaultIntensityForRole(role);
  return createElement(Motif, { intensity: level, className });
}

export { ATMOSPHERE_REGISTRY, resolveAtmosphereMotif } from "./registry";
export type { MotifProps } from "./types";
