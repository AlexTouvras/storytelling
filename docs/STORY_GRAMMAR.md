# Story Grammar (Layer 2)

> Earned from `when-rates-rise` / `cashflow-pressure`. Do not invent five templates from this list — only reuse what a real story proved.

## Principle

The engine (Layer 1) stays a boring sticky stage. Grammar is **what the sticky graphic does** when a beat fires: same marks, changing emphasis — not a new chart type per act.

## Behaviors (verbs)

| Behavior | Job | Proven in |
|----------|-----|-----------|
| `reveal` | Establish the question / stub | Act 1 Dial |
| `trace` | Light the causal spine | Act 2 Transmission |
| `compare` | Same shock, divergent residual | Act 3 Heterogeneity |
| `zoom` / `accumulate` | Households → population field | Act 4 Book |
| `filter` / `highlight` | Dim non-sleeve marks; earn the number | Act 5 Intersection |
| `annotate` | Overlay epistemic badges on the field | Act 6 Reality Check |
| `split` | Part-to-whole portfolio cut | Act 7 The Cut |

Manifest `transition` strings should prefer these verbs (already used on `when-rates-rise`).

## Persistent objects

1. **TransmissionSpine** — five nodes (CB → market → loan → payment → buffer). Always mounted; `spineActive` changes.
2. **BufferMarkField** — vertical residual-capacity marks. Height = buffer; violet = thin; cyan = thick. Stable ids across zoom levels where possible.
3. **PressureSky / Atmosphere motifs** — cinematic atmosphere using allow-listed motifs (`docs/ATMOSPHERE_MOTIFS.md`). Chrome filled with domain vernacular, not empty decoration.
4. **EvidenceBadge** — MODELED / OBSERVED / HYPOTHETICAL / CALCULATED.
5. **DecisionCard** — durable end-frame (outro motif optional).

Code: `src/components/storytelling/grammar/`.

## Stage map (`cashflow-pressure`)

`stageConfig.ts` maps allow-listed `visualState` → `{ job, behavior, spineActive, field, caption, provenance }`.

Field modes: `stub` → `household` → `segments` → `population` → `sleeve` → `annotated` → `cut`.

## What is *not* grammar yet

- Progress-scrubbed timelines
- Generic chart library wrappers
- Schema field `visualBehavior` separate from `transition` (optional later; `transition` + `data-visual-behavior` already carry the verb)

## Next story rule

Before adding a new visualId, ask: can an existing grammar object + stage config express the beat? Only register a new visual when the metaphor cannot share the spine/field.
