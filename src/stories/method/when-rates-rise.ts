import pack from "../../../data/figures/when-rates-rise.v2.json";
import type { MethodSection, StoryMethod } from "@/lib/reader/method";
import { buildField } from "@/lib/sim/book-field";
import { eur } from "@/components/film/format";

const pct = (share: number, digits = 1) => `${(share * 100).toFixed(digits)}%`;

function book(): MethodSection {
  const m = pack.modeled;
  const a = m.assumptions;
  const featured = buildField().featured;
  return {
    id: "book",
    title: "The modelled book",
    kind: "modelled",
    blocks: [
      {
        type: "p",
        text: `${a.n.toLocaleString("en-GB")} amortising mortgages drawn from seed ${a.seed}. ${pct(a.floatingShareByBalance, 0)} of unpaid balance is floating, given to the largest balances until that share is met. A +${a.shockBps} basis point shock reprices floating coupons only; every payment is recomputed from the amortising formula. A loan is thin when less than ${pct(a.thinBufferCutoff, 0)} of income is left after essentials and the mortgage.`,
      },
      {
        type: "table",
        caption: "What the shock does to the book, by unpaid balance",
        columns: ["Measure", "Value"],
        left: [0],
        rows: [
          ["Thin share, before the shock", pct(m.thinBalanceShare.before)],
          ["Thin share, after the shock", pct(m.thinBalanceShare.after)],
          ["Newly thin", pct(m.newThinBalanceShare)],
          ["Newly thin that were already in the weakest third of buffers", pct(m.newThinFromBottomTercile)],
          ["Sleeve: floating and thin after the shock", pct(m.floatingThinBalanceShare)],
          ["Median buffer, before → after", `${m.display.medianBufferBefore} → ${m.display.medianBufferAfter}`],
        ],
      },
      {
        type: "table",
        caption: `The same shock with a different floating mix (+${a.shockBps} basis points)`,
        columns: ["Floating share", "Newly thin", "Sleeve"],
        rows: m.sensitivity.map((row) => [pct(row.floatingShare, 0), pct(row.newThinBalanceShare), pct(row.floatingThinBalanceShare)]),
      },
      {
        type: "p",
        text: `The loan the film follows is loan ${featured.id}: floating, ${eur(featured.balance)} unpaid, ${eur(featured.incomeMonthly)} a month in, ${eur(featured.essentialsMonthly)} on essentials. Its payment goes from ${eur(featured.paymentBefore)} to ${eur(featured.paymentAfter)}, and its buffer from ${eur(featured.bufferBefore)} to ${eur(featured.bufferAfter)}.`,
      },
      { type: "code", text: "npx tsx scripts/run-rate-buffer-sim.ts\nnpx tsx scripts/calibrate-rate-buffer.ts" },
    ],
  };
}

function calibration(): MethodSection {
  const c = pack.calibration;
  const band = (t: { target: number; band: number }) => `${pct(t.target, 0)} ± ${pct(t.band, 0)}`;
  return {
    id: "calibration",
    title: "What the book was tuned to",
    kind: "published",
    blocks: [
      {
        type: "p",
        text: "The thin line was chosen so the book's thin shares land near ECB Working Paper 3053's rise in borrowers spending more than 40% of income on debt. That is a rhyme check, not the same metric: the book measures money left over, the paper measures the share of income spent on debt.",
      },
      {
        type: "table",
        columns: ["Target", "Aim", "Book"],
        left: [0],
        rows: [
          ["Thin share before the shock", band(c.thinBalanceShareBefore), pct(pack.modeled.thinBalanceShare.before)],
          ["Thin share after the shock", band(c.thinBalanceShareAfter), pct(pack.modeled.thinBalanceShare.after)],
        ],
      },
    ],
  };
}

function evidence(): MethodSection {
  const rows = [...pack.observed, ...pack.calculatedPublished];
  return {
    id: "evidence",
    title: "The euro-area check",
    kind: "observed",
    blocks: [
      {
        type: "p",
        text: "These figures are not outputs of the book. They are quoted from the ECB to test whether the direction the model shows, payments up and buffers down, happened after 2022.",
      },
      {
        type: "table",
        columns: ["Figure", "Kind", "Source"],
        left: [0, 1, 2],
        rows: rows.map((row) => [row.label, row.id === "wp3053-dsti" ? "published simulation" : row.kind, row.url]),
      },
    ],
  };
}

export const WHEN_RATES_RISE_METHOD: StoryMethod = {
  pack,
  schema: {
    id: "Pack name and version.",
    frozenAt: "The day the pack was frozen.",
    calibration: "The published targets the thin line was tuned to rhyme with, and the shock size and floating share.",
    modeled: "The seeded book's settings, what the shock does to it, and the same shock at three floating mixes.",
    observed: "Euro-area figures quoted from ECB surveys and sector accounts, each with its link.",
    calculatedPublished: "The ECB working paper's simulated debt-service figures the book is checked against.",
    mcpForRefresh: "Which data connections to use when the pack is refreshed. Not shown in the film.",
  },
  sections: () => [book(), calibration(), evidence()],
};
