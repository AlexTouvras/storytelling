/**
 * The frequency model against the trips Fingrid measured.
 *
 * For each trip: back out the loss that makes the model's first second fall as
 * steeply as the measured one, at that hour's kinetic energy and from that
 * trip's pre-event frequency; then compare the model's nadir and its timing
 * with the measurement. Outputs are `modeled`.
 *
 * This is the check the Spec asked for before the model draws anything in the
 * film. It is not a fit: the model's parameters stay at the design-point
 * calibration, and only the loss is solved per trip.
 */

import { simulateTrip, type GridModel } from "@/lib/sim/grid-frequency";

export type ObservedTrip = {
  t: string;
  pre: number;
  nadir: number;
  nadir_s: number;
  rocof_1s: number;
  kinetic_gws: number | null;
  on_hour: boolean;
};

export type TripCheck = {
  t: string;
  kineticGWs: number;
  lossMW: number;
  observedDepthMHz: number;
  modeledDepthMHz: number;
  observedNadirSeconds: number;
  modeledNadirSeconds: number;
};

const SAMPLE = 0.1;

function firstSecondSlope(kineticGWs: number, lossMW: number, startHz: number, model?: GridModel): number {
  const { trace } = simulateTrip({ kineticGWs, lossMW, startHz }, { seconds: 1.2, sampleSeconds: SAMPLE, model });
  return trace[Math.round(1 / SAMPLE)] - trace[0];
}

/** The loss, MW, whose modelled first second falls by `rocof1s` Hz. */
export function lossFromInitialFall(kineticGWs: number, rocof1s: number, startHz: number, model?: GridModel): number {
  let lo = 0;
  let hi = 4000;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (firstSecondSlope(kineticGWs, mid, startHz, model) > rocof1s) lo = mid;
    else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

export function checkTrip(trip: ObservedTrip, model?: GridModel): TripCheck | null {
  if (trip.on_hour || trip.kinetic_gws === null || trip.rocof_1s >= 0) return null;
  const lossMW = lossFromInitialFall(trip.kinetic_gws, trip.rocof_1s, trip.pre, model);
  const run = simulateTrip({ kineticGWs: trip.kinetic_gws, lossMW, startHz: trip.pre }, { seconds: 30, model });
  return {
    t: trip.t,
    kineticGWs: trip.kinetic_gws,
    lossMW,
    observedDepthMHz: Math.round((trip.pre - trip.nadir) * 1000),
    modeledDepthMHz: Math.round((trip.pre - run.nadirHz) * 1000),
    observedNadirSeconds: trip.nadir_s,
    modeledNadirSeconds: Math.round(run.nadirSeconds * 10) / 10,
  };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export type ValidationSummary = {
  trips: number;
  /** Modelled minus observed depth, mHz; positive = the model falls deeper. */
  medianDepthErrorMHz: number;
  medianAbsDepthErrorMHz: number;
  /** Median of modelled ÷ observed depth. */
  medianDepthRatio: number;
  medianNadirSecondsObserved: number;
  medianNadirSecondsModeled: number;
};

export function summarise(checks: TripCheck[]): ValidationSummary {
  const err = checks.map((c) => c.modeledDepthMHz - c.observedDepthMHz);
  return {
    trips: checks.length,
    medianDepthErrorMHz: median(err),
    medianAbsDepthErrorMHz: median(err.map(Math.abs)),
    medianDepthRatio: Math.round(median(checks.map((c) => c.modeledDepthMHz / c.observedDepthMHz)) * 100) / 100,
    medianNadirSecondsObserved: median(checks.map((c) => c.observedNadirSeconds)),
    medianNadirSecondsModeled: median(checks.map((c) => c.modeledNadirSeconds)),
  };
}
