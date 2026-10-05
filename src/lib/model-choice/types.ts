/** A model row frozen from the OpenRouter catalog. Prices are USD per token. */
export type CatalogModel = {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  inputModalities: string[];
  tools: boolean;
  promptPerToken: number;
  completionPerToken: number;
  longContext: {
    minPromptTokens: number;
    promptPerToken: number;
    completionPerToken: number;
  } | null;
  intelligenceIndex: number | null;
  codingIndex: number | null;
  agenticIndex: number | null;
};

export type WhichModelPack = {
  id: "which-model-v1";
  version: 1;
  fetchedAt: string;
  sourceUrl: string;
  benchmark: string;
  priceBasis: string;
  models: CatalogModel[];
};

export type QualityIndex = "intelligenceIndex" | "codingIndex" | "agenticIndex";

export type WeightKey = "quality" | "cost" | "context";

/** Integer shares. The scorer normalises them, and the page keeps them summing to 100. */
export type WeightShares = Record<WeightKey, number>;

export type Workload = {
  id: string;
  label: string;
  /** Plural noun for the volume control. */
  unit: string;
  blurb: string;
  index: QualityIndex;
  /** What the catalog calls this index, in sentence case. */
  indexName: string;
  requiresModality: "image" | null;
  requiresTools: boolean;
  inputTokens: number;
  outputTokens: number;
  volume: number;
  weights: WeightShares;
};

export type JobAssumptions = {
  inputTokens: number;
  outputTokens: number;
  volume: number;
};

export type ResolvedJob = Workload & JobAssumptions;

export type SitOutReason = "missing-index" | "context" | "modality" | "tools";

export type ScoredModel = {
  model: CatalogModel;
  eligible: boolean;
  reason: SitOutReason | null;
  /** The published index this job uses, when the model has one. */
  index: number | null;
  /** Uncached dollar cost of the whole workload. */
  cost: number;
  quality: number | null;
  costScore: number | null;
  contextScore: number | null;
  /** 0–1. Null when the model sits the job out. */
  fit: number | null;
};

export type ScoreResult = {
  job: ResolvedJob;
  /** Shares normalised to sum to 1. */
  weights: WeightShares;
  rows: ScoredModel[];
  eligible: ScoredModel[];
  winner: ScoredModel | null;
  runnerUp: ScoredModel | null;
  qualityLeader: ScoredModel | null;
  /** False when every eligible model has the same context score. */
  contextSeparates: boolean;
};
