#!/usr/bin/env tsx
/**
 * Freeze Evidence Pack figures for when-rates-rise (reproducible JSON).
 * Output: data/figures/when-rates-rise.v2.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { STORY_SIM } from "../src/lib/sim/rate-buffer-book";
import { CALIBRATION_V2 } from "../src/lib/sim/calibration";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "data", "figures", "when-rates-rise.v2.json");

const pack = {
  id: "when-rates-rise-evidence-v2",
  frozenAt: new Date().toISOString().slice(0, 10),
  calibration: CALIBRATION_V2,
  modeled: {
    kind: "calculated" as const,
    source: "src/lib/sim/rate-buffer-book.ts",
    assumptions: STORY_SIM.base.assumptions,
    thinBalanceShare: {
      before: STORY_SIM.base.before.thinBalanceShare,
      after: STORY_SIM.base.after.thinBalanceShare,
      display: {
        before: STORY_SIM.display.thinBefore,
        after: STORY_SIM.display.thinAfter,
      },
    },
    newThinBalanceShare: STORY_SIM.base.delta.newThinBalanceShare,
    newThinFromBottomTercile: STORY_SIM.base.concentration.newThinFromBottomTercileShare,
    floatingThinBalanceShare: STORY_SIM.base.actionableSlice.floatingThinBalanceShare,
    display: STORY_SIM.display,
    sensitivity: STORY_SIM.grid.filter((c) => c.shockBps === 300),
  },
  observed: [
    {
      id: "ces-housing-10-2",
      kind: "observed" as const,
      label: "CES housing costs +10.2% (Jul 2022–Jan 2024); HICP +5.5%",
      url: "https://www.ecb.europa.eu/press/economic-bulletin/focus/2024/html/ecb.ebbox202403_03~5527657e02.en.html",
    },
    {
      id: "ces-mortgagor-12",
      kind: "observed" as const,
      label: "Mortgagor housing costs ~+12% (same CES window)",
      url: "https://www.ecb.europa.eu/press/economic-bulletin/focus/2024/html/ecb.ebbox202403_03~5527657e02.en.html",
    },
    {
      id: "ces-late-mortgage",
      kind: "observed" as const,
      label: "CES expected late mortgage ~30% (low income, 2024 Q1)",
      url: "https://www.ecb.europa.eu/press/economic-bulletin/focus/2024/html/ecb.ebbox202403_03~5527657e02.en.html",
    },
    {
      id: "sector-dti",
      kind: "observed" as const,
      label: "Household debt-to-income 92.8%→87.0% (2022 Q4–2023 Q4)",
      url: "https://www.ecb.europa.eu/press/stats/ffi/html/ecb.eaefd_full2023q4~3d1fcaffef.en.html",
    },
  ],
  calculatedPublished: [
    {
      id: "wp3053-dsti",
      kind: "calculated" as const,
      label: "WP 3053: median DSTI +6 pp; share DSTI>40% 26%→33%",
      url: "https://www.ecb.europa.eu/pub/pdf/scpwps/ecb.wp3053~1f45ed3bc3.en.pdf",
      note: "Published simulation — rhyme target for book thin shares, not identical metric.",
    },
  ],
  mcpForRefresh: {
    recommended: "eu-finance (Global mcp.json) for ECB rates / Eurostat series",
    preferredBroader: "socioeconomic-data-mcp (self-host; Eurostat + ECB + FRED + …)",
    never: "Do not invent series in the story renderer — refresh this file then regenerate display copy.",
  },
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
console.log(`wrote ${out}`);
