/**
 * Two frames of southbound US-101, lane 2, sixty seconds apart.
 * Read from the frozen pack so the card cannot drift from the film.
 */
import pack from "../../../data/figures/where-should-the-speed-be-held.v1.json";

export type LaneCar = { y: number; mph: number };

const walk = pack.featured.walk;
const [now, later] = pack.featured.frames;

export const LANE2_MINUTE = {
  place: "Southbound US-101",
  lane: pack.featured.lane,
  lengthFt: pack.recording.length_ft,
  walkFt: walk.walk_ft,
  walkMph: Math.round(walk.walk_mph),
  ahead: [Math.round(now.downstream_mph ?? 0), Math.round(later.downstream_mph ?? 0)] as const,
  frames: [
    {
      id: "now",
      kicker: "This minute",
      seconds: now.seconds,
      pocketFt: [walk.from_y_ft, walk.from_y_ft + 300] as const,
      cars: now.cars.map((car) => ({ y: car.y, mph: car.mph })),
    },
    {
      id: "later",
      kicker: "A minute later",
      seconds: later.seconds,
      pocketFt: [walk.to_y_ft, walk.to_y_ft + 400] as const,
      cars: later.cars.map((car) => ({ y: car.y, mph: car.mph })),
    },
  ],
};

export function speedFill(mph: number) {
  const t = Math.min(1, Math.max(0, (mph - 12) / 36));
  const lightness = 0.62 + t * 0.16;
  const hue = 300 - t * 105;
  return `oklch(${lightness.toFixed(3)} 0.16 ${hue.toFixed(0)})`;
}
