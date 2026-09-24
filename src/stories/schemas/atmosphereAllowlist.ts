/**
 * Allow-listed atmosphere motif IDs.
 * Kept free of React so validate:stories can import it.
 */
export const ATMOSPHERE_MOTIF_IDS = [
  "pressure-field",
  "ledger-drift",
  "data-stream",
  "signal-ribbon",
  "constellation",
] as const;

export type AtmosphereMotifId = (typeof ATMOSPHERE_MOTIF_IDS)[number];

export const ATMOSPHERE_ROLES = ["intro", "outro", "ambient"] as const;
export type AtmosphereRole = (typeof ATMOSPHERE_ROLES)[number];

export const ATMOSPHERE_INTENSITIES = ["subtle", "hero", "curtain"] as const;
export type AtmosphereIntensity = (typeof ATMOSPHERE_INTENSITIES)[number];

export function isAtmosphereMotifId(id: string): id is AtmosphereMotifId {
  return (ATMOSPHERE_MOTIF_IDS as readonly string[]).includes(id);
}

/** Default intensity when role mounts without an override. */
export function defaultIntensityForRole(
  role: AtmosphereRole,
): AtmosphereIntensity {
  if (role === "intro") return "hero";
  if (role === "outro") return "curtain";
  return "subtle";
}
