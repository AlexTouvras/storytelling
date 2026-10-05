import { describe, expect, it } from "vitest";
import source from "../../../data/sources/openrouter-which-model-2026-10-05.json";
import liveSource from "../../../data/sources/openrouter-which-model.json";
import pack from "../../../data/figures/which-model.v1.json";
import { recommendationCopy } from "@/lib/model-choice/copy";
import { trimCatalog, type OpenRouterModel } from "@/lib/model-choice/extract";
import { fieldScale } from "@/lib/model-choice/field";
import { usd } from "@/lib/model-choice/format";
import { CURATED_IDS, freezePack, type SourceCatalog } from "@/lib/model-choice/normalize";
import { retargetWeight, scoreWorkload, unitPrices, workloadCost } from "@/lib/model-choice/score";
import type { WhichModelPack } from "@/lib/model-choice/types";
import { VOLUME_PRESETS, WORKLOADS, weightsSum, workloadById } from "@/lib/model-choice/workloads";

const frozen = pack as WhichModelPack;
const extract = source as SourceCatalog;
const models = freezePack(extract).models;
const live = liveSource as SourceCatalog;

function catalogRow(id: string, patch: Partial<OpenRouterModel> = {}): OpenRouterModel {
  return {
    id,
    name: `Provider: ${id}`,
    context_length: 128_000,
    architecture: { input_modalities: ["text"] },
    pricing: { prompt: "0.000001", completion: "0.000002" },
    supported_parameters: ["tools"],
    benchmarks: { artificial_analysis: { intelligence_index: 10, coding_index: null, agentic_index: 4 } },
    ...patch,
  };
}

function scored(id: string, weights = workloadById(id).weights) {
  return scoreWorkload(models, workloadById(id), weights);
}

