/**
 * One-bus frequency response of the Nordic grid to a sudden loss of generation.
 *
 *   df/dt = f0 · (−loss + FCR-D + FFR + load relief) / (2 · kinetic energy)
 *
 * Every output is `modeled`. It exists to draw the *shape* of a fall — how the
 * same loss falls faster and deeper with less spinning mass, and how fast
 * reserve changes the nadir — never to supply a headline figure. Published
 * figures (Nordic TSOs 2025, Ørum et al. 2017) are quoted as published.
 *
 * Calibrated against the published design points, see `GRID_CALIBRATION_TARGETS`.
 * It reproduces the first two within 0.05 Hz and misses the third by about half
 * (it needs ~11 GWs of extra mass for 0.1 Hz at 80 GWs where Ørum et al. report
 * 20); that study used the pre-2024 FCR-D requirements. Stated in the Spec.
 */

export const NOMINAL_HZ = 50;
export const FLOOR_HZ = 49.0;

export type FastReserve = {
  /** MW available. */
  mw: number;
  /** Activation frequency: one of the FFR product's options. */
  activationHz: 49.7 | 49.6 | 49.5;
  /** Seconds to full activation once triggered. */
  fullSeconds: number;
};

/** The three activation options of Fingrid's FFR product. */
export const FFR_OPTIONS: readonly Omit<FastReserve, "mw">[] = [
  { activationHz: 49.7, fullSeconds: 1.3 },
  { activationHz: 49.6, fullSeconds: 1.0 },
  { activationHz: 49.5, fullSeconds: 0.7 },
];

export type GridParams = {
  /** Pre-disturbance kinetic energy of the synchronous system, GWs. */
  kineticGWs: number;
  /** Generation lost at t = 0, MW. */
  lossMW: number;
  fastReserve?: FastReserve;
  /** Frequency just before the loss, Hz. Load relief acts on the change from it. */
  startHz?: number;
};

export type GridModel = {
  /** FCR-D upward capacity, MW, activated linearly between 49.9 and 49.5 Hz. */
  fcrdMW: number;
  /** First-order lag of FCR-D, s. */
  fcrdLagSeconds: number;
  /** Measurement and controller dead time before FCR-D responds, s. */
  fcrdDeadSeconds: number;
  /** Load self-regulation, % of load per Hz. */
  loadReliefPctPerHz: number;
  /** Load it applies to, MW. */
  loadMW: number;
};

export const GRID_MODEL: GridModel = {
  fcrdMW: 1450,
  fcrdLagSeconds: 3.5,
  fcrdDeadSeconds: 0.75,
  loadReliefPctPerHz: 0.5,
  loadMW: 40_000,
};

/** Published points the model is fitted to. */
export const GRID_CALIBRATION_TARGETS = {
  /** FCR-D alone holds 49.0 Hz for the reference incident at 150 GWs (Nordic TSOs 2025). */
  designPoint: { kineticGWs: 150, lossMW: 1450, ffrMW: 0, nadirHz: 49.0 },
  /** About 300 MW of Nordic FFR holds 49.0 Hz at 100 GWs (Nordic TSOs 2025; FFR design 2024). */
  lowInertia: { kineticGWs: 100, lossMW: 1450, ffrMW: 300, nadirHz: 49.0 },
  /** About 20 GWs of extra kinetic energy moves the nadir 0.1 Hz at 80 GWs (Ørum et al. 2017). */
  massForTenthHz: { kineticGWs: 80, extraGWs: 20 },
} as const;

export type Response = {
  nadirHz: number;
  nadirSeconds: number;
  /** Frequency every `sampleSeconds`, starting at t = 0. */
  trace: number[];
  sampleSeconds: number;
};

const DT = 0.005;

export function simulateTrip(
  params: GridParams,
  options: { seconds?: number; sampleSeconds?: number; model?: GridModel } = {},
): Response {
  const model = options.model ?? GRID_MODEL;
  const seconds = options.seconds ?? 30;
  const sampleSeconds = options.sampleSeconds ?? 0.1;
  const reserve = params.fastReserve;
  const energyMWs = params.kineticGWs * 1000;
  const steps = Math.round(seconds / DT);
  const every = Math.max(1, Math.round(sampleSeconds / DT));
  const deadSteps = Math.round(model.fcrdDeadSeconds / DT);
  const seen: number[] = [];

  const startHz = params.startHz ?? NOMINAL_HZ;
  let f = startHz;
  let fcrd = 0;
  let firedAt: number | null = null;
  let nadirHz = f;
  let nadirSeconds = 0;
  const trace: number[] = [];

  for (let k = 0; k < steps; k++) {
    const t = k * DT;
    if (k % every === 0) trace.push(f);
    seen.push(f);
    const delayed = seen[Math.max(0, seen.length - 1 - deadSteps)];
    const target = model.fcrdMW * Math.min(1, Math.max(0, (49.9 - delayed) / 0.4));
    fcrd += ((target - fcrd) * DT) / model.fcrdLagSeconds;
    if (reserve && firedAt === null && f <= reserve.activationHz) firedAt = t;
    const ffr =
      reserve && firedAt !== null ? reserve.mw * Math.min(1, (t - firedAt) / reserve.fullSeconds) : 0;
    const relief = (-model.loadMW * model.loadReliefPctPerHz * (f - startHz)) / 100;
    f += ((NOMINAL_HZ * (-params.lossMW + fcrd + ffr + relief)) / (2 * energyMWs)) * DT;
    if (f < nadirHz) {
      nadirHz = f;
      nadirSeconds = t + DT;
    }
  }
  return { nadirHz, nadirSeconds, trace, sampleSeconds };
}

/** Smallest FFR volume (MW, to `stepMW`) that holds `floorHz` for this loss and inertia. */
export function fastReserveNeeded(
  kineticGWs: number,
  lossMW: number,
  option: Omit<FastReserve, "mw"> = FFR_OPTIONS[1],
  floorHz = FLOOR_HZ,
  stepMW = 10,
): number {
  const holds = (mw: number) =>
    simulateTrip({ kineticGWs, lossMW, fastReserve: { ...option, mw } }).nadirHz >= floorHz;
  if (holds(0)) return 0;
  let lo = 0;
  let hi = 2000;
  if (!holds(hi)) return Infinity;
  while (hi - lo > stepMW) {
    const mid = (lo + hi) / 2;
    if (holds(mid)) hi = mid;
    else lo = mid;
  }
  return Math.ceil(hi / stepMW) * stepMW;
}
