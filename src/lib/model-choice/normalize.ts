import type { CatalogModel, WhichModelPack } from "@/lib/model-choice/types";

/**
 * The rows this page scores. Order is the pack order.
 * One current shipping line per product, plus the cheaper sibling when the
 * catalog publishes a distinct one. Batch aliases, free aliases, and earlier
 * generations stay off the page.
 */
export const CURATED_IDS = [
  "anthropic/claude-opus-5.5",
  "anthropic/claude-opus-5",
  "anthropic/claude-sonnet-5.5",
  "anthropic/claude-fable-5.1",
  "openai/gpt-6-astra",
  "openai/gpt-6.1-sol",
  "openai/gpt-5.6-sol",
  "openai/gpt-5.6-terra",
  "openai/gpt-6-luna",
  "openai/gpt-5.6-luna",
  "x-ai/grok-4.7",
  "x-ai/grok-4.6",
  "google/gemini-3.8-flash",
  "deepseek/deepseek-v4.1-flash",
  "deepseek/deepseek-v4-flash",
  "deepseek/deepseek-v4-pro-0813",
  "deepseek/deepseek-v4-pro",
  "moonshotai/kimi-k3",
  "qwen/qwen3.8-max-0902",
  "qwen/qwen3.8-27b",
  "z-ai/glm-5.3",
  "z-ai/glm-5.3-flash",
  "xiaomi/mimo-v2.6-pro",
  "xiaomi/mimo-v2.6-flash",
  "meta/muse-spark-1.2",
  "minimax/minimax-m3",
  "mistralai/mistral-medium-3-5",
  "nvidia/nemotron-3-ultra-550b-a55b",
] as const;

export type SourceCatalog = {
  fetched_at: string;
  source_url: string;
  note: string;
  models: SourceModel[];
};

export type SourceModel = {
  id: string;
  name: string;
  context_length: number;
  input_modalities: string[];
  tools: boolean;
  pricing: {
    prompt: string;
    completion: string;
    overrides: {
      min_prompt_tokens: number;
      prompt: string;
      completion: string;
    }[];
  };
  benchmarks: {
    intelligence_index: number | null;
    coding_index: number | null;
    agentic_index: number | null;
  };
};

function fail(id: string, message: string): never {
  throw new Error(`${id}: ${message}`);
}

function perToken(raw: string, id: string, field: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) fail(id, `${field} is not a price (${raw})`);
  return n;
}

function indexValue(value: number | null, id: string, field: string): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) fail(id, `${field} is not a number`);
  return value;
}

function splitName(catalogName: string, id: string): { provider: string; name: string } {
  const idx = catalogName.indexOf(":");
  if (idx <= 0) fail(id, `catalog name has no provider prefix (${catalogName})`);
  const provider = catalogName.slice(0, idx).trim();
  const name = catalogName.slice(idx + 1).trim();
  if (!provider || !name) fail(id, `catalog name is incomplete (${catalogName})`);
  return { provider, name };
}

export function normalizeModel(source: SourceModel): CatalogModel {
  const { provider, name } = splitName(source.name, source.id);
  if (!Number.isInteger(source.context_length) || source.context_length <= 0) {
    fail(source.id, "context length is not a positive integer");
  }
  if (!Array.isArray(source.input_modalities) || source.input_modalities.length === 0) {
    fail(source.id, "input modalities are missing");
  }
  if (typeof source.tools !== "boolean") fail(source.id, "tools is not a boolean");
  const overrides = source.pricing.overrides ?? [];
  if (overrides.length > 1) fail(source.id, "more than one long-prompt override");
  const tier = overrides[0];
  if (tier && (!Number.isInteger(tier.min_prompt_tokens) || tier.min_prompt_tokens <= 0)) {
    fail(source.id, "long-prompt override has no minimum length");
  }
  return {
    id: source.id,
    name,
    provider,
    contextLength: source.context_length,
    inputModalities: [...source.input_modalities],
    tools: source.tools,
    promptPerToken: perToken(source.pricing.prompt, source.id, "prompt"),
    completionPerToken: perToken(source.pricing.completion, source.id, "completion"),
    longContext: tier
      ? {
          minPromptTokens: tier.min_prompt_tokens,
          promptPerToken: perToken(tier.prompt, source.id, "override prompt"),
          completionPerToken: perToken(tier.completion, source.id, "override completion"),
        }
      : null,
    intelligenceIndex: indexValue(source.benchmarks.intelligence_index, source.id, "intelligence"),
    codingIndex: indexValue(source.benchmarks.coding_index, source.id, "coding"),
    agenticIndex: indexValue(source.benchmarks.agentic_index, source.id, "agentic"),
  };
}

/** The frozen pack. Throws if the extract is not exactly the curated 14. */
export function freezePack(source: SourceCatalog): WhichModelPack {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source.fetched_at)) {
    throw new Error("fetched_at is not a date");
  }
  const byId = new Map(source.models.map((model) => [model.id, model]));
  if (byId.size !== source.models.length) throw new Error("duplicate model id in the extract");
  const expected = new Set<string>(CURATED_IDS);
  for (const id of byId.keys()) {
    if (!expected.has(id)) throw new Error(`unexpected model in the extract: ${id}`);
  }
  const models = CURATED_IDS.map((id) => {
    const row = byId.get(id);
    if (!row) throw new Error(`curated model missing from the extract: ${id}`);
    return normalizeModel(row);
  });
  return {
    id: "which-model-v1",
    version: 1,
    fetchedAt: source.fetched_at,
    sourceUrl: source.source_url,
    benchmark: "Artificial Analysis indices as published on the OpenRouter model catalog.",
    priceBasis:
      "Uncached prompt and completion, USD per token. When the catalog publishes a long-prompt override and the input length meets its minimum, that rate is used. Cache reads, batch rates, and web search are not in the cost.",
    models,
  };
}
