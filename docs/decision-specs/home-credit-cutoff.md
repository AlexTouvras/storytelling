# Decision Spec — Where should the cut-off sit?

> Second Interactive Decision Storytelling piece (Orbit flagship).  
> Catalogue pick: `home-credit-pd` (score 22).  
> **Status:** Built and gated for Orbit publish (human 2026-09-25).  
> **Slug (proposed):** `where-should-the-cutoff-sit`  
> **Corpus:** Home Credit Default Risk via `PowerBI/11-credit-risk` gold (sample scorecard already built).

Companion positioning: `docs/FLAGSHIP.md`. Pattern earned from: `docs/reference-story-spec.md` (*When Rates Rise*).

---

## Decision frame (locked intent)

| Element | Content |
|---------|---------|
| **Decision-maker** | CRO / Head of Credit Risk setting retail origination policy |
| **Stake** | Grow approved volume without blowing a bad-rate appetite |
| **QUESTION** | Where should the PD cut-off sit under a volume / risk budget? |
| **CLAIM** | The “right” cut-off is a policy point on an acceptance frontier, not the score that maximises a pure ranking metric |
| **MECHANISM** | Application → features at decision time → score / PD → grade band → accept or reject → book mix (approval rate × bad rate among approved) |
| **VISUAL OBJECT** | One application field (marks = apps) that a moving PD gate filters; camera stays on the same marks while the frontier curve records volume vs risk |
| **EVIDENCE** | Observed `TARGET` defaults in the Home Credit sample; calculated PD / Gini / calibration / cut-off metrics from the portfolio champion; labeled sample-model, not IRB |
| **COUNTERPOINT** | Youden / max-KS pick a different gate than a budgeted bad-rate policy; external bureau-style scores (`EXT_MEAN`) are a weaker frontier |
| **UNCERTAINTY** | OOT window, calibration drift, PSI on drivers, LGD fixed for EL storytelling |
| **TAKEAWAY** | Set the gate from appetite × frontier, then watch OOT bad rate and PSI — not Gini alone |

**Epistemic rule:** Teaching beats may use illustrative single apps. Any figure that looks like a portfolio fact must be tagged `observed` | `calculated` | `illustrative` | `hypothetical`. Never present competition sample metrics as a live bank book.

---

## Why this story (vs *When Rates Rise*)

| | Rates | Cut-off |
|--|-------|---------|
| Decision | Where pressure appears when rates rise | Where to put the origination gate |
| Object | Buffer / floating∩thin sleeve | Application cloud + acceptance frontier |
| Analytics | Shock sim + ECB rhyme | PD model + policy frontier on real labeled apps |
| Scale claim | Seeded book + aggregates | ~80k gold sample of ~307k apps (full download available) |

This proves the system on **origination policy**, not another rate-transmission film. It reuses credit craft already proven in Power BI without shipping a dashboard remake: one scroll-scrubbed argument to a cut.

---

## Model & data (analysis contract)

