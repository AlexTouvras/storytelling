import pack from "../../../data/figures/where-should-the-cutoff-sit.v1.json";
import type { MethodSection, StoryMethod } from "@/lib/reader/method";

const pct = (share: number, digits = 1) => `${(share * 100).toFixed(digits)}%`;
const n = (x: number) => x.toLocaleString("en-GB");

function data(): MethodSection {
  const s = pack.source;
  return {
    id: "data",
    title: "Data and sample",
    kind: "observed",
    blocks: [
      {
        type: "p",
        text: `${s.dataset} (${s.attribution}): ${pack.sample.display.fullN} applications in the full history, of which a stratified ${pack.sample.display.sampleN} are the working sample. Observed default rate in the sample: ${pack.sample.display.defaultRate}.`,
      },
      { type: "list", items: s.notes },
    ],
  };
}

function model(): MethodSection {
  return {
    id: "model",
    title: "The score",
    kind: "calculated",
    blocks: [
      {
        type: "p",
        text: `The champion is ${pack.model.champion}. It is trained on one period, tested on a held-out slice of it, and then judged on out-of-time applications from a later period. The out-of-time row is the one the film quotes.`,
      },
      {
        type: "table",
        columns: ["Sample", "Applications", "Gini", "AUC", "KS"],
        rows: pack.giniCompare.rows.map((r) => [r.Sample, n(r.N), pct(r.Gini), r.AUC.toFixed(3), r.KS.toFixed(3)]),
      },
      {
        type: "table",
        caption: `Calibration on out-of-time applications: mean predicted ${pct(pack.model.oot.calibMeanPredicted, 2)} against realised ${pct(pack.model.oot.calibMeanRealized, 2)}`,
        columns: ["Decile", "Applications", "Mean PD", "Realised default rate"],
        rows: pack.calibrationDeciles.rows.map((r) => [r.DecileLabel, n(r.N), pct(r.PredictedPD), pct(r.RealizedRate)]),
      },
      {
        type: "table",
        caption: "Grades the score is cut into",
        columns: ["Grade", "Applications", "Mean PD", "Default rate"],
        rows: pack.gradeBridge.rows.map((r) => [r.Grade, n(r.Applications), pct(r.AvgPD), pct(r.DefaultRate)]),
      },
    ],
  };
}

function policy(): MethodSection {
  const p = pack.policy;
  const rows = pack.frontier.points.filter((r) => typeof r.BadRateApproved === "number");
  return {
    id: "policy",
    title: "The gate",
    kind: "calculated",
    blocks: [
      {
        type: "p",
        text: `${p.operating.note} The appetite of ${p.appetite.display} and the loss-given-default of ${p.lgd.display} are illustrative inputs, not a bank's figures.`,
      },
      {
        type: "table",
        columns: ["Rule", "Gate (PD ≤)", "Approval, out of time", "Bad rate among approved"],
        left: [0],
        rows: [
          [p.operating.method, p.operating.display.cutoffPd, p.operating.display.approval, p.operating.display.badAmongApproved],
          [p.youdenReference.method, p.youdenReference.display.cutoffPd, p.youdenReference.display.approval, p.youdenReference.display.badAmongApproved],
        ],
      },
      {
        type: "table",
        caption: `${pack.frontier.description} Each row is one possible gate.`,
        columns: ["Gate (PD ≤)", "Approval", "Bad rate among approved", "Approved"],
        rows: rows.map((r) => [
          `${pct(r.CutoffPD, 0)}${r.IsOperatingCutoff ? " · operating" : ""}${r.IsYoudenCutoff ? " · Youden" : ""}`,
          pct(r.ApprovalRate),
          pct(r.BadRateApproved as number, 2),
          n(r.ApprovedN),
        ]),
      },
    ],
  };
}

function stability(): MethodSection {
  const psi = pack.psi;
  return {
    id: "stability",
    title: "Drift after go-live",
    kind: "calculated",
    blocks: [
      {
        type: "p",
        text: `Population stability index on the score's inputs, from the baseline year to a recent window. ${psi.breachCount} inputs breach and ${psi.watchCount} are on watch.`,
      },
      {
        type: "table",
        columns: ["Input", "PSI", "Flag", "Baseline", "Recent"],
        left: [0, 2, 4],
        rows: psi.features.map((f) => [f.Feature, f.PSI.toFixed(3), f.StabilityFlag, f.BaselineYear, f.RecentWindow]),
      },
    ],
  };
}

export const WHERE_SHOULD_THE_CUTOFF_SIT_METHOD: StoryMethod = {
  pack,
  schema: {
    id: "Pack name and version.",
    frozenAt: "The day the pack was frozen.",
    slug: "The story this pack belongs to.",
    decisionSpec: "The Decision Spec the story was written from.",
    source: "The dataset, its attribution, the champion model and notes on how the sample was cut.",
    sample: "Sample size, full history size and the observed default rate.",
    model: "The champion's ranking and calibration on train, test and out-of-time applications.",
    policy: "The appetite, the operating gate and the Youden reference gate, with approval and bad rate at each.",
    frontier: "Approval and bad rate at every gate from PD 2% upward: the acceptance frontier.",
    calibrationDeciles: "Mean predicted PD against realised default rate, by decile of score.",
    giniCompare: "Gini, AUC and KS for each sample.",
    gradeBridge: "The grades the score is cut into, with applications, mean PD, default rate and exposure.",
    psi: "Population stability index for each input, with its flag.",
    limitations: "What the pack cannot support.",
  },
  sections: () => [data(), model(), policy(), stability()],
};
