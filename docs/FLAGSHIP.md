# Interactive Decision Storytelling

> Orbit flagship. Not a side “scrollytelling” feature.

## Positioning

**Interactive Decision Storytelling**  
A system for turning complex data, AI, analytics, and business problems into interactive experiences that help people understand and decide.

The system combines evidence, analytical models, narrative structure, and interactive visualization into reproducible **decision stories**.

**Reference story:** *When Rates Rise* — Where should a portfolio manager cut?

```text
                 INTERACTIVE
               DECISION STORYTELLING
                       │
          ┌────────────┴────────────┐
          │                         │
     THE ENGINE                THE STORY
          │                         │
 schema-driven runtime       When Rates Rise
 visual primitives           portfolio decision
 evidence model              seeded simulation
 responsive scenes           ECB evidence
 accessibility               decision logic
 reproducibility             limitations
```

The story is the interface. The thing being communicated is a **reasoning process**.

## Two artifacts

| Artifact | Role |
|----------|------|
| **The system** | Engineering: React/Next, schema manifests, visual registry, sticky scenes, deterministic sims, validation, a11y, evidence provenance, agent-compatible content |
| **The reference story** | Editorial: proves the system can answer a hard question, not merely animate charts |

## Conceptual model (Decision, not “Story + text + visual”)

```text
Decision
│
├── Question
├── Evidence
├── Model
├── Mechanism
├── Uncertainty
├── Scenarios
├── Visual narrative
└── Decision frame
```

Current reference story maps onto this almost one-to-one (question → mechanism → household → book shock → sensitivity → ECB check → floating×thin cut → limitations).

## Three layers

1. **Story Engine** — sticky scenes, step triggers, responsive layout, reduced motion, a11y, visual registry. Should become boring and stable.
2. **Story Grammar** — reveal, transform, compare, filter, accumulate, trace, highlight, annotate, zoom, split. Build new stories without inventing interactions each time.
3. **Decision Stories** — real implementations (When Rates Rise first; later: AI build/buy, affordability, cloud migration, concentration, …).

Do **not** invent five templates up front. Extract primitives from stories that already earned them.

## Proof points (portfolio)

1. **Explain the mechanism** — interactive causal narratives for complex systems.  
2. **Interrogate the evidence** — models, scenarios, external sources, and uncertainty with assumptions visible.  
3. **Reach the decision** — past “what happened?” toward “what should we pay attention to?”

## AI (production, not headline)

AI belongs in the pipeline (research → evidence → analysis → decision framing → story architect → manifest → human review), not as “AI-powered storytelling” branding. Differentiator: can an agent produce a *defensible* interactive decision story from evidence and analysis?

## Orbit

Two surfaces, one product.

1. **Portfolio teaser** — the first section after the Orbit title. A short account of the system, one visual, and a button into the flagship.
2. **Flagship landing** — `/stories`. The page built here: scroll the flight, then open a story. New stories are rows on this page.

From a row: `/stories/[slug]` is the essay, and a film keeps its own route (`/stories/when-rates-rise/film`). `/writes` stays prose. This repo stays the engine and the reference story until packaging. The teaser is an entrance, not a second home for the stories.
