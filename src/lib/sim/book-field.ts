/**
 * Loan-level projection of the illustrative book for the directed film.
 * Aggregates come from `shockBook` so the picture and the published
 * percentages describe the same run.
 */

import {
  buildBook,
  shockBook,
  snapshot,
  type BookShockResult,
} from "@/lib/sim/rate-buffer-book";

export const FIELD_N = 2000;
export const FIELD_SEED = 42;
export const FIELD_CUTOFF = 0.06;

export type FieldPoint = {
  id: number;
  floating: boolean;
  balance: number;
  incomeMonthly: number;
  essentialsMonthly: number;
  paymentBefore: number;
  paymentAfter: number;
  bufferBefore: number;
  bufferAfter: number;
  shareBefore: number;
  shareAfter: number;
};

export type FieldModel = {
  summary: BookShockResult;
  points: FieldPoint[];
  featured: FieldPoint;
};

export function buildField(
  floatingShareByBalance = 0.35,
  shockBps = 300,
): FieldModel {
  const book = buildBook({
    n: FIELD_N,
    seed: FIELD_SEED,
    floatingShareByBalance,
  });
  const summary = shockBook(book, {
    shockBps,
    thinBufferCutoff: FIELD_CUTOFF,
    seed: FIELD_SEED,
    floatingShareByBalance,
    label: `film-${floatingShareByBalance}-${shockBps}`,
  });
  const shock = shockBps / 10_000;
  const points: FieldPoint[] = book.map((b) => {
    const before = snapshot(b, b.annualRate, FIELD_CUTOFF);
    const afterRate =
      b.rateType === "floating" ? b.annualRate + shock : b.annualRate;
    const after = snapshot(b, afterRate, FIELD_CUTOFF);
    return {
      id: b.id,
      floating: b.rateType === "floating",
      balance: b.balance,
      incomeMonthly: b.incomeMonthly,
      essentialsMonthly: b.essentialsMonthly,
      paymentBefore: before.payment,
      paymentAfter: after.payment,
      bufferBefore: before.buffer,
      bufferAfter: after.buffer,
      shareBefore: before.bufferShareOfIncome,
      shareAfter: after.bufferShareOfIncome,
    };
  });

  return {
    summary,
    points,
    featured: pickFeatured(points),
  };
}

/**
 * A floating loan that still has residual room, then loses it at +300bp.
 * Largest balance wins — that is the name a portfolio manager would notice.
 */
export function pickFeatured(points: FieldPoint[]): FieldPoint {
  const strict = points.filter(
    (p) =>
      p.floating &&
      p.shareBefore >= 0.09 &&
      p.shareBefore <= 0.18 &&
      p.shareAfter < FIELD_CUTOFF &&
      p.bufferBefore > 250 &&
      p.incomeMonthly >= 2800 &&
      p.incomeMonthly <= 5600,
  );
  const crossed = points.filter(
    (p) => p.floating && p.shareBefore >= FIELD_CUTOFF && p.shareAfter < FIELD_CUTOFF,
  );
  const pool = strict.length > 0 ? strict : crossed.length > 0 ? crossed : points;
  return pool.reduce((best, p) => (p.balance > best.balance ? p : best));
}

export function shareAt(point: FieldPoint, shockT: number): number {
  if (!point.floating) return point.shareBefore;
  const t = clamp01(shockT);
  return point.shareBefore + (point.shareAfter - point.shareBefore) * t;
}

export function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
