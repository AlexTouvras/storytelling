import { fitLabel, indexText, usd } from "@/lib/model-choice/format";
import type { ScoreResult, ScoredModel, SitOutReason, WeightShares } from "@/lib/model-choice/types";

export type RecommendationCopy = {
  name: string;
  fit: string;
  lead: string;
  comparisons: string[];
  sittingOut: string | null;
  contextNote: string | null;
};

const REASON: Record<SitOutReason, (indexName: string) => string> = {
  "missing-index": (indexName) => `no ${indexName} in this snapshot`,
  context: () => "a context window shorter than the prompt",
  modality: () => "no image input on the catalog row",
  tools: () => "no tool calling on the catalog row",
};

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function sittingOut(result: ScoreResult): string | null {
  const groups = new Map<SitOutReason, string[]>();
  for (const row of result.rows) {
    if (!row.reason) continue;
    const names = groups.get(row.reason) ?? [];
    names.push(row.model.name);
    groups.set(row.reason, names);
  }
  if (groups.size === 0) return null;
  const sentences = [...groups.entries()].map(([reason, names]) => {
    const because = REASON[reason](result.job.indexName);
    if (names.length === 1) return `${names[0]} sits this job out: ${because}.`;
    return `${joinNames(names)} sit this job out: ${because}.`;
  });
  return sentences.join(" ");
}

function qualityLine(result: ScoreResult, winner: ScoredModel): string | null {
  const leader = result.qualityLeader;
  if (!leader || leader.index == null || winner.index == null) return null;
  if (leader.model.id === winner.model.id) {
    return `${winner.model.name} also leads the ${result.job.indexName} in this set, at ${indexText(winner.index)}.`;
  }
  return `${leader.model.name} leads the ${result.job.indexName} at ${indexText(leader.index)}. On this workload it costs ${usd(leader.cost)}, against ${usd(winner.cost)} for ${winner.model.name}.`;
}

function runnerLine(result: ScoreResult, winner: ScoredModel): string | null {
  const runner = result.runnerUp;
  if (!runner || runner.fit == null || winner.fit == null) return null;
  const gap = (winner.fit - runner.fit) * 100;
  if (gap < 1) return `${runner.model.name} is ${gap.toFixed(1)} fit points behind.`;
  return `${runner.model.name} is next, at fit ${fitLabel(runner.fit)}.`;
}

export function recommendationCopy(result: ScoreResult): RecommendationCopy {
  const sitting = sittingOut(result);
  const contextNote =
    result.winner && !result.contextSeparates && result.weights.context > 0
      ? "Context adds the same amount to every model that can take this job: each window is at least twice the prompt."
      : null;

  const winner = result.winner;
  const fit = winner?.fit;
  if (!winner || fit == null) {
    return {
      name: "No model fits",
      fit: "—",
      lead: "No model on this page can take a prompt of this length.",
      comparisons: [],
      sittingOut: sitting,
      contextNote: null,
    };
  }

  const comparisons = [qualityLine(result, winner), runnerLine(result, winner)].filter(
    (line): line is string => Boolean(line),
  );
  return {
    name: winner.model.name,
    fit: fitLabel(fit),
    lead: `${winner.model.name} fits this ${result.job.label.toLowerCase()} job best of the ${result.rows.length} models on this page, at ${usd(winner.cost)}.`,
    comparisons,
    sittingOut: sitting,
    contextNote,
  };
}

export function formulaLine(weights: WeightShares): string {
  return `Fit = ${weights.quality}% quality + ${weights.cost}% cost + ${weights.context}% context`;
}

export const FORMULA_NOTES = {
  quality:
    "Quality is this job's published index, divided by the highest index among models that can take the job.",
  cost: "Cost is the uncached dollar total, scored on a log scale from the cheapest eligible model (1) to the dearest (0). The dollars themselves are shown unscaled.",
  context: "Context is headroom over the prompt. A window twice the prompt scores 1.",
} as const;
