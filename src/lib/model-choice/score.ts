import type {
  CatalogModel,
  JobAssumptions,
  QualityIndex,
  ResolvedJob,
  ScoredModel,
  ScoreResult,
  SitOutReason,
  WeightKey,
  WeightShares,
  Workload,
} from "@/lib/model-choice/types";

const WEIGHT_KEYS: WeightKey[] = ["quality", "cost", "context"];

/** A window twice the prompt scores 1. Shorter than the prompt scores 0 and sits out. */
export function contextScore(contextLength: number, inputTokens: number): number {
  if (inputTokens <= 0) return 1;
  if (contextLength < inputTokens) return 0;
  return Math.min(1, Math.max(0, contextLength / inputTokens - 1));
}

export function unitPrices(
  model: CatalogModel,
  inputTokens: number,
): { prompt: number; completion: number } {
  const tier = model.longContext;
  if (tier && inputTokens >= tier.minPromptTokens) {
    return { prompt: tier.promptPerToken, completion: tier.completionPerToken };
  }
  return { prompt: model.promptPerToken, completion: model.completionPerToken };
}

/** Uncached cost of one item. Input length selects the long-prompt rate when one is published. */
export function itemCost(model: CatalogModel, inputTokens: number, outputTokens: number): number {
  const prices = unitPrices(model, inputTokens);
  return inputTokens * prices.prompt + outputTokens * prices.completion;
}

export function workloadCost(model: CatalogModel, job: JobAssumptions): number {
  return itemCost(model, job.inputTokens, job.outputTokens) * job.volume;
}

export function sitOut(model: CatalogModel, job: ResolvedJob): SitOutReason | null {
  if (job.requiresModality && !model.inputModalities.includes(job.requiresModality)) return "modality";
  if (job.requiresTools && !model.tools) return "tools";
  if (model.contextLength < job.inputTokens) return "context";
  if (model[job.index] == null) return "missing-index";
  return null;
}

export function normaliseWeights(weights: WeightShares): WeightShares {
  const sum = weights.quality + weights.cost + weights.context;
  if (!(sum > 0)) return { quality: 1, cost: 0, context: 0 };
  return {
    quality: weights.quality / sum,
    cost: weights.cost / sum,
    context: weights.context / sum,
  };
}

/**
 * Move one share and scale the others so the three still sum to 100.
 * `next` is clamped to 0–100 and rounded.
 */
export function retargetWeight(weights: WeightShares, key: WeightKey, next: number): WeightShares {
  const clamped = Math.min(100, Math.max(0, Math.round(next)));
  const others = WEIGHT_KEYS.filter((item) => item !== key);
  const rest = 100 - clamped;
  const out: WeightShares = { ...weights, [key]: clamped };
  if (rest === 0) {
    for (const item of others) out[item] = 0;
    return out;
  }
  const otherSum = others.reduce((sum, item) => sum + weights[item], 0);
  if (otherSum <= 0) {
    const base = Math.floor(rest / others.length);
    const leftover = rest - base * others.length;
    others.forEach((item, index) => {
      out[item] = base + (index < leftover ? 1 : 0);
    });
    return out;
  }
  const raw = others.map((item) => (weights[item] / otherSum) * rest);
  const floored = raw.map((value) => Math.floor(value));
  let leftover = rest - floored.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, frac: value - floored[index] }))
    .sort((a, b) => b.frac - a.frac);
  for (const entry of order) {
    if (leftover <= 0) break;
    floored[entry.index] += 1;
    leftover -= 1;
  }
  others.forEach((item, index) => {
    out[item] = floored[index];
  });
  return out;
}

function resolve(workload: Workload, assumptions: JobAssumptions): ResolvedJob {
  return {
    ...workload,
    inputTokens: assumptions.inputTokens,
    outputTokens: assumptions.outputTokens,
    volume: assumptions.volume,
  };
}

function byFit(a: ScoredModel, b: ScoredModel): number {
  const fit = (b.fit ?? -1) - (a.fit ?? -1);
  if (fit !== 0) return fit;
  const cost = a.cost - b.cost;
  if (cost !== 0) return cost;
  return a.model.id < b.model.id ? -1 : 1;
}

export function scoreWorkload(
  models: readonly CatalogModel[],
  workload: Workload,
  weights: WeightShares,
  assumptions: JobAssumptions = workload,
): ScoreResult {
  const job = resolve(workload, assumptions);
  const shares = normaliseWeights(weights);
  const drafted: ScoredModel[] = models.map((model) => {
    const reason = sitOut(model, job);
    const index = model[job.index as QualityIndex];
    return {
      model,
      eligible: reason == null,
      reason,
      index,
      cost: workloadCost(model, job),
      quality: null,
      costScore: null,
      contextScore: null,
      fit: null,
    };
  });

  const eligible = drafted.filter((row) => row.eligible);
  const maxIndex = Math.max(0, ...eligible.map((row) => row.index ?? 0));
  const costs = eligible.map((row) => row.cost);
  const maxCost = costs.length ? Math.max(...costs) : 0;
  const minCost = costs.length ? Math.min(...costs) : 0;
  // Log distance, so one very dear model does not flatten the cheaper ones together.
  const logHi = Math.log(Math.max(maxCost, 1e-12));
  const logLo = Math.log(Math.max(minCost, 1e-12));
  const logSpan = logHi - logLo;

  for (const row of eligible) {
    const quality = maxIndex > 0 ? (row.index ?? 0) / maxIndex : 0;
    const costScore = logSpan > 1e-12 ? (logHi - Math.log(Math.max(row.cost, 1e-12))) / logSpan : 1;
    const context = contextScore(row.model.contextLength, job.inputTokens);
    row.quality = quality;
    row.costScore = costScore;
    row.contextScore = context;
    row.fit = shares.quality * quality + shares.cost * costScore + shares.context * context;
  }

  const ranked = [...eligible].sort(byFit);
  const sitting = drafted
    .filter((row) => !row.eligible)
    .sort((a, b) => a.model.name.localeCompare(b.model.name));
  const contextScores = ranked.map((row) => row.contextScore ?? 0);
  const contextSeparates =
    contextScores.length > 1 && Math.max(...contextScores) - Math.min(...contextScores) > 1e-9;
  const qualityLeader =
    [...ranked].sort((a, b) => (b.index ?? 0) - (a.index ?? 0) || a.model.id.localeCompare(b.model.id))[0] ??
    null;

  return {
    job,
    weights: shares,
    rows: [...ranked, ...sitting],
    eligible: ranked,
    winner: ranked[0] ?? null,
    runnerUp: ranked[1] ?? null,
    qualityLeader,
    contextSeparates,
  };
}
