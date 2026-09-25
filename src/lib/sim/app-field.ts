/**
 * Seeded application cloud for the cut-off film.
 * Marks are illustrative projections matched to sample default rate (~8%);
 * published cut-off / OOT figures come from the frozen evidence pack.
 */

export const APP_FIELD_N = 2400;
export const APP_FIELD_SEED = 17;

export type AppPoint = {
  id: number;
  pd: number;
  score: number;
  grade: number;
  defaulted: boolean;
  /** 0–1 vertical jitter key */
  row: number;
};

export type AppFieldModel = {
  points: AppPoint[];
  featured: AppPoint;
  defaultRate: number;
  operatingCutoffPd: number;
  youdenCutoffPd: number;
  appetite: number;
};

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function gradeFromPd(pd: number): number {
  if (pd < 0.02) return 1;
  if (pd < 0.035) return 2;
  if (pd < 0.05) return 3;
  if (pd < 0.075) return 4;
  if (pd < 0.1) return 5;
  if (pd < 0.15) return 6;
  if (pd < 0.25) return 7;
  return 8;
}

function scoreFromPd(pd: number): number {
  // Rough master-scale rhyme with gold CutoffScore ~809 at PD 7.5%
  return Math.round(900 - Math.log(pd + 0.004) * 55);
}

export function buildAppField(
  n = APP_FIELD_N,
  seed = APP_FIELD_SEED,
): AppFieldModel {
  const rand = mulberry32(seed);
  const points: AppPoint[] = [];
  let defaults = 0;

  for (let i = 0; i < n; i++) {
    // Mixture: many low-PD apps, fat right tail — sample default ~8%
    const u = rand();
    const pd = Math.min(
      0.55,
      u < 0.72
        ? 0.008 + rand() * 0.05
        : u < 0.9
          ? 0.05 + rand() * 0.08
          : 0.12 + rand() * 0.35,
    );
    const defaulted = rand() < pd;
    if (defaulted) defaults += 1;
    points.push({
      id: i,
      pd,
      score: scoreFromPd(pd),
      grade: gradeFromPd(pd),
      defaulted,
      row: rand(),
    });
  }

  const featured =
    points.find((p) => p.pd >= 0.055 && p.pd <= 0.085 && !p.defaulted) ??
    points[Math.floor(n * 0.4)];

  return {
    points,
    featured,
    defaultRate: defaults / n,
    operatingCutoffPd: 0.075,
    youdenCutoffPd: 0.07,
    appetite: 0.04,
  };
}

export function clamp01(n: number) {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function approvalStats(points: AppPoint[], cutoffPd: number) {
  let approved = 0;
  let bad = 0;
  for (const p of points) {
    if (p.pd <= cutoffPd) {
      approved += 1;
      if (p.defaulted) bad += 1;
    }
  }
  return {
    approvalRate: approved / points.length,
    badRateApproved: approved === 0 ? 0 : bad / approved,
    approvedN: approved,
  };
}
