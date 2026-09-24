#!/usr/bin/env tsx
/**
 * Search thin-buffer cutoff for moment-matched calibration (v2).
 * Does not mutate the shipped base case until results are accepted.
 */
import { buildBook, shockBook } from "../src/lib/sim/rate-buffer-book";
import {
  CALIBRATION_V2,
  withinBand,
} from "../src/lib/sim/calibration";

function pct(x: number, d = 1) {
  return `${(x * 100).toFixed(d)}%`;
}

const n = 2000;
const seed = 42;
const float = CALIBRATION_V2.floatingShareByBalance;
const shock = CALIBRATION_V2.shockBps;
const book = buildBook({ n, seed, floatingShareByBalance: float });

const cuts = [0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.12];
console.log("target before", pct(CALIBRATION_V2.thinBalanceShareBefore.target));
console.log("target after ", pct(CALIBRATION_V2.thinBalanceShareAfter.target));
console.log("---");

let best: { cut: number; score: number; before: number; after: number; floatThin: number } | null =
  null;

for (const cut of cuts) {
  const r = shockBook(book, {
    shockBps: shock,
    thinBufferCutoff: cut,
    seed,
    floatingShareByBalance: float,
  });
  const before = r.before.thinBalanceShare;
  const after = r.after.thinBalanceShare;
  const score =
    Math.abs(before - CALIBRATION_V2.thinBalanceShareBefore.target) +
    Math.abs(after - CALIBRATION_V2.thinBalanceShareAfter.target);
  const ok =
    withinBand(
      before,
      CALIBRATION_V2.thinBalanceShareBefore.target,
      CALIBRATION_V2.thinBalanceShareBefore.band,
    ) &&
    withinBand(
      after,
      CALIBRATION_V2.thinBalanceShareAfter.target,
      CALIBRATION_V2.thinBalanceShareAfter.band,
    );
  console.log(
    `cut ${cut.toFixed(2)}  before ${pct(before)}  after ${pct(after)}  float∩thin ${pct(r.actionableSlice.floatingThinBalanceShare)}  ${ok ? "IN BAND" : ""}`,
  );
  if (!best || score < best.score) {
    best = {
      cut,
      score,
      before,
      after,
      floatThin: r.actionableSlice.floatingThinBalanceShare,
    };
  }
}

console.log("\nbest", best);
