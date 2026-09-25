# Data scale + MCP roadmap (Interactive Decision Storytelling)

> Companion to `docs/FLAGSHIP.md`. Guidance for moving from illustrative mechanism stories to evidence-rich decision stories without abandoning the editorial bar.

## Short answer

Yes — the current story’s **insight ceiling is bound by data scope**, not by the sticky runtime. A seeded 2k-loan book proves *mechanism → filter → decision*. It cannot honestly claim distributional truth about Europe’s mortgagors.

Bigger / better data unlocks **sharper cuts** (by country, fixation, income, LTV). It does **not** automatically unlock better stories. Journalism and narrative-viz research still say: match structure to intent (linear explanation vs modular exploration), progressive disclosure, transparent sourcing, and hybrid pipelines (human-curated analysis → reproducible render) — not “more charts.”

Keep *When Rates Rise* as the mechanism flagship. Grow data for a **v2 evidence spine** or a **second decision story**, not a rewrite that buries discovery under dashboards.

---

## What the current data can / cannot do

| Can | Cannot |
|-----|--------|
| Teach rate → payment → buffer | Represent true euro-area mortgage composition |
| Show concentration logic (float ∩ thin) | Produce publication-grade incidence rates |
| Sensitivity of mix vs shock | Country / product heterogeneity as observed fact |
| Connect to published ECB aggregates as rhyme-check | Replace HFCS / credit-register microdata |

The 23.1% sleeve is a **model conclusion**, correctly labeled. Advanced insight needs either (a) calibrate the book to published moments, or (b) compute sleeves from real microdata.

---

## Data ladder (recommended order)

