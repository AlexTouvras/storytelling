# Reference Story — When Rates Rise

> **Purpose:** Editorial artifact for **Interactive Decision Storytelling** (see `docs/FLAGSHIP.md`).  
> **Bar:** Can this system answer a hard portfolio question as an interactive experience?  
> **Slug:** `when-rates-rise`  
> **Status:** PoC decision story shipped (sim + ECB evidence + PM cut). Fixture `rates-and-defaults` is not the flagship.


---

## Editorial core

| Element | Content |
|---------|---------|
| **QUESTION** | When rates rise, where does the pressure actually appear? |
| **CLAIM** | Higher debt service can reduce borrower capacity; the rate alone is not the risk signal. |
| **MECHANISM** | Rate → payment → buffer → stress → early signals → default risk |
| **VISUAL METAPHOR** | A borrower cash-flow reservoir (buffer) under rising payment pressure |
| **EVIDENCE** | Observed / published aggregate statistics (see Evidence pack) — **not** invented panel numbers |
| **COUNTERPOINT** | Not all borrowers have the same exposure; buffer thickness mediates the shock |
| **TAKEAWAY** | Watch the changing borrower buffer (and early signals), not the rate move in isolation |

**Epistemic rule:** Acts I–IV may be explicitly **hypothetical / illustrative**. Act V must use **observed** (or clearly **calculated from cited sources**) data. Never let teaching labels masquerade as evidence.

---

## Narrative arc (beats, not a rigid 6-chapter template)

| Act | Beat type | Reader job | Visual grammar (primary) |
|-----|-----------|------------|---------------------------|
| **Open** | OPEN + BIG QUESTION | Feel the question before the lecture | `reveal` — hero metaphor (reservoir / pathway stub) |
| **I — The system** | ORIENTATION → BUILD | Understand the transmission chain | `reveal` + `trace` — CB → market → loan → payment → buffer |
| **II — The borrower** | REVEAL | Feel one balance sheet under a rate step | `transform` — income / costs / debt service / buffer; rate↑ shrinks buffer |
| **III — Not equal** | COMPARISON + SPLIT | Same shock, different outcomes | `compare` + `split` — high / medium / low buffer under one shock |
| **IV — Portfolio** | ZOOM + ACCUMULATE | Individuals → distribution | `zoom` + `accumulate` — three borrowers → many → risk shape |
| **V — Evidence** | COUNTERPOINT / CHECK | Does reality rhyme with the mechanism? | `annotate` + (later) chart primitive — mechanism vs observed series |
| **VI — Watch** | SYNTHESIS + TAKEAWAY | Leave with a monitoring frame | `trace` + `highlight` — full chain; highlight **buffer / early signals** |

Pacing note: beats vary in length and density. Some steps are one sentence + a big visual change; some are denser orientation. Do not force every beat into the same paragraph block.

---

## Act briefs

### Open
- **Headline energy:** WHEN RATES RISE — Where does the pressure actually appear?
- **Not:** “Scrolling narrative · 2026-09-23”
- Hero visual immediately readable (metaphor or chain stub), not debug chrome.

### Act I — The system
- Nodes appear in order (or light up along a fixed spine): Central bank → Market rate → Loan rate → Monthly payment → Borrower buffer.
- Annotation per edge only when that edge is the active beat.

### Act II — The borrower
- One hypothetical household (teaching labels):

  | Line | Example |
  |------|---------|
  | Monthly income | €4,000 |
  | Essential costs | €2,000 |
  | Debt service | €1,000 |
  | Remaining buffer | €1,000 |

- Rate step-up: debt service expands, buffer contracts. Visceral, not abstract risk bands.

### Act III — Not everyone is equal
- Three hypothetical borrowers (high / medium / low buffer).
- Same rate shock; divergent remaining capacity (`split`).

### Act IV — Borrower → portfolio
- Morph / accumulate from three named borrowers toward a population distribution.
- Insight: portfolio risk shape is composed of heterogeneous buffers.

