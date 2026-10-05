import { CURATED_IDS, type SourceCatalog, type SourceModel } from "@/lib/model-choice/normalize";

const SOURCE_URL = "https://openrouter.ai/api/v1/models";

const NOTE =
  "Trimmed extract of the curated catalog rows. Prompt and completion are USD per token. Overrides are the catalog's long-prompt rates. Cache, batch, image, audio, and web-search prices were not copied. Benchmarks are Artificial Analysis indices as carried on the catalog response.";

export type OpenRouterCatalog = {
  data?: OpenRouterModel[];
};

export type OpenRouterModel = {
  id?: string;
  name?: string;
  context_length?: number;
  architecture?: { input_modalities?: string[] };
  pricing?: {
    prompt?: string;
    completion?: string;
    overrides?: OpenRouterOverride[];
  };
  supported_parameters?: string[];
  benchmarks?: {
    artificial_analysis?: {
      intelligence_index?: number | null;
      coding_index?: number | null;
      agentic_index?: number | null;
    };
  };
};

type OpenRouterOverride = {
  min_prompt_tokens?: number;
  prompt?: string;
  completion?: string;
};

function fail(message: string): never {
  throw new Error(message);
}

function price(raw: string | undefined, id: string, field: string): string {
  if (raw == null || raw === "") fail(`${id}: ${field} is missing`);
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) fail(`${id}: ${field} is not a price (${raw})`);
  return raw;
}

function index(value: number | null | undefined, id: string, field: string): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) fail(`${id}: ${field} is not a number`);
  return value;
}

function trimModel(model: OpenRouterModel): SourceModel {
  const id = model.id ?? "(missing id)";
  if (!model.name) fail(`${id}: catalog name is missing`);
  if (!Number.isInteger(model.context_length) || (model.context_length ?? 0) <= 0) {
    fail(`${id}: context length is not a positive integer`);
  }
  const modalities = model.architecture?.input_modalities;
  if (!Array.isArray(modalities) || modalities.length === 0) {
    fail(`${id}: input modalities are missing`);
  }
  const overrides = model.pricing?.overrides ?? [];
  if (overrides.length > 1) fail(`${id}: more than one long-prompt override`);
  const tier = overrides[0];
  if (tier && (!Number.isInteger(tier.min_prompt_tokens) || (tier.min_prompt_tokens ?? 0) <= 0)) {
    fail(`${id}: long-prompt override has no minimum length`);
  }
  const aa = model.benchmarks?.artificial_analysis;
  return {
    id,
    name: model.name,
    context_length: model.context_length as number,
    input_modalities: [...modalities],
    tools: Array.isArray(model.supported_parameters) && model.supported_parameters.includes("tools"),
    pricing: {
      prompt: price(model.pricing?.prompt, id, "prompt"),
      completion: price(model.pricing?.completion, id, "completion"),
      overrides: tier
        ? [
            {
              min_prompt_tokens: tier.min_prompt_tokens as number,
              prompt: price(tier.prompt, id, "override prompt"),
              completion: price(tier.completion, id, "override completion"),
            },
          ]
        : [],
    },
    benchmarks: {
      intelligence_index: index(aa?.intelligence_index, id, "intelligence"),
      coding_index: index(aa?.coding_index, id, "coding"),
      agentic_index: index(aa?.agentic_index, id, "agentic"),
    },
  };
}

/**
 * Keep the curated rows and drop everything else the catalog sends.
 * A missing id fails the refresh. An index the catalog left null stays null.
 */
export function trimCatalog(payload: OpenRouterCatalog, fetchedAt: string): SourceCatalog {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fetchedAt)) fail("fetched_at is not a date");
  const rows = payload.data;
  if (!Array.isArray(rows)) fail("catalog response has no data array");
  const byId = new Map<string, OpenRouterModel>();
  for (const row of rows) {
    if (row.id) byId.set(row.id, row);
  }
  const missing = CURATED_IDS.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    fail(`curated model missing from the catalog: ${missing.join(", ")}`);
  }
  return {
    fetched_at: fetchedAt,
    source_url: SOURCE_URL,
    note: NOTE,
    models: CURATED_IDS.map((id) => trimModel(byId.get(id) as OpenRouterModel)),
  };
}
