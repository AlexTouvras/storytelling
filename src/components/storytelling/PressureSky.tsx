"use client";

import { AtmosphereLayer } from "@/components/storytelling/atmosphere";
import type { AtmosphereIntensity } from "@/stories/schemas/atmosphereAllowlist";

type Props = {
  className?: string;
  /** @deprecated Prefer AtmosphereIntensity; `stage` maps to `subtle`. */
  intensity?: AtmosphereIntensity | "stage" | "hero";
};

/**
 * @deprecated Prefer `<AtmosphereLayer motifId="pressure-field" />`.
 * Thin alias kept so older imports resolve without TDZ circular breaks.
 */
export function PressureSky({ className, intensity = "hero" }: Props) {
  const mapped: AtmosphereIntensity =
    intensity === "stage" ? "subtle" : intensity;
  return (
    <AtmosphereLayer
      motifId="pressure-field"
      role="ambient"
      intensity={mapped}
      className={className}
    />
  );
}