1. **Public series (already partly used)** — MIR, CES boxes, sector accounts, Bank Lending Survey, ESRB/ECB charts. Fast; stay in `observed` / `calculated` with citations.
2. **Calibrated synthetic book** — keep seed reproducibility; fit floating share, DSTI/buffer moments, and income skew to published HFCS/CES summaries. Insight: “illustrative but moment-matched.”
3. **HFCS research microdata** — ECB Household Finance and Consumption Survey (scientific access). Enables real buffers, fixation, debt service by country/income. Access process: [HFCS](https://www.ecb.europa.eu/stats/ecb_surveys/hfcs/html/index.en.html).
4. **Optional later** — AnaCredit / national credit-register style aggregates if legally available; never invent loan-level “bank data.”

Do **not** jump to (4). Prefer (2) then (3).

### Analyses that become possible with (2)–(3)

- Sleeve size by **country** and **adjustable vs fixed**
- Shock pass-through by **reset vintage / remaining fixation**
- Contribution of **income quintile** to newly thin balances
- Counterfactual: same rate path, different floating mix (policy / book construction)
- Uncertainty bands (bootstrap / multiple imputation if HFCS weights require it)

Each must stay labeled and tied to a Decision Spec question.

---

## External system guidance (what to steal)

From recent data-storytelling research and newsroom practice:

1. **Intent → structure** — explanatory stories stay more linear (your seven acts); exploratory branches are optional side paths that return to the thread (“Water Tower” / modular blocks), not a second runtime.
2. **Progressive disclosure** — already your discovery pacing for 23.1%; keep it when data gets denser.
3. **Hybrid production** — encode evidence and analysis carefully; render consistently. Full auto generation of scrolly from raw data fails fidelity/traceability (see hybrid policy-scrolly work: curated graph → renderer).
4. **Evaluate narrative viz** — composition, comprehension, trust/sourcing — not only “looks polished.”
5. **Labor reality** — high-end scrollers are expensive; the reusable engine + grammar is how a solo/portfolio system stays viable.

---

## MCP / tool map (use Global `mcp.json` for shared servers)

### Already available in this Cursor setup

| Capability | MCP / tool | Role in IDS |
|------------|------------|-------------|
| Portfolio memory / decisions | `user-projectbrain` | Record Decision Specs, architecture choices, session handoffs |
| Semantic model / DAX exploration | `user-powerbi-modeling-mcp` | Explore measures for affordability / bank stories; **not** a substitute for HFCS |
| Visual QA of stories | `cursor-ide-browser` | Snapshot, scroll, sticky/mobile checks |
| Automations / Orbit ops | `cursor-app-control` | Open automations, resources; not story content |
| Design images (sparingly) | `cursor` `GenerateImage` | Only when explicitly needed for hero art — not for data viz |

### High-value adds (install Global unless repo-bound)

| Need | Suggested MCP / integration | Notes |
|------|----------------------------|--------|
| ECB rates / Eurostat macro | **`eu-finance`** (installed Global) | `@nexusforgetools/eu-finance` — rates, HICP, GDP, unemployment for evidence refresh |
| Broader official stats | `socioeconomic-data-mcp` (self-host) | Eurostat + ECB + FRED + OECD + …; pip install from GitHub — not on PyPI yet |
| Eurostat-only depth | `eurostat-mcp-suite` via `uv` | Catalogue search + SDMX when series hunting |
| Notebook analysis | Local `uv`/`jupyter` | Reproducible analysis → `npm run freeze:evidence` |
| Design system / Figma | Figma MCP (if you use Figma) | Optional; prefer code-first grammar |
| A11y audit | axe via Playwright in CI | Harden engine step |
| Web research | Browser MCP + WebSearch/WebFetch | Topic → evidence scout (human gate) |

**Installed (Global `C:/Users/kater/.cursor/mcp.json`):** `powerbi-modeling-mcp`, `projectbrain`, **`eu-finance`**.

**Do not** put Power BI / ProjectBrain / eu-finance into project `.cursor/mcp.json` (global only per workspace rule).

### Evidence Pack v2 (shipped scaffold)

- Calibration targets: `src/lib/sim/calibration.ts`
- Calibrated thin cutoff **6%** residual income → thin balance **27.8% → 33.3%** (rhyme vs WP 3053 DSTI>40% 26→33%)
- Frozen pack: `data/figures/when-rates-rise.v2.json` via `npm run freeze:evidence`
- Sleeve (floating∩thin) after calibration: **21.0%**
---

## Robust system shape (analytics → story)

```text
TOPIC / DECISION QUESTION
        ↓
   Evidence registry     (observed URLs + retrieved tables)
        ↓
   Analysis notebook     (HFCS / calibrated sim / DAX explore)
        ↓
   Frozen figures JSON   (versioned, cited, kind-tagged)
        ↓
   Decision Spec         (question → mechanism → uncertainty → cut)
        ↓
   Story Spec + grammar  (acts × visual jobs)
        ↓
   Manifest + visuals
        ↓
   validate:stories + preview
        ↓
   Human review → publish
```

Python/R notebooks and chart libs stay **analysis-side**. The Next engine keeps consuming **frozen, kind-tagged figures** so stories remain reproducible and epistemic labels stay honest.

---

## Sequencing (do not skip)

1. ~~Finish editorial sign-off on *When Rates Rise* v1 (discovery pacing).~~
2. ~~Extract Story Grammar from what repeated.~~ (`docs/STORY_GRAMMAR.md`)
3. ~~**Evidence Pack v2** — calibrated synthetic; freeze figures.~~ (`data/figures/when-rates-rise.v2.json`)
4. Human visual QA of continuous spine + calibrated sleeve (21.0%).
5. Either deepen Acts 4–6 with MCP-refreshed series or HFCS access plan.
6. Harden engine + Orbit host.
7. Agent pipeline last (research → evidence → spec → manifest), always human-gated.

---

## Decision

Bigger data is the right next *analytical* leap. The right *system* leap is an **Evidence → Analysis → Frozen figures → Decision Spec → Manifest** spine, with MCPs assisting research and QA — not replacing editorial judgment.

**Second-story pick:** score candidates in [`docs/DATASET_CATALOGUE.md`](./DATASET_CATALOGUE.md) before locking a source or writing a Decision Spec.
