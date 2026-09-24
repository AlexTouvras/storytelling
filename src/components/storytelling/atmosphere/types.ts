"use client";

import { cn } from "@/lib/cn";
import type { AtmosphereIntensity } from "@/stories/schemas/atmosphereAllowlist";

export type MotifProps = {
  className?: string;
  intensity?: AtmosphereIntensity;
};

export function motifShell(
  className: string | undefined,
  extra?: string,
): string {
  return cn(
    "pointer-events-none absolute inset-0 overflow-hidden",
    extra,
    className,
  );
}

export function isHeroLike(intensity: AtmosphereIntensity = "hero"): boolean {
  return intensity === "hero" || intensity === "curtain";
}