describe("which-model pack", () => {
  it("freezes the dated extract the formula tests pin", () => {
    expect(extract.fetched_at).toBe("2026-10-05");
    expect(models).toHaveLength(CURATED_IDS.length);
    for (const model of models) {
      expect(model.promptPerToken).toBeGreaterThan(0);
      expect(model.completionPerToken).toBeGreaterThan(0);
      expect(model.contextLength).toBeGreaterThan(0);
    }
  });

  it("freezes the living extract into the pack the page renders", () => {
    expect(freezePack(live)).toEqual(frozen);
    expect(frozen.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(frozen.models.map((model) => model.id)).toEqual([...CURATED_IDS]);
  });

  it("keeps Claude Opus 5.5 as the published intelligence leader, with no coding index", () => {
    const opus = models.find((model) => model.id === "anthropic/claude-opus-5.5");
    expect(opus?.intelligenceIndex).toBe(57.6);
    expect(opus?.codingIndex).toBeNull();
    expect(opus?.promptPerToken).toBe(0.000004);
  });
});

describe("workload score", () => {
  it("gives every opening weight triple a total of 100", () => {
    for (const workload of WORKLOADS) expect(weightsSum(workload.weights)).toBe(100);
  });

  it("sits Opus out of coding, and does not hand the job to the coding-index leader", () => {
    const result = scored("coding");
    const opus = result.rows.find((row) => row.model.id === "anthropic/claude-opus-5.5");
    const fable = result.rows.find((row) => row.model.id === "anthropic/claude-fable-5.1");
    expect(opus?.reason).toBe("missing-index");
    expect(result.qualityLeader?.model.id).toBe("anthropic/claude-fable-5.1");
    expect(result.winner?.model.id).toBe("z-ai/glm-5.3-flash");
    expect(fable?.eligible).toBe(true);
    expect(fable?.fit).toBeLessThan(result.winner?.fit ?? 0);
  });

  it("picks Sonnet for the reasoning job while Opus still leads the index", () => {
    const result = scored("reasoning");
    expect(result.qualityLeader?.model.id).toBe("anthropic/claude-opus-5.5");
    expect(result.winner?.model.id).toBe("anthropic/claude-sonnet-5.5");
  });

  it("picks the cheapest eligible model when the job is classification", () => {
    const result = scored("classification");
    const cheapest = [...result.eligible].sort((a, b) => a.cost - b.cost)[0];
    expect(result.winner?.model.id).toBe(cheapest?.model.id);
    expect(result.winner?.model.id).toBe("deepseek/deepseek-v4-flash");
  });

  it("keeps a model with a coding index in the coding job when its newer sibling has none", () => {
    const result = scored("coding");
    const grok47 = result.rows.find((row) => row.model.id === "x-ai/grok-4.7");
    const grok46 = result.rows.find((row) => row.model.id === "x-ai/grok-4.6");
    const opus5 = result.rows.find((row) => row.model.id === "anthropic/claude-opus-5");
    expect(grok47?.reason).toBe("missing-index");
    expect(grok46?.eligible).toBe(true);
    expect(opus5?.eligible).toBe(true);
  });

  it("sits a window shorter than the packet out of the long-context job", () => {
    const result = scored("long-context");
    const mistral = result.rows.find((row) => row.model.id === "mistralai/mistral-medium-3-5");
    expect(mistral?.reason).toBe("context");
    expect(result.eligible.length).toBeLessThan(result.rows.length);
  });

  it("picks GLM 5.3 Flash for document extraction, ahead of the dearer GLM 5.3", () => {
    const result = scored("extraction");
    expect(result.winner?.model.id).toBe("z-ai/glm-5.3-flash");
    expect(result.runnerUp?.model.id).toBe("z-ai/glm-5.3");
    expect(result.qualityLeader?.model.id).toBe("anthropic/claude-fable-5.1");
  });

  it("picks GLM 5.3 for a long packet, where its input price beats the cheaper output model", () => {
    const result = scored("long-context");
    expect(result.winner?.model.id).toBe("z-ai/glm-5.3");
    expect(result.qualityLeader?.model.id).toBe("anthropic/claude-opus-5.5");
  });

  it("follows a quality-only weight to the index leader", () => {
    const result = scoreWorkload(models, workloadById("classification"), {
      quality: 100,
      cost: 0,
      context: 0,
    });
    expect(result.winner?.model.id).toBe("anthropic/claude-opus-5.5");
  });

  it("scores cost on a log scale between the cheapest and dearest eligible models", () => {
    const result = scored("classification");
    const costs = result.eligible.map((row) => row.cost);
    const lo = Math.log(Math.min(...costs));
    const hi = Math.log(Math.max(...costs));
    for (const row of result.eligible) {
      const expected = (hi - Math.log(row.cost)) / (hi - lo);
      expect(row.costScore).toBeCloseTo(expected, 8);
    }
  });

  it("scales the workload cost in proportion to the volume", () => {
    const model = models[0];
    const job = workloadById("extraction");
    const once = workloadCost(model, { ...job, volume: 1 });
    const many = workloadCost(model, { ...job, volume: 10_000 });
    expect(many).toBeCloseTo(once * 10_000, 8);
  });

  it("uses the published long-prompt rate once the prompt clears the catalog minimum", () => {
    const sol = models.find((model) => model.id === "openai/gpt-5.6-sol");
    const grok = models.find((model) => model.id === "x-ai/grok-4.7");
    expect(sol && unitPrices(sol, 8_000).prompt).toBe(0.000002);
    expect(sol && unitPrices(sol, 272_000).prompt).toBe(0.000004);
    expect(grok && unitPrices(grok, 199_999).prompt).toBe(0.000002);
    expect(grok && unitPrices(grok, 200_000).prompt).toBe(0.000004);
  });

  it("sits a text-only model out of the multimodal job", () => {
    const result = scored("multimodal");
    const textOnly = result.rows.find((row) => row.model.id === "deepseek/deepseek-v4-pro");
    expect(textOnly?.reason).toBe("modality");
  });

  it("sits every model out when the prompt is longer than every window", () => {
    const result = scoreWorkload(models, workloadById("reasoning"), workloadById("reasoning").weights, {
      inputTokens: 2_000_000,
      outputTokens: 100,
      volume: 10,
    });
    expect(result.winner).toBeNull();
    expect(result.eligible).toHaveLength(0);
  });

  it("keeps retargeted weights on 100", () => {
    let weights = workloadById("extraction").weights;
    weights = retargetWeight(weights, "cost", 80);
    weights = retargetWeight(weights, "quality", 0);
    weights = retargetWeight(weights, "context", 100);
    expect(weightsSum(weights)).toBe(100);
    expect(weights.context).toBe(100);
    expect(weights.quality).toBe(0);
    expect(weights.cost).toBe(0);
  });
});

describe("recommendation copy", () => {
  it("names the winner, quotes a cost the scorer produced, and never says optimal", () => {
    for (const workload of WORKLOADS) {
      const result = scored(workload.id);
      const copy = recommendationCopy(result);
      const text = [copy.lead, ...copy.comparisons, copy.sittingOut ?? ""].join(" ");
      expect(text.toLowerCase()).not.toContain("optimal");
      expect(text.toLowerCase()).not.toContain("latency");
      expect(text.toLowerCase()).not.toContain("tokens/sec");
      expect(copy.name).toBe(result.winner?.model.name);
      if (result.winner) expect(text).toContain(usd(result.winner.cost));
    }
  });

  it("says when the index leader is not the model that fits", () => {
    const copy = recommendationCopy(scored("reasoning"));
    expect(copy.lead).toContain("Claude Sonnet 5.5");
    expect(copy.comparisons.join(" ")).toContain("Claude Opus 5.5 leads the intelligence index");
  });
});

describe("field scale", () => {
  it("puts a higher cost to the right and a higher index higher up", () => {
    const scale = fieldScale([
      { id: "cheap", cost: 10, index: 20 },
      { id: "dear", cost: 1_000, index: 50 },
    ]);
    const cheap = scale.placed.find((point) => point.id === "cheap");
    const dear = scale.placed.find((point) => point.id === "dear");
    expect(cheap && dear && cheap.x).toBeLessThan(dear!.x);
    expect(cheap && dear && cheap.y).toBeGreaterThan(dear!.y);
  });
});

describe("catalog trim", () => {
  it("keeps the curated 14 and drops the rest of the catalog", () => {
    const extra: OpenRouterModel = catalogRow("other/model");
    const trimmed = trimCatalog(
      { data: [...CURATED_IDS.map((id) => catalogRow(id)), extra] },
      "2026-10-05",
    );
    expect(trimmed.models.map((model) => model.id)).toEqual([...CURATED_IDS]);
    expect(trimmed.fetched_at).toBe("2026-10-05");
  });

  it("keeps a null index and a single long-prompt override, without cache prices", () => {
    const row = catalogRow(CURATED_IDS[0], {
      pricing: {
        prompt: "0.000002",
        completion: "0.00001",
        overrides: [
          {
            min_prompt_tokens: 272000,
            prompt: "0.000004",
            completion: "0.000015",
          },
        ],
      },
      benchmarks: { artificial_analysis: { intelligence_index: 47, coding_index: null, agentic_index: null } },
    });
    const others = CURATED_IDS.slice(1).map((id) => catalogRow(id));
    const model = trimCatalog({ data: [row, ...others] }, "2026-10-05").models[0];
    expect(model.benchmarks.coding_index).toBeNull();
    expect(model.pricing.overrides).toEqual([
      { min_prompt_tokens: 272000, prompt: "0.000004", completion: "0.000015" },
    ]);
    expect(model.tools).toBe(true);
  });

  it("fails when a curated model has left the catalog", () => {
    const data = CURATED_IDS.slice(1).map((id) => catalogRow(id));
    expect(() => trimCatalog({ data }, "2026-10-05")).toThrow(/missing from the catalog/);
  });
});

describe("volume presets", () => {
  it("offers the four magnitudes the cost control uses", () => {
    expect(VOLUME_PRESETS).toEqual([1_000, 10_000, 100_000, 1_000_000]);
  });
});