### Act V — Real evidence
- Explicit handoff: Hypothetical mechanism → Observed evidence → Does the data support the mechanism?
- Requires Evidence pack (below). If evidence is not ready, this act is **blocked** — do not fake observed series.

### Act VI — What we should actually watch
- Full pathway with emphasis on: rate is upstream; **buffer** and **early signals** are the actionable watchpoints.

---

## Evidence pack (Act V) — status: locked (stance 2 — full arc)

**Geography / window:** Euro area, hiking cycle from July 2022 through early 2024 (figures as published).

### Claim–evidence map

| Mechanism step | Evidence | Kind | What it does *not* show |
|----------------|----------|------|-------------------------|
| Rates / housing costs rose faster than prices | CES: housing costs **+10.2%** Jul 2022–Jan 2024 vs HICP **+5.5%**; mortgagors ~**+12%** | observed | Loan-level pass-through for every product |
| Debt service burden intensified | WP 3053 simulation: median DSTI **+6 pp**; share DSTI>40% **26%→33%** (2022 Q2–2023 Q2) | calculated | Census of all loans; realised defaults |
| Early payment stress | CES: lower-income **expected** late mortgage payments ~**30%** in 2024 Q1 (nearly doubled vs 2023) | observed | Realised arrears or NPL rates |
| Aggregate leverage still eased | Sector accounts: household debt-to-income **92.8%→87.0%** (2022 Q4–2023 Q4) | observed | Distributional stress inside the average |

### Sources

1. [ECB Economic Bulletin 3/2024 — housing burden (CES)](https://www.ecb.europa.eu/press/economic-bulletin/focus/2024/html/ecb.ebbox202403_03~5527657e02.en.html)
2. [ECB Working Paper 3053](https://www.ecb.europa.eu/pub/pdf/scpwps/ecb.wp3053~1f45ed3bc3.en.pdf)
3. [ECB sector accounts 2023 Q4](https://www.ecb.europa.eu/press/stats/ffi/html/ecb.eaefd_full2023q4~3d1fcaffef.en.html)

### Limitations (must appear in story)

Country and fixed/adjustable mix; CES expectations ≠ defaults; WP 3053 is simulation; aggregates can fall while pockets tighten.

---

## Story primitives to *earn* from this story (extract after, not invent first)

Start small when extraction begins:

`StoryHero` · `StorySection` · `StickyScene` · `Scene` · `Annotation` · `Metric` · `Callout` · `SourceNote`

Visual behaviors to support in the reference visual(s):  
`reveal` · `highlight` · `compare` · `transform` · `accumulate` · `annotate` · `zoom` · `trace` · `split`

Semantic transitions (example target shape — schema later):

```yaml
transition:
  type: transform
  targets: [rate, debtService, buffer]
```

Not: `transition: fade` as the only vocabulary.

---

## Manifest / engine implications (deferred until story proves them)

- Beats > rigid six-section template.
- Prefer `visualBehavior` + targets over opaque `visualState` enums alone.
- `rates-and-defaults` remains an **engine fixture**, not the reference story.
- Do not expand infrastructure (second template, Orbit package, chart lib) until this story’s repeated patterns are extracted.

---

## Acceptance (Reference Story v0.1)

- [x] Story Spec approved (stance 2 — full arc)
- [x] Evidence pack locked (ECB CES, WP 3053, sector accounts)
- [x] Implemented under Approach B (`when-rates-rise` + `cashflow-pressure`)
- [ ] Human review: five-minute “serious publication” bar
- [x] Epistemic labels correct throughout
- [ ] Readable with reduced motion and on a narrow phone (smoke pending human)
- [ ] Human gate before any public publish

---

## Immediate next step after approval

1. ~~Lock Evidence pack stance~~ done (stance 2).  
2. ~~Implement Reference Story v0.1~~ done; deepened with seeded book sim + PM cut.  
3. Human review of modeled conclusion.  
4. Only then extract primitives / schema extensions from what repeated.