| Item | Decision |
|------|----------|
| Source | [Home Credit Default Risk](https://www.kaggle.com/c/home-credit-default-risk) (`application_train` + bureau aggregates at decision time) |
| Working grain for story | Desktop gold sample **80,000** apps (stratified; default rate ≈ **8.07%**); full book **307,511** for metric honesty on Context |
| Champion (existing) | LightGBM + Platt calibration → PD → grades |
| Operating policy (existing gold) | Maximise OOT approval s.t. bad rate among approved ≤ **4.0%** appetite → **PD ≤ 7.5%** |
| OOT @ operating cut | Approval **~74.4%** · bad rate among approved **~4.0%** |
| Reference cut | Youden / max KS ≈ **PD ≤ 7.2%** (tighter; lower volume) |
| Baseline compare | Home Credit `EXT_MEAN` external-score frontier (weaker than champion) |
| EL storytelling | LGD **0.45** fixed — labeled illustrative for EL, not IFRS 9 |
| PSI | Feature stability vs baseline window; breaches are monitoring evidence, not the cut itself |

Rebuild path (analysis side only): `PowerBI/11-credit-risk` scripts `download-homecredit.py` → `build-gold.py` → `score-pd.py`. Freeze subset into `storytelling/data/figures/where-should-the-cutoff-sit.v1.json`.

---

## Uncertainty & scenarios

| Lens | What the reader should feel |
|------|-----------------------------|
| **Budget scenario** | Tighten appetite (e.g. 3%) → gate moves left → volume drops |
| **Youden vs operating** | “Best discrimination threshold” ≠ “best book under appetite” |
| **OOT check** | Gate chosen on train logic; paid for on OOT approval / bad rate |
| **Drift** | Even a good gate fails if IV features PSI-breach; monitoring is part of the decision frame |
| **What we do not claim** | Production IRB, real pricing, local regulatory cut-offs, or that Home Credit’s history is your book |

---

## Narrative arc (beats × grammar)

Beats vary in length. Do not clone seven equal chapters from Rates.

| Act | Beat | Reader job | Grammar | Persistent object |
|-----|------|------------|---------|-------------------|
| **Open** | QUESTION | Feel the trade-off before jargon | `reveal` | Dim field of applications + idle gate |
| **I — One file** | ORIENT | See what “decide now” means | `reveal` + `annotate` | Single application card (features known at decision) |
| **II — Score → PD** | TRANSFORM | Ranking becomes a probability | `transform` | Same app; score morphs to PD / grade |
| **III — Many files** | ACCUMULATE | Individuals → book shape | `zoom` + `accumulate` | Marks fill; grade strip appears |
| **IV — The frontier** | COMPARE | Volume vs risk is a curve | `compare` + `trace` | Acceptance frontier; champion vs `EXT_MEAN` |
| **V — Move the gate** | FILTER | Policy is a cut on the same marks | `filter` / `split` | Gate scrub; approved vs rejected partitions |
| **VI — Pay for it on OOT** | EVIDENCE | Does the chosen gate hold out of time? | `annotate` | OOT approval / bad rate; calib note |
| **VII — Watch after go-live** | SYNTHESIS | What to monitor once the gate is set | `highlight` + `trace` | PSI + new-business PD vs realized; decision card |

**Atmosphere:** optional intro/outro motif only if it earns the credit-policy mood; do not invent a new page architecture. Prefer directed-film path (one scrubbed shot + operable sleeve) unless Spec review says essay-first.

---

## Act briefs

### Open
Headline energy: **WHERE SHOULD THE CUT-OFF SIT?**  
Sub: Under a volume budget and a bad-rate appetite, the gate is a policy choice.  
Hero: application field with a dormant PD threshold.

### I — One file
One illustrative application (teaching labels). Show only features available *before* the yes/no. No peeking at `TARGET` yet.

### II — Score → PD
Champion score → calibrated PD → grade band. Name the champion as sample LightGBM + Platt. Tag metrics `calculated`.

### III — Many files
Accumulate to the 80k working book. Default rate ~8% as `observed` in sample. Grade mix as composition, not decoration.

### IV — The frontier
Plot approval rate against bad rate among approved (or dual axis vs PD cut). Champion frontier vs `EXT_MEAN`. Mark appetite line at 4% bad rate.

### V — Move the gate
Interactive or scrubbed cut: PD ≤ 7.5% as operating policy; flash Youden ~7.2% as counterpoint. Same marks: approved glow / rejected dim.

### VI — Pay for it on OOT
Handoff: policy chosen → OOT realized. Show OOT Gini ~55%, calibration mean PD vs realized (~8.15% vs ~7.94%), operating approval/bad rate. Explicit: mid-50s time-OOT Gini is honest for this public FE, not a competition leaderboard flex.

### VII — Watch
Decision card: operating cut PD ≤ 7.5% under 4% appetite · watch OOT bad rate among approved · watch PSI breaches on top IVs · do not steer on Train Gini alone. Limitations panel required.

---

## Evidence pack

**Status:** frozen — `data/figures/where-should-the-cutoff-sit.v1.json`  
**Rebuild:** `npm run freeze:cutoff` (reads `HOME_CREDIT_GOLD` or default PowerBI `11-credit-risk/data/gold`)

| Claim | Figure (from current gold) | Kind | Does *not* show |
|-------|---------------------------|------|-----------------|
| Book default base rate | ~8.07% | observed (sample) | Your bank’s through-the-door mix |
| Discrimination OOT | Gini ~55.3% · KS ~0.43 | calculated | Production monitoring on live apps |
| Calibration OOT | mean PD ~8.15% vs realized ~7.94% | calculated | Perfect probability in every decile |
| Operating gate | PD ≤ 7.5% · approval ~74.4% · bad among approved ~4.0% | calculated (policy) | Regulatory-approved cut-off |
| Reference gate | Youden PD ≤ ~7.2% | calculated | “Correct” business choice |
| Appetite | 4.0% budgeted bad rate | illustrative policy input | Board-approved risk appetite |
| LGD / EL | LGD 0.45 | illustrative | IFRS 9 staging truth |

**Sources**

1. Home Credit Default Risk competition data (Kaggle / HF mirror) — attribution on Context  
2. Portfolio gold: `PowerBI/11-credit-risk/data/gold/*` (`ModelMetrics.csv`, `FactCutoffPolicy.csv`, cutoff curves, PSI, ROC)  
3. Method notes in `11-credit-risk/README.md` and `_brief/report-spec.md`

**Limitations (must appear in story)**

Sample model only. Competition history ≠ current euro retail book. LGD fixed. Stage labels heuristic. Desktop sample is stratified 80k. No pricing, capital, or Fair Lending analysis in v1.

---

## Beat × visual-grammar map (Layer 2)

| Beat | Primary behavior | Notes |
|------|------------------|-------|
| Open | `reveal` | Field + gate; no chrome dump |
| One file | `annotate` | Sparse labels |
| Score → PD | `transform` | Keep mark identity |
| Many files | `accumulate` + `zoom` | Same metaphor |
| Frontier | `compare` + `trace` | Two curves max |
| Move gate | `filter` / `split` | Scrub increases travel then stops |
| OOT | `annotate` | Evidence badges |
| Watch | `highlight` | Decision card + PSI callout |

Allow-list new `visualId`s through `SceneRenderer` only when implementing. Prefer extending continuous mark-field + frontier chart over metaphor hopping.

---

## Out of scope for v1

- Full multi-table deep FE competition stack  
- Live bank data or AnaCredit  
- Auto-publish / agent-written manifest without human gate  
- Replacing Credit Risk Pulse PBIX (that report stays; this is the IDS film)  
- Five speculative story templates  

---

## Definition of done (this Spec)

- [x] Human approves Question / Claim / Takeaway / limitations  
- [x] Evidence pack figures freeze with kind tags  
- [x] Beat list stable enough to draft narration + visual states  
- [x] Explicit non-goals respected (no IRB cosplay)

**Shipped (local):** directed film at `/stories/where-should-the-cutoff-sit/film` · listed on landing · evidence pack v1.  
**Published:** storytelling `main` → Orbit storytelling-sync (human 2026-09-25).
