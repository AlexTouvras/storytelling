/**
 * Two frames of southbound US-101, lane 2, sixty seconds apart.
 * Observed positions from FHWA NGSIM (one sample each).
 * global_time 1118847219700 and 1118847279700.
 * y is feet in the direction of travel. mph is that car's speed.
 * Provisional until the evidence pack is frozen; the card reads this module.
 */
export type LaneCar = { y: number; mph: number };

export const LANE2_MINUTE = {
  place: "Southbound US-101",
  lane: 2,
  when: "15 June 2005",
  lengthFt: 2200,
  /** How far the slow stretch walked back, from the 100-foot cells on this minute. */
  walkFt: 800,
  /** 800 ft in 60 s. */
  walkMph: 9,
  frames: [
    {
      id: "now",
      kicker: "This minute",
      seconds: 240,
      /** The slow cluster: cars under about 25 mph. */
      pocketFt: [800, 1100] as const,
      cars: [
        { y: 77.7, mph: 28.1 },
        { y: 140.6, mph: 36.3 },
        { y: 235.6, mph: 24.5 },
        { y: 275.8, mph: 25.4 },
        { y: 321.3, mph: 24.5 },
        { y: 363.3, mph: 27.3 },
        { y: 465.2, mph: 29.5 },
        { y: 642.0, mph: 27.2 },
        { y: 691.0, mph: 27.3 },
        { y: 762.0, mph: 23.9 },
        { y: 840.0, mph: 15.3 },
        { y: 901.3, mph: 20.4 },
        { y: 944.2, mph: 22.5 },
        { y: 1040.2, mph: 20.5 },
        { y: 1105.7, mph: 23.8 },
        { y: 1162.7, mph: 27.4 },
        { y: 1242.9, mph: 31.2 },
        { y: 1300.4, mph: 30.6 },
        { y: 1392.4, mph: 30.7 },
        { y: 1457.6, mph: 31.8 },
        { y: 1608.1, mph: 40.9 },
        { y: 1719.6, mph: 45.7 },
        { y: 1852.8, mph: 45.7 },
        { y: 1964.2, mph: 44.2 },
        { y: 2067.1, mph: 44.0 },
      ] as LaneCar[],
    },
    {
      id: "later",
      kicker: "A minute later",
      seconds: 300,
      pocketFt: [0, 400] as const,
      cars: [
        { y: 43.9, mph: 13.4 },
        { y: 84.5, mph: 10.8 },
        { y: 133.1, mph: 9.3 },
        { y: 164.7, mph: 10.0 },
        { y: 228.9, mph: 16.4 },
        { y: 278.7, mph: 20.2 },
        { y: 324.3, mph: 20.5 },
        { y: 384.2, mph: 22.4 },
        { y: 453.9, mph: 21.8 },
        { y: 547.9, mph: 18.7 },
        { y: 632.0, mph: 24.9 },
        { y: 693.3, mph: 23.3 },
        { y: 750.0, mph: 23.9 },
        { y: 875.8, mph: 23.9 },
        { y: 917.7, mph: 23.8 },
        { y: 1050.7, mph: 22.7 },
        { y: 1158.2, mph: 27.4 },
        { y: 1220.7, mph: 27.3 },
        { y: 1283.9, mph: 30.7 },
        { y: 1390.8, mph: 30.7 },
        { y: 1478.0, mph: 40.3 },
        { y: 1575.2, mph: 38.8 },
        { y: 1636.0, mph: 37.6 },
        { y: 1796.0, mph: 44.5 },
        { y: 1912.8, mph: 48.3 },
        { y: 1976.5, mph: 45.9 },
        { y: 2078.0, mph: 50.1 },
      ] as LaneCar[],
    },
  ],
} as const;

export function speedFill(mph: number) {
  const t = Math.min(1, Math.max(0, (mph - 12) / 36));
  const lightness = 0.62 + t * 0.16;
  const hue = 300 - t * 105;
  return `oklch(${lightness.toFixed(3)} 0.16 ${hue.toFixed(0)})`;
}
