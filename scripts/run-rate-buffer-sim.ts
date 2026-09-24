#!/usr/bin/env tsx
/**
 * Print reference-story simulation outputs (deterministic).
 * npm exec tsx scripts/run-rate-buffer-sim.ts
 */
import {
  runBaseCase,
  runSensitivityGrid,
} from "../src/lib/sim/rate-buffer-book";

function pct(x: number, digits = 1) {
  return `${(x * 100).toFixed(digits)}%`;
}

const base = runBaseCase();
const grid = runSensitivityGrid();

console.log(JSON.stringify({ base, grid }, null, 2));
console.log("\n--- story figures ---");
console.log(
  `Thin balance share: ${pct(base.before.thinBalanceShare)} → ${pct(base.after.thinBalanceShare)} (Δ new thin ${pct(base.delta.newThinBalanceShare)})`,
);
console.log(
  `New thin from bottom buffer tercile: ${pct(base.concentration.newThinFromBottomTercileShare)}`,
);
console.log(
  `Floating ∩ thin buffer (after) balance share: ${pct(base.actionableSlice.floatingThinBalanceShare)}`,
);
console.log("Sensitivity (new thin balance share):");
for (const cell of grid) {
  console.log(
    `  float ${pct(cell.floatingShare, 0)} / +${cell.shockBps}bp → new thin ${pct(cell.newThinBalanceShare)} | float∩thin ${pct(cell.floatingThinBalanceShare)}`,
  );
}
