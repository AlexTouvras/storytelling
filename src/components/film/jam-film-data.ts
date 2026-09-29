/**
 * The slices the film draws. The trajectories stay on the server, with the model.
 */

import pack from "../../../data/figures/where-should-the-speed-be-held.v1.json";

export type JamMark = {
  id: number;
  lane: number;
  y: number;
  mph: number;
  braking: boolean;
};

export type JamCloud = { seconds: number; cars: JamMark[] };

export type JamRamp = { role: string; y0: number; y1: number };

export type JamFilmData = {
  lengthFt: number;
  featuredId: number;
  featuredLane: number;
  featuredY: number;
  steps: JamCloud[];
  snapshots: JamCloud[];
  ramps: JamRamp[];
};

export function jamFilmData(): JamFilmData {
  const lanes = pack.recording.lanes;
  const roles = pack.recording.ramp_lanes.lanes as Record<string, { role: string }>;
  const ramps: JamRamp[] = [6, 7, 8].flatMap((lane) => {
    const row = lanes.find((item) => item.lane === lane);
    const role = roles[String(lane)]?.role;
    if (!row || !role || role === "unresolved") return [];
    return [{ role, y0: row.y0_ft, y1: row.y1_ft }];
  });
  return {
    lengthFt: pack.recording.length_ft,
    featuredId: pack.featured.car.id,
    featuredLane: pack.featured.lane,
    featuredY: pack.featured.car.y,
    steps: pack.featured.steps.map((step) => ({
      seconds: step.seconds,
      cars: step.cars.map((car) => ({
        id: car.id,
        lane: pack.featured.lane,
        y: car.y,
        mph: car.mph,
        braking: car.braking,
      })),
    })),
    snapshots: pack.morning.snapshots.map((snap) => ({
      seconds: snap.seconds,
      cars: snap.cars.map((car) => ({
        id: car.id,
        lane: car.lane,
        y: car.y,
        mph: car.mph,
        braking: car.braking,
      })),
    })),
    ramps,
  };
}
