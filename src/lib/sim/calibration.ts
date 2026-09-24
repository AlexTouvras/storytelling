/**
 * Moment-matched calibration targets for the illustrative book.
 * These rhyme with published euro-area summaries — they do NOT claim
 * the synthetic book IS HFCS / WP 3053. Labels stay "modeled / calibrated".
 *
 * Sources: ECB WP 3053 (DSTI path), CES housing burden, sector DTI.
 */

export type CalibrationMoments = {
  /** Rough pre-shock stressed share of unpaid balance (teaching thin). */
  thinBalanceShareBefore: { target: number; band: number };
  /** Post +300bp floater shock thin share. */
  thinBalanceShareAfter: { target: number; band: number };
  /** Floating share by unpaid balance — EUR adjustable exposure order-of-magnitude. */
  floatingShareByBalance: number;
  /** Shock size used as teaching pass-through (bps). */
  shockBps: number;
  notes: string[];
};

/**
 * Targets chosen so the book *intensifies* stress in the same direction as
 * WP 3053's DSTI>40% 26%→33% (+7pp) without equating thin-buffer to DSTI.
 */
export const CALIBRATION_V2: CalibrationMoments = {
  thinBalanceShareBefore: { target: 0.26, band: 0.04 },
  thinBalanceShareAfter: { target: 0.33, band: 0.04 },
  floatingShareByBalance: 0.35,
  shockBps: 300,
  notes: [
    "Thin-buffer (<10% residual income) is a teaching cut, not DSTI>40%.",
    "Before/after thin shares aim near WP 3053 DSTI>40% 26%→33% as a rhyme-check.",
    "Floating 35% by balance is an illustrative euro-area adjustable mix, not a census.",
    "CES housing +10.2% / mortgagor ~+12% remain observed evidence — not sim outputs.",
  ],
};

export function withinBand(
  value: number,
  target: number,
  band: number,
): boolean {
  return Math.abs(value - target) <= band;
}
