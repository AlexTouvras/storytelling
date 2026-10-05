# Decision Spec — Which model?

> One-page decision instrument. Not a scroll film, and not a reference story, so it has no StoryManifest and it is not a flagship story.
> **Status:** built 2026-10-05 from the model-choice brief. The public page is an Orbit live desk, refreshed on the first of each month.
> **Slug:** `which-model`
> **Route:** Orbit `/portfolio/live/which-model`. Engine preview `/desk/which-model` (not copied into `/stories`).

## Decision frame

| Element | Content |
|---------|---------|
| **Decision-maker** | Someone about to spend a budget on a model for a stated job |
| **Stake** | The model that leads a benchmark can be the wrong one to ship: it may lack the index the job needs, or it may cost more than the job can justify |
| **QUESTION** | Which model should I use for this job? |
| **CLAIM** | Fit is a weighted score on a frozen catalog. Change the job, or the weights, and the recommendation moves. The index leader is named beside it |
| **MECHANISM** | A job picks one published index, gates on modality, tools, and prompt length, then blends quality, log cost, and context headroom. The blend is on the page |
| **VISUAL OBJECT** | A field of the models that can take the job. Across is the cost of the workload. Up is the job's published index. The model that fits is cyan. The index leader, when it is someone else, is ringed |
| **EVIDENCE** | OpenRouter `GET /api/v1/models`, trimmed to the same 14 ids. The living extract is `data/sources/openrouter-which-model.json`, frozen as `data/figures/which-model.v1.json`. A workflow replaces both on the first of each month. The 2026-10-05 file stays as the fixture the formula tests pin. Indices are Artificial Analysis numbers carried on that response. Prices are the catalog's uncached per-token USD rates, including a long-prompt override where the catalog published one |
| **UNCERTAINTY** | Fourteen models, not the catalog. No latency in the snapshot, so speed is not a weight. Cache, batch, and web search are not in the cost. A missing index sits the model out rather than being filled in. Fit is relative to this set |
| **TAKEAWAY** | Ask which model fits the job. The benchmark winner is a point on the field, and sometimes it is not the one you ship |

The volume, the token sizes, and the opening weights are **hypothetical**. Fit and the dollar total are **calculated**. The index, the list price, and the context length are **published**.

## What the page does

1. Opens on the question, then six jobs: document extraction, coding, reasoning, classification, long context, multimodal.
2. Shows the models that can take the job, and names who sits it out and why.
3. Recommends the highest fit, with the formula `Fit = quality + cost + context` and the live shares.
4. Lets the reader move the shares. They stay summed to 100, and the ranking moves.
5. Prices the workload at 1K, 10K, 100K, and 1M items, and at an input and output length the reader can edit.
6. Keeps the other models one control away. The directory is that list. It is not the hero.

## Scoring

- **Gate.** Image, when the job requires it. Tool calling, when the job requires it. Context at least as long as the prompt. The job's index present on the row. The first failure is the reason the model sits out.
- **Quality.** The job's index divided by the highest index among models that pass the gate.
- **Cost.** Uncached `input × prompt + output × completion`, times the volume. Past a published long-prompt minimum, that override replaces the base rate. The score is the log distance from the dearest eligible model toward the cheapest, so one expensive model does not flatten the rest of the field. The dollars on screen are not scaled.
- **Context.** Headroom over the prompt. A window twice the prompt scores 1. Shorter than the prompt has already failed the gate.
- **Phrase.** "Best of the 14 models on this page." The word "optimal" is not used.

Opening results, so a re-freeze or a formula change has something to bump into:

| Job | Fits | Leads the index |
|-----|------|-----------------|
| Document extraction | GLM 5.3 Flash | Claude Fable 5.1 (agentic) |
| Coding | GLM 5.3 Flash | Claude Fable 5.1. Claude Opus 5.5 sits out: no coding index |
| Reasoning | Claude Sonnet 5.5 | Claude Opus 5.5 |
| Classification | GLM 5.3 Flash, which is also the cheapest | Claude Opus 5.5 |
| Long context | GLM 5.3 | Claude Opus 5.5 |
| Multimodal | GLM 5.3 Flash | Claude Opus 5.5. Text-only rows sit out |

## Out of this page

A live catalog of every OpenRouter model, a speed weight, and a listing on `/stories`. The page is a live desk. Listing it as a flagship story is out.
