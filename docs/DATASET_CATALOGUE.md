# Dataset catalogue — second decision story

> Working shortlist tool. Cap ~15 candidates. Score against the selection brief; do not grow into an encyclopedia.
> Companion to `docs/DATA_AND_MCP_ROADMAP.md` and `docs/FLAGSHIP.md`.

## Purpose

Pick the next Interactive Decision Storytelling topic by comparing datasets on **story fitness**, not row count.

Ceiling: when three candidates are shortlisted, stop cataloguing and write a Decision Spec for #1.

---

## Inventory batch (2026-09-25)

### A — Local `data/` files

Scanned project `data/` (skipped `venv` / `node_modules` / test fixtures).

| Repo | What showed up |
|------|----------------|
| `PowerBI/` | Main corpus — gold (+ some raw) under `01`–`12` |
| `storytelling/` | Frozen evidence pack only (`data/figures/when-rates-rise.v2.json`) |
| `investing/` (Ledger) | Price parquet caches + research/sim JSON reports |
| `Orbit/` | No standalone CSV/parquet corpus |
| Empty / planned only | `07-helsinki-energy` (source locked, no gold yet); `10-fpa-controllership` |

### B — Live datasets / feeds

Orbit `published-projects.json` + MCP + open APIs. These are **first-class catalogue rows** below (`kind: live` or `kind: api`), not just footnotes on local gold.

| id | Surface / endpoint | Payload |
|----|--------------------|---------|
| `live-nordic-equity-board` | https://heatmap-web-five.vercel.app/ | `board.json` — 82 Nordic names, day % / mcap |
| `live-ledger-research` | https://alextouvras.com/ledger-research | `latest.json` (~595 KB) + history |
| `live-eu-finance-mcp` | Global MCP `eu-finance` (ECB SDW / Eurostat / Frankfurter) | On-demand rates, HICP, GDP, unemployment, FX |
| `live-helsinki-nuuka` | [Nuuka / HRI](https://hri.fi/data/en/dataset/helsingin-kaupungin-palvelukiinteistojen-energiankulutustietoja) | Live city energy API; local gold not built |

Skipped as non-corpora: Orbit HQ, mealplan architecture page. Power BI Nordic Boardroom is screenshot/case-study only (no hosted PBIX).

This batch is **existing assets only** (local + live/API). External targets (HFCS, AnaCredit, fresh open data beyond Nuuka) stay for a later seed round.

### C — External online seed (2026-09-25)

Web / HF / official portals scored against the same brief. Prefer candidates that force reduction **and** have a decision cut. Skipped: TabLib-scale table dumps (no decision), OpenMedallion market archives (weak cut), AnaCredit (not public), OpenSky full Trino (affiliation/commercial gate).

| id | Source | Approx scale | Why considered |
|----|--------|--------------|----------------|
| `entsoe-europe-load` | ENTSO-E / Kaggle cleaned hourly load | ~2.07M rows (2019–2025) | EU energy ops; FI-friendly; forecast vs actual |
| `sec-13f-ziplime` | Hugging Face ZipLime 13F PIT | ~88M positions | True big tabular; disclosure-lag decision |
| `nyc-tlc-trips` | NYC TLC + AWS Open Data | multi-year trip parquet (billions cumulative) | Canonical big-event stream + spatial reduce |
| `openfundex-distress` | HF idleengine/openfundex | ~358k labeled filings | Distress / cut-off ML with temporal splits |
| `hfcs-scientific` | ECB HFCS research microdata | household waves (scientific-use) | Data-ladder step 3 for rates-domain deepen |
| `portbench-raw` | HF AgenticFinLab/PortBench-RawData | 183 assets daily 2015–2025 | Multi-asset bench — overlaps Ledger |
| `opensky-adsb` | OpenSky Network | massive ADS-B | Scale wow; access/license friction for Orbit |

### C2 — Deeper online pass (same day)

Second search pass: Eurostat PUFs, OpenFEMA, Traficom, Digitraffic, ACS PUMS, IEEE-CIS fraud.

| id | Source | Approx scale | Why considered |
|----|--------|--------------|----------------|
| `fema-nfip` | OpenFEMA NFIP policies + claims | ~74.3M policy txns + ~2.7M claims | Largest open insurance corpus found; climate concentration cut |
| `traficom-vehicles-fi` | Traficom open vehicle register | **5,206,750** rows · ~916 MB CSV · CC BY 4.0 | Full FI in-use fleet; EV / motive-power transition |
| `digitraffic-tms-raw` | Digitraffic TMS raw history | vehicle-passage CSVs per station×day (national network) | True event-stream big data; Nordic ops |
| `acs-pums-housing` | US Census ACS PUMS | ~1–5% population micro (millions of HU/person rows) | Affordability / cost-burden decision (open microdata) |
| `ieee-cis-fraud` | Kaggle IEEE-CIS / Vesta | ~590k CNP transactions | Fraud threshold / false-positive trade-off |
| `eu-silc-lfs-puf` | Eurostat public use files | country×year CSVs | **Synthetic (SILC)** / disclosure-controlled — practice files, not publish evidence |

Skipped deeper: AnaCredit (closed); EU-SILC/LFS scientific-use (research-entity gate); Traficom aggregates-only PxWeb tables (too small vs vehicle register).

---

## Selection brief (must pass)

| # | Criterion |
|---|-----------|
| 1 | Scale that forces principled reduction (aggregate / filter / zoom) — not a raw dump |
| 2 | Defensible advanced analytics (model, sim, causal, interpretable ML, uncertainty) |
| 3 | Decision with a cut (what to watch / choose / reject) |
| 4 | Named decision-maker + stake |
| 5 | Mechanism object the camera can follow |
| 6 | Freeze path: raw → notebook → kind-tagged figures → manifest (engine never streams warehouse) |
| 7 | Observed vs modeled split possible |
| 8 | Uncertainty or counterfactual |
| 9 | License / access OK for public Orbit |
| 10 | Differentiates from *When Rates Rise* (domain leap or real data-ladder step) |
| 11 | Feasible effort for a portfolio-quality ship |
| 12 | Reject “big for big’s sake” |

---

## Scoring

Each dimension 1–5. **`score_sum = D+V+A+X+E`** (max 25). Optional mean: `score_sum / 5`.

| Code | Dimension | 1 = | 5 = |
|------|-----------|-----|-----|
| **D** | Decision sharpness | Vague topic | Clear actor, constraint, cut |
| **V** | Viz of reduction | Dashboard of rows | One object; zoom/filter earns insight |
| **A** | Analytics depth | Descriptives only | Model changes the decision |
| **X** | Access + reproduce | Locked / murky | Open + versioned extract |
| **E** | Effort (invert risk) | Months / legal maze | Weeks to frozen pack |

**Verdict:** `shortlist` (`score_sum` ≥ 18, no hard fail) · `park` · `reject` · `in-use` (already story 1).

Hard fails: cannot publish legally; no decision cut; only wow is N; cannot freeze figures.

Scores below are **first-pass** from READMEs + file sizes/row counts — revisit before locking.

---

## Leaderboard (local + live + external)

| Rank | id | kind | score_sum | verdict | one-line cut |
|------|----|------|-----------|---------|--------------|
| 1 | `home-credit-pd` | local | 22 | **picked** | Where should the PD cut-off sit under a volume / risk budget? |
| 2 | `fema-nfip` | external | 21 | shortlist | Which flood zones / repeats should a climate book cut or reprice first? |
| 3 | `entsoe-europe-load` | external | 21 | shortlist | Which hours/zones need peak preparedness before the next scarcity window? |
| 4 | `acs-pums-housing` | external | 21 | shortlist* | Where is housing cost burden forcing a cut in spend / move / subsidy? |
| 5 | `traficom-vehicles-fi` | external | 20 | shortlist* | Where is Finland’s EV transition concentrated — what should policy watch next? |
| 6 | `digitraffic-tms-raw` | external | 20 | shortlist* | Which corridors need intervention before the next peak congestion window? |
| 7 | `olist-logistics` | local | 20 | park | Solid local; smaller than new scale finds |
| 8 | `uci-diabetes-readmit` | local | 20 | park | Keep if health thesis wins |
| 9 | `sec-13f-ziplime` | external | 20 | park | Markets-heavy vs story 1 |
| 10 | `nyc-tlc-trips` | external | 19 | park | Mobility classic; US dashboard trap |
| 11 | `openfundex-distress` | external | 19 | park | Overlaps Home Credit decision shape |
| 12 | `ieee-cis-fraud` | external | 18 | park | Fraud threshold; overlaps credit lane |
| 13 | `live-ledger-research` | live | 18 | park | Thin scale |
| 14 | `hfcs-scientific` | external | 17 | park | Access gate; rates deepen |
| — | `eu-silc-lfs-puf` | external | 11 | reject | Synthetic/practice — dishonest as Orbit evidence |
| — | `opensky-adsb` | external | 13 | reject | Access friction for true scale |
| — | `when-rates-rise-book` | local | — | in-use | Story 1 |

**Locked pick (by highest `score_sum`, 2026-09-25):** `home-credit-pd` (22).

**Decision Spec (draft):** [`docs/decision-specs/home-credit-cutoff.md`](./decision-specs/home-credit-cutoff.md)

Tied runners at 21 (parked): `fema-nfip`, `entsoe-europe-load`, `acs-pums-housing`.

**Next:** narration + film for `where-should-the-cutoff-sit` (evidence frozen).

---

## Round D — story 3, re-scored for craft stress (2026-09-26)

Two stories have shipped and the animation craft pass (`docs/ANIMATION_CRAFT.md`) added a motion layer
the catalogue never scored for. Round D reopens the parked shortlist for one question: **which of these
datasets makes the new capabilities load-bearing rather than decorative?**

No new candidates were sought. Prior `score_sum` stands; one dimension is added.

### New dimension — C, craft stress

| Code | Dimension | 1 = | 5 = |
|------|-----------|-----|-----|
| **C** | Craft stress | A still frame of the mechanism says the same thing as the film | The finding *is* an order or a propagation, so `arrival` / `leadLag` render meaning rather than staging |

`craft_sum = score_sum + C` (max 30). Tie-break: prefer the candidate that is **not** a third
threshold film. Stories 1 and 2 are both a cross-section changing state under a moving cut; a third
would exercise the engine and teach us nothing new about it.

### What the new layer has not been asked to do

| Capability | Exercised so far | Untested |
|---|---|---|
| `leadLag` + `rankJitter` | Rank is a **distributional** rank — book's thin edge, best grade first. A staging device. | A rank anchored in **time or space**, where the lag itself is the evidence and a wrong lag is a wrong claim |
| `arrival` | Population written on in rank order | An order that is the data's own making order (real arrival times, registration vintages) |
| `markLife` / `cameraCreep` | Holds on a settled field, where stillness is merely dull | A subject where stillness is **false** — a frozen motorway is a wrong statement, not a dead beat |
| `strokeWeight(base, zoom)` | ~6× push-in | A decade-wide zoom range (national network → one sensor) |
| Cue-table `rendered` bookkeeping | One canvas per film; the DOM/chart channels caught as unrendered | Two genuinely rendered surfaces in one film |
| Frame cost | **Not measured at all**, desktop or phone (`ANIMATION_CRAFT.md`, honest limits) | Any field materially larger than ~2,400 marks |

### Re-score

| id | prior | C | craft_sum | Why that C |
|----|------:|--:|----------:|------------|
| ~~`digitraffic-tms-raw`~~ | 20 | ~~**5**~~ → **3** | ~~25~~ → **23** | Picked for a queue travelling upstream at a measurable speed. **Measured, and it does not hold** — see the verification below. `arrival` and `markLife` still earn their keep; `leadLag` does not. |
| `entsoe-europe-load` | 21 | 3 | 24 | Zones genuinely peak in sequence as a cold front crosses, so the lead/lag is real — but the object is a load **curve**. A curve film barely touches the mark layer and has no wide zoom. |
| `fema-nfip` | 21 | 3 | 24 | Severity concentration is spatial but not a propagation anyone observed; animating one would be a claim the data cannot support. A map camera is a new problem worth solving later, and the US/flood-map framing is a brand and sensitivity cost. |
| `sec-13f-ziplime` | 20 | 4 | 24 | Disclosure lag *is* a lead/lag: the knowable book trails the real one by a quarter. Genuinely new craft use. Held back by CUSIP licensing and by being a third markets piece. |
| `acs-pums-housing` | 21 | 2 | 23 | A weighted cross-section flipping bands under a shock — structurally the same film as stories 1 and 2. Fails the tie-break on its own. |
| `traficom-vehicles-fi` | 20 | 3 | 23 | Registration vintage is a real making order, so `arrival` means something. But a single register snapshot has no propagation, and the analytics stay descriptive (prior A3). |
| `nyc-tlc-trips` | 19 | 4 | 23 | Real event stream, so the craft fit is good; over-told in viz culture and the weakest Nordic fit. |
| `olist-logistics` | 20 | 3 | 23 | Lead time is temporal, but CC BY-NC-SA blocks the commercial Orbit framing. |
| `ieee-cis-fraud` | 18 | 2 | 20 | Third threshold film, opaque features. |

### Recommendation — `digitraffic-tms-raw`

**Proposed question:** *When should the speed limit drop?* — the intervention is a timing and a
location, not only a level, which inherits the cut-off grammar and adds the axis the first two films
do not have.

| Element | Draft (to be settled in a Decision Spec, not here) |
|---|---|
| Decision-maker | Road traffic management — a national operator deciding variable-speed-limit and ramp policy on one corridor |
| Stake | A queue that forms is far more expensive than one prevented; act too early and the limit is ignored |
| Mechanism object | Passage stream at a station chain → speed/headway drop at the bottleneck → the drop travelling upstream → the window in which an intervention still lands ahead of it |
| Observed vs modeled | Observed passages and the measured propagation lag; modeled counterfactual of an earlier intervention, labeled as such |
| Uncertainty | Loop-detector gaps, incident vs recurrent congestion, whether the same lag holds across days |

**Scoped slice (keeps the ETL honest):** one corridor, roughly 10–20 consecutive TMS stations in one
direction, a window of a few weeks containing at least one clear congestion onset plus a comparable
free-flowing day. Aggregate to station-minute before anything is frozen; the engine never sees
passages.

**Verify before a Spec is written** — these are assumptions from the round C2 entry, not checked facts:

1. The exact field list of the raw TMS history CSVs, and whether headway and per-vehicle speed are
   present or have to be derived from timestamps.
2. Station metadata: chain order and inter-station distances, which the propagation lag needs.
3. Licence terms for redistributing derived aggregates under the Orbit publish framing.
4. Whether the corridor's measured lag is stable enough across days to be presented as a mechanism
   rather than an anecdote.

If (1)–(4) do not hold, `entsoe-europe-load` is the fallback: lower craft ceiling, materially lower
data risk, and the same Nordic systems lane.

**Carry two engine items into whichever story wins**, because this round found them unmeasured rather
than fine: a frame-cost budget on desktop and phone, and a second rendered surface to test the
cue-table `rendered` bookkeeping. The landing reduced-motion end frame stays a separate piece of work.

### Verification of the four assumptions (2026-09-26)

Checked against the live API and 70 days-of-station of real passage data before committing. Scripts
were throwaway; what matters is the result.

**1. Raw format — passes, better than assumed.** `/api/tms/v1/history/raw/lamraw_{tms}_{yy}_{ddd}.csv`
returns one semicolon-delimited row per vehicle passage, 16 columns, no header: station, date parts to
1/100 s, length, lane, direction, vehicle class, **speed**, faulty flag, ms-since-midnight, **headway
in ms**, and a queue flag. Speed and headway are recorded, not derived. About 0.05% of rows carry the
faulty flag. Ring I files run 1–6 MB per station-day; 10 stations × 7 days downloaded in 11 seconds.

> The queue flag is dead. Across roughly 3 million passages in 70 files it is `0` in every single row.
> Congestion has to be derived from speed. Anything built on that column would have been built on air.

**2. Station metadata — passes.** All 518 stations (503 `GATHERING`) carry a `roadAddress` with road
number, section, distance from section start, carriageway and side, plus coordinates. Zero live
stations are missing it, so chain order and spacing are exact. **Ring I (road 101)** is the corridor:
10 consecutive detectors, Keilaniemi → Vartiokylä, gaps 1.03–3.84 km, median 2.27 km.

**3. Licence — passes.** Fintraffic open data is CC BY 4.0, explicitly including commercial use with
attribution. Requests need a `Digitraffic-User` header and `Accept-Encoding: gzip`.

**4. Propagation lag — FAILS, and this is the finding.** The claim that made this the top craft pick
was that a queue travels upstream at a measurable speed. It does not survive the data.

- Congestion itself is emphatic and repeatable. Kannelmäki direction 2 drops below 75% of its
  overnight speed between **07:31 and 07:45 on all seven weekdays** measured. Malmi direction 1 does
  the same in the afternoon, **15:07–15:37 on all seven**, bottoming at 37% of the night reference.
  Onset *timing* is one of the most stable signals you could ask for. Severity is far more variable.
- The **front is not**. Taking the bottleneck and its two upstream neighbours, the onset order is
  upstream-correct on **3 of 7 weekdays** at the best threshold, and the implied front speed ranges
  **2.8–45 km/h** — the textbook ~15–20 km/h appears without being reproducible. Loosening the
  threshold destroys the ordering entirely (0 of 7 at 85%).
- Ring I has **several independent bottlenecks**, not one wave: Kannelmäki, Malmi, Pukinmäki and
  Länsi-Pakila each trigger on their own schedule, and Malmi's afternoon onset precedes Kannelmäki's.
- Lane-level lead/lag at a single detector was tried as a finer-grained substitute. The sign flips
  day to day (+4, +1, −19, 0, −11, +1, −12 min). Also not a mechanism.
- The cause is resolution, and it is not fixable by choosing better. 2.3 km detector spacing against a
  ~15 km/h front is roughly a 10-minute quantum, and no denser chain exists in the network — the
  sub-100 m station pairs on road 4 near Oulu are co-located duplicates, not a dense corridor.

Also found: **detector coverage gaps are per-direction and invisible in the station list.** Laajalahti
records ~3,900 passages/day in direction 2 against ~21,000 in direction 1. A corridor has to be
validated direction by direction.

**Consequence for the score.** `arrival` still lands on a true order, `markLife` is still semantically
required, and the zoom range is still the widest we have. But `leadLag` goes back to staging a
distribution rather than carrying evidence, which was the whole basis for **C 5**. Honest revision:
**C 3, craft_sum 23** — no longer ahead of the field.

**Lesson for the method.** Round D scored a craft dimension on an unmeasured mechanism, and that is
the same error as scoring analytics depth from a README. A C above 3 now requires the propagation or
the order to have been measured first, not argued for.

**Where the dataset still stands.** Access, licence, format and metadata are excellent, and there is a
real decision in it — *how early do you act, when the onset is this predictable and the depth is not?*
That is a defensible story with observed evidence and a counterfactual. It is simply not the
craft-stress test it was picked for.

**Awaiting:** human pick, with the revised score. No Spec, corpus pull, or film work starts before it.

---

## Candidates

### kind legend

`local` = repo gold/raw · `live` = public interactive surface + frozen/public JSON · `api` = live queryable feed (MCP or city API)

---

## Live / API candidates

### live-nordic-equity-board

- **kind:** live
- **live_url:** https://heatmap-web-five.vercel.app/
- **live_payload:** `PowerBI/01-finance/heatmap-web/public/board.json` (~31 KB; `count` 82; asOf snapshot)
- **related_local:** `nordic-equity-heatmap` (gold `FactPrices` ~20k rows + PBIX signal desk)
- **source:** Yahoo-delayed Nordic large-cap snapshot → board JSON
- **license_access:** market data attribution
- **domain:** equities / market board
- **scale:** 82 names — viz product, not a large corpus
- **complexity:** 2
- **challenge:** Already a live Orbit proof; remake as IDS adds little data-scale story
- **analytics_fit:** descriptive day-change (+ PBIX RSI desk if paired)
- **mechanism_object:** sector tile field → ticker drill
- **candidate_questions:**
  - Which sectors/names dominate today’s move — and does that clear a signal-desk bar?
- **vs_rates_rise:** Markets; live web craft already shown
- **freeze_path:** yes — version `board.json` into figures
- **risks:** double-count with local gold; “live” ≠ “big”
- **scores:** D3 V3 A2 X4 E2 → **score_sum 14**
- **verdict:** park

### live-ledger-research

- **kind:** live
- **live_url:** https://alextouvras.com/ledger-research
- **live_payload:** `Orbit/public/ledger-research/data/latest.json` (~595 KB) + `history/*.json`
- **related_local:** `ledger-research` / `investing-desk-gold` / `investing/` caches
- **source:** own backtests on cached market prices; scrubbed public snapshot
- **license_access:** open market data + own research (no broker IDs / absolute € in public JSON)
- **domain:** portfolio construction
- **scale:** research artifact hundreds of KB; price caches ~MB — not microdata-scale
- **complexity:** 4 — strategy families, change bar, overfit audit
- **challenge:** Product already ships the decision loop; IDS remake risks reprise
- **analytics_fit:** simulation / backtest + policy selection
- **mechanism_object:** strategy family → selected policy → EXIT/ADD/TRIM
- **candidate_questions:**
  - Should this sleeve change policy this cycle, or defer under the change bar?
- **vs_rates_rise:** Adjacent PM audience; thin scale leap
- **freeze_path:** yes — public JSON is already a freeze
- **risks:** not a raw-big-data showcase; theme overlap with story 1
- **scores:** D5 V3 A5 X4 E1 → **score_sum 18**
- **verdict:** park

### live-eu-finance-mcp

- **kind:** api
- **live_url:** MCP namespace `user-eu-finance` (Global Cursor MCP)
- **live_payload:** on-demand JSON from ECB SDW / Eurostat / Frankfurter (`get_ecb_rates`, `get_eu_inflation`, `get_eu_gdp`, `get_eu_unemployment`, `get_euro_exchange`, `compare_eu_economies`)
- **related_local:** `when-rates-rise-book` evidence pack (already consumes published aggregates)
- **source:** ECB + Eurostat official series
- **license_access:** open official stats
- **domain:** euro-area macro / rates
- **scale:** aggregate time series (countries × months/quarters) — not loan-level big data
- **complexity:** 2 — series joins + release lag handling
- **challenge:** Great for **observed** evidence acts; cannot alone carry a microdata-scale second story
- **analytics_fit:** observed series + calculated real rates / cross-country compare
- **mechanism_object:** policy rate ↔ inflation / labour / growth panel
- **candidate_questions:**
  - Where is real policy stance tightest across EA peers right now?
  - Does the latest hike cycle still rhyme with household stress signals? (pairs with microdata)
- **vs_rates_rise:** Same macro lane as story 1 evidence — deepen rates, don’t replace domain
- **freeze_path:** yes — pull → cite → `data/figures/*.json` (already the Evidence Pack pattern)
- **risks:** picking this as “the” big-data story fails criterion 1; best as evidence spine companion
- **scores:** D3 V2 A3 X5 E3 → **score_sum 16**
- **verdict:** park (companion feed, not primary shortlist)

### live-helsinki-nuuka

- **kind:** api
- **live_url:** Helsinki Nuuka / HRI open energy API
- **live_payload:** property list + electricity/heating/water/cooling time series (~1,800+ service properties) — **not yet mirrored to local gold**
- **related_local:** `helsinki-nuuka-energy` (`PowerBI/07-helsinki-energy`, planned fetch scripts)
- **source:** City of Helsinki open data
- **license_access:** open
- **domain:** facilities energy
- **scale:** potentially large property × time panel once fetched
- **complexity:** 3 — peaks, anomalies, property types, API pagination
- **challenge:** Live source exists; IDS needs ETL → freeze before Spec work claims scale
- **analytics_fit:** anomaly / peak detection (planned)
- **mechanism_object:** property → load curve → peak/anomaly → inspect queue
- **candidate_questions:**
  - Which service properties should facilities inspect first after anomalous peaks?
- **vs_rates_rise:** Strong Helsinki/local differentiator
- **freeze_path:** not yet — `fetch-nuuka` → gold first
- **risks:** catalogue as ready when gold is empty
- **scores:** D4 V3 A2 X4 E2 → **score_sum 15**
- **verdict:** park (re-score after first gold extract)

---

## External candidates (online seed)

### entsoe-europe-load

- **kind:** external
- **source:** [ENTSO-E Transparency Platform](https://transparency.entsoe.eu/) (+ cleaned [Kaggle Europe Electricity Load 2019–2025](https://www.kaggle.com/datasets/dsersun/europe-electricity-load-hourly-20192025) ~2.07M rows / ~255 MB); FI zone `10YFI-1--------U`
- **license_access:** open (ENTSO-E terms + attribution; Kaggle redistrib CC BY-SA 4.0 — verify)
- **domain:** electricity system / demand
- **scale:** hourly country loads across Europe, multi-year — millions of rows; not microdata but true high-frequency panel
- **complexity:** 3 — coverage gaps, forecast vs actual, cold-snap / scarcity windows
- **challenge:** Aggregate MW ≠ building-level (vs Nuuka); easy to become a pretty heatmap without a cut
- **analytics_fit:** forecast error / peak detection / scarcity scenarios
- **mechanism_object:** load curve → peak hour → zone stress → prep actions
- **candidate_questions:**
  - Which hours and zones need peak preparedness before the next scarcity / cold-snap window?
  - Where is day-ahead forecast error systematically eating the reserve story?
- **vs_rates_rise:** Ops/energy domain; Helsinki-relevant; pairs later with `live-helsinki-nuuka`
- **freeze_path:** yes — pull window → anomaly/peak figures JSON
- **risks:** dashboard trap; conflating country load with city facilities
- **scores:** D4 V4 A4 X5 E4 → **score_sum 21**
- **verdict:** shortlist

### sec-13f-ziplime

- **kind:** external
- **source:** [ZipLime/institutional-portfolio-13f](https://huggingface.co/datasets/ZipLime/fund-portfolios) (PIT 13F) — ~87.9M position events, 2013Q2–2026Q2
- **license_access:** Apache-2.0 compilation; underlying SEC filings public; **CUSIP license caution**
- **domain:** institutional portfolios / concentration
- **scale:** tens of millions of rows — strongest “raw big tabular” candidate found
- **complexity:** 5 — knowledge_date vs event_date, amendments, unit traps, confidential treatment
- **challenge:** Honest story is about *information lag*, not cloning genius; CUSIP; theme overlaps Ledger
- **analytics_fit:** point-in-time simulation + concentration / herding metrics
- **mechanism_object:** filing → knowable book → concentration sleeve → follow vs fade
- **candidate_questions:**
  - Given disclosure lag, which managers’ concentration should a CIO fade vs follow this quarter?
  - How much of “smart money” signal is already stale when it becomes knowable?
- **vs_rates_rise:** Markets again, but micro-structure of *knowability* is new; true scale leap
- **freeze_path:** yes — subsample managers + frozen concentration figures (never ship full 88M to Next)
- **risks:** look-ahead bias if Spec ignores knowledge_date; CUSIP; reprise of investing desk
- **scores:** D4 V4 A5 X3 E4 → **score_sum 20**
- **verdict:** shortlist*

### nyc-tlc-trips

- **kind:** external
- **source:** [NYC TLC Trip Record Data](https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page) / [AWS Open Data](https://registry.opendata.aws/nyc-tlc-trip-records-pds/)
- **license_access:** open (NYC terms)
- **domain:** urban mobility / ops
- **scale:** monthly parquet; cumulative billions of trips — canonical public big-event stream
- **complexity:** 3 — zone joins, HVFHV vs yellow, surge definition
- **challenge:** Over-told in viz culture; hard to earn a *new* decision cut; US-centric for Orbit brand
- **analytics_fit:** spatiotemporal aggregation / demand prediction / queueing
- **mechanism_object:** trip cloud → zone-hour demand → capacity gap
- **candidate_questions:**
  - Where should fleet / curb capacity sit in the next peak hour window?
- **vs_rates_rise:** Clear domain leap; scale showcase; weaker Nordic/EU fit
- **freeze_path:** yes — zone-hour aggregates only
- **risks:** “big for big’s sake”; tourist dashboard
- **scores:** D3 V5 A3 X5 E3 → **score_sum 19**
- **verdict:** park (strong runner if mobility thesis wins)

### openfundex-distress

- **kind:** external
- **source:** [idleengine/openfundex](https://huggingface.co/datasets/idleengine/openfundex) — ~357k SEC fundamentals + distress labels, temporal splits
- **license_access:** open (SEC-sourced)
- **domain:** corporate distress / credit-like
- **scale:** hundreds of thousands of firm-periods — solid but smaller than 13F/TLC
- **complexity:** 4 — leakage, label definition, accounting changes
- **challenge:** Overlaps Home Credit *decision shape* (cut-off / risk) without consumer micro feel
- **analytics_fit:** ML distress / Altman-Piotroski enriched classification
- **mechanism_object:** filing ratios → distress score → watchlist cut
- **candidate_questions:**
  - Which names clear a distress watch cut before the next reporting window?
- **vs_rates_rise:** Corporate vs household; overlaps `home-credit-pd` analytically
- **freeze_path:** yes
- **risks:** second scorecard story; choose Home Credit *or* this, not both first
- **scores:** D4 V3 A5 X4 E3 → **score_sum 19**
- **verdict:** park

### hfcs-scientific

- **kind:** external
- **source:** [ECB HFCS](https://www.ecb.europa.eu/stats/ecb_surveys/hfcs/html/index.en.html) research microdata (ASTRA); wave 5 expected ~summer 2026
- **license_access:** scientific-use application (CV, ID, confidentiality) — **not** drop-in Orbit open data
- **domain:** household finance / mortgages
- **scale:** household micro across euro area — true distributional depth for rates lane
- **complexity:** 5 — weights, multiple imputation, country coverage gaps
- **challenge:** Cannot publish raw rows; Orbit story must show *aggregates you computed*; access latency
- **analytics_fit:** weighted stress / buffer / fixation cuts (data-ladder step 3)
- **mechanism_object:** household → buffer → floating∩thin sleeve (observed)
- **candidate_questions:**
  - Where does rate pressure concentrate by country × income once buffers are measured, not simulated?
- **vs_rates_rise:** Deepens story 1 rather than proving a second domain
- **freeze_path:** yes — only derived aggregates + methods note
- **risks:** access delay; looks like Rates v2 not system v2
- **scores:** D5 V4 A5 X2 E1 → **score_sum 17**
- **verdict:** park (plan access in parallel; not first shortlist pick)

### portbench-raw

- **kind:** external
- **source:** [AgenticFinLab/PortBench-RawData](https://huggingface.co/datasets/AgenticFinLab/PortBench-RawData) — 183 assets, 2015–2025, FRED+Yahoo+…
- **license_access:** mixed upstream (Yahoo/FRED/Kaggle)
- **domain:** multi-asset allocation
- **scale:** aligned daily panels — moderate
- **complexity:** 3
- **challenge:** Overlaps Ledger / live board; weak “big data” claim
- **analytics_fit:** portfolio construction bench
- **mechanism_object:** asset class mix → policy → allocation
- **candidate_questions:** Which multi-asset rule clears the change bar on this sample?
- **vs_rates_rise:** Markets again
- **freeze_path:** yes
- **risks:** third investing story
- **scores:** D3 V2 A4 X3 E3 → **score_sum 15**
- **verdict:** park

### opensky-adsb

- **kind:** external
- **source:** [OpenSky Network](https://opensky-network.org/data/)
- **license_access:** free REST subset; full historical Trino for affiliated research / commercial license
- **domain:** aviation
- **scale:** massive ADS-B state vectors
- **complexity:** 4
- **challenge:** Access gate for the truly big slice; weak default decision cut for Orbit pitch
- **analytics_fit:** trajectory / congestion
- **mechanism_object:** track cloud → sector congestion
- **candidate_questions:** (weak without ops partner) Where does en-route congestion warrant reroute attention?
- **vs_rates_rise:** Domain leap
- **freeze_path:** limited without research access
- **risks:** cannot ship honest “big” claim on public REST alone
- **scores:** D2 V3 A3 X2 E3 → **score_sum 13**
- **verdict:** reject

### fema-nfip

- **kind:** external
- **source:** [OpenFEMA NFIP Redacted Policies v3](https://www.fema.gov/openfema-data-page/nfip-redacted-policies-v3) (~74.3M) + [Claims v3](https://www.fema.gov/openfema-data-page/nfip-redacted-claims-v3) (~2.7M); free API
- **license_access:** open US government
- **domain:** climate / flood insurance
- **scale:** among the largest open insurance corpora publicly available
- **complexity:** 4 — policy periods vs claims, SFHA zones, repetitive loss, map vintage
- **challenge:** US-centric for Orbit brand; easy map dashboard without a cut
- **analytics_fit:** concentration / repeat-loss / severity models; spatial risk
- **mechanism_object:** policy book → zone / water-depth → claim severity → cut or reprice
- **candidate_questions:**
  - Which flood zones and repeat properties should a climate book cut or reprice first?
  - Where does claim severity concentrate once exposure is held constant?
- **vs_rates_rise:** Climate risk domain; true scale showcase
- **freeze_path:** yes — DuckDB/parquet aggregates → figures (never ship 74M to Next)
- **risks:** US-only story; political sensitivity of flood maps
- **scores:** D4 V5 A4 X5 E3 → **score_sum 21**
- **verdict:** shortlist

### traficom-vehicles-fi

- **kind:** external
- **source:** [Traficom open data for vehicles](https://tieto.traficom.fi/en/open-data) — full in-use fleet register extract
- **license_access:** CC BY 4.0
- **domain:** mobility / EV transition (Finland)
- **scale:** **5,206,750** rows · ~916 MB CSV (as of 2026-06-30 material date)
- **complexity:** 3 — motive power, age, region, use class
- **challenge:** Register snapshot ≠ longitudinal panel unless multi-vintage; analytics can stay descriptive
- **analytics_fit:** segmentation / transition curves / regional concentration
- **mechanism_object:** national fleet → motive-power mix → region zoom → policy watchpoints
- **candidate_questions:**
  - Where is Finland’s EV transition actually concentrated — and what should policy watch next?
  - Which vehicle cohorts still dominate emissions exposure in Uusimaa vs rest of FI?
- **vs_rates_rise:** Strong Helsinki/FI differentiator; open micro-register at millions of rows
- **freeze_path:** yes — regional/motive aggregates
- **risks:** becomes a pie-chart EV story without a hard cut
- **scores:** D4 V4 A3 X5 E4 → **score_sum 20**
- **verdict:** shortlist*

### digitraffic-tms-raw

- **kind:** external / api
- **source:** [Digitraffic TMS raw history](https://www.digitraffic.fi/en/road-traffic/lam/) — one CSV per station×day of vehicle passages
- **license_access:** open (Fintraffic Digitraffic terms)
- **domain:** road ops / congestion (Finland)
- **scale:** vehicle-level event stream across national TMS network (years × stations × passages) — true big data
- **complexity:** 4 — station metadata joins, class/speed filters, peak definition
- **challenge:** ETL volume; decision must be corridor intervention not “pretty traffic”
- **analytics_fit:** peak detection / anomaly / queueing proxies from headways
- **mechanism_object:** passage stream → corridor load → peak hour → intervene queue
- **candidate_questions:**
  - Which corridors need intervention before the next peak congestion window?
- **vs_rates_rise:** FI ops; pairs with Traficom fleet or ENTSO-E energy for Nordic system stories
- **freeze_path:** yes — station-hour aggregates only
- **risks:** engineering demo without policy cut; storage during analysis
- **scores:** D4 V5 A3 X5 E3 → **score_sum 20**
- **verdict:** shortlist*

### acs-pums-housing

- **kind:** external
- **source:** [ACS PUMS](https://www.census.gov/programs-surveys/acs/microdata.html) / [IPUMS USA](https://usa.ipums.org/usa/acs.shtml) housing + person files
- **license_access:** open Census; IPUMS free account for extracts
- **domain:** housing affordability
- **scale:** millions of housing-unit / person micro records (1-year ~1% / 5-year ~5% of US pop)
- **complexity:** 4 — weights (WGTP), PUMA geography, renter vs owner cost defs
- **challenge:** US geography; must use weights honestly; cost-burden defs contested
- **analytics_fit:** weighted burden rates, counterfactual income shocks, regional compare
- **mechanism_object:** household → shelter cost / income → burden band → cut (move / subsidy / cut spend)
- **candidate_questions:**
  - Where is housing cost burden forcing the sharpest cut in discretionary capacity?
  - Which PUMAs flip into severe burden under a +200 bp mortgage / rent shock?
- **vs_rates_rise:** Affordability (backlog theme); open microdata vs synthetic book
- **freeze_path:** yes — weighted PUMA figures
- **risks:** US-centric; looks like Census dashboard
- **scores:** D5 V4 A4 X5 E3 → **score_sum 21**
- **verdict:** shortlist*

### ieee-cis-fraud

- **kind:** external
- **source:** [IEEE-CIS Fraud Detection](https://www.kaggle.com/c/ieee-fraud-detection) (Vesta) — ~590,540 CNP txns, ~3.5% fraud
- **license_access:** Kaggle competition terms
- **domain:** payments fraud
- **scale:** mid-hundreds of thousands with rich anonymized features
- **complexity:** 4 — severe imbalance, entity fingerprinting, threshold economics
- **challenge:** Overlaps Home Credit *cut-off* grammar; anonymized features hurt mechanism storytelling
- **analytics_fit:** ML + precision/recall operating point
- **mechanism_object:** transaction → score → accept/challenge/decline frontier
- **candidate_questions:**
  - Where should the fraud challenge threshold sit given false-positive customer cost?
- **vs_rates_rise:** Payments domain; weaker “raw big” than NFIP/TLC/13F
- **freeze_path:** yes
- **risks:** second scorecard film; opaque V-features
- **scores:** D4 V3 A5 X3 E3 → **score_sum 18**
- **verdict:** park

### eu-silc-lfs-puf

- **kind:** external
- **source:** [Eurostat SILC PUF](https://ec.europa.eu/eurostat/web/microdata/public-microdata/statistics-on-income-and-living-conditions) / [LFS PUF](https://ec.europa.eu/eurostat/web/microdata/public-microdata/labour-force-survey)
- **license_access:** open download
- **domain:** income / labour
- **scale:** country×year file packs — not millions of real rows in the public SILC case
- **complexity:** 2
- **challenge:** SILC PUFs are **fully synthetic**; LFS PUFs are for training code, not publication-grade claims
- **analytics_fit:** practice only
- **mechanism_object:** n/a for honest Orbit evidence
- **candidate_questions:** none defensible for publish
- **vs_rates_rise:** Tempting EU brand; fails epistemic rule
- **freeze_path:** would invent observed-looking evidence
- **risks:** hard fail — synthetic as “evidence”
- **scores:** D1 V1 A1 X5 E3 → **score_sum 11**
- **verdict:** reject

---

## Local candidates

### home-credit-pd

- **kind:** local
- **repo_path:** `PowerBI/11-credit-risk`
- **source:** Home Credit Default Risk (Kaggle / Hugging Face mirror); scripts `download-homecredit.py`, `score-pd.py`
- **license_access:** open (competition terms — attribute; not bank production data)
- **domain:** consumer credit / PD
- **scale:** ~80k applications in gold `DimApplication`; ~84 MB gold folder (largest local corpus)
- **complexity:** 4 — high-dim application features, train/test/OOT, calibration, PSI
- **challenge:** Sample scorecard ≠ production IRB; leakage discipline; cut-off is a policy choice not a pure ML metric
- **analytics_fit:** ML+explain (PD) + policy frontier (acceptance vs risk)
- **mechanism_object:** application → PD → grade band → accept/reject frontier
- **candidate_questions:**
  - Where should the cut-off sit given a volume / expected-loss budget?
  - Is the champion scorecard still calibrated on new business (PSI / OOT)?
- **vs_rates_rise:** Loan *origination* policy vs mortgage *buffer under rate shock*; real tabular ML vs seeded book
- **freeze_path:** yes — already gold + `ModelMetrics` / ROC / cutoff curves → freeze subset into `data/figures/`
- **risks:** dashboard trap (re-skin Credit Risk Pulse); inventing “bank” authority; Kaggle sample caveats must stay on-screen
- **scores:** D5 V4 A5 X4 E4 → **score_sum 22**
- **verdict:** shortlist

### olist-logistics

- **kind:** local
- **repo_path:** `PowerBI/04-supply-chain`
- **source:** Brazilian E-Commerce Public Dataset by Olist (Kaggle)
- **license_access:** open (CC BY-NC-SA — check Orbit publish constraints)
- **domain:** logistics / demand
- **scale:** raw ~65 MB; ~99k orders, ~113k order-items; gold forecast + corridor tables
- **complexity:** 3 — multi-table joins, late definition, forecast PI
- **challenge:** NC license; Brazil marketplace ≠ Nordic ops claim; forecast is sample model
- **analytics_fit:** simulation / forecast with 80% prediction intervals + seller risk queue
- **mechanism_object:** order → lead time → on-time/late → seller/corridor · weekly demand ribbon
- **candidate_questions:**
  - Which sellers or corridors should ops intervene on before the next forecast window?
  - Where does late delivery concentrate once volume is held constant?
- **vs_rates_rise:** Ops/time mechanism; multi-entity event stream vs rate→buffer
- **freeze_path:** yes — gold already has forecast + corridor facts
- **risks:** CC BY-NC-SA may block commercial Orbit framing; overlap with `olist-cx-reviews`
- **scores:** D4 V4 A4 X4 E4 → **score_sum 20**
- **verdict:** shortlist

### uci-diabetes-readmit

- **kind:** local
- **repo_path:** `PowerBI/06-healthcare-analytics`
- **source:** UCI Diabetes 130-US Hospitals (1999–2008); gold from encounters
- **license_access:** open (CC BY 4.0)
- **domain:** hospital quality / readmission
- **scale:** ~35k encounters, ~30k patients in gold; raw UCI noted under `data/raw/`
- **complexity:** 4 — clinical codes, pathway Sankey, propensity label `<30`
- **challenge:** US 1999–2008 ≠ current EU care; ethics of clinical storytelling; model is sample propensity
- **analytics_fit:** ML propensity + pathway structure
- **mechanism_object:** encounter → pathway → disposition → 30-day readmit risk
- **candidate_questions:**
  - Which discharges belong on the 30-day watch queue under capacity constraints?
  - Which admission→disposition paths carry disproportionate readmit mass?
- **vs_rates_rise:** Clinical pathway object; different domain entirely
- **freeze_path:** yes — gold + heat/pathway bridges
- **risks:** overclaim clinical authority; PHI not present but tone must stay careful
- **scores:** D5 V4 A4 X5 E2 → **score_sum 20** (E lower: clinical editorial care)
- **verdict:** shortlist

### olist-cx-reviews

- **kind:** local
- **repo_path:** `PowerBI/08-customer-experience`
- **source:** Olist reviews (+ orders linkage)
- **license_access:** open (same Olist / NC check)
- **domain:** CX / VoC
- **scale:** ~96k reviews; ~49 MB gold
- **complexity:** 3 — text themes + logistic detractor propensity
- **challenge:** Same underlying marketplace as logistics; delivery lateness dominates score (easy story, less novel vs 04)
- **analytics_fit:** ML+explain (detractor probability)
- **mechanism_object:** order timing → review score → detractor risk → recovery queue
- **candidate_questions:**
  - Which late deliveries should recovery prioritize by detractor probability × volume?
- **vs_rates_rise:** CX queue; weaker differentiation if 04 already shortlisted
- **freeze_path:** yes
- **risks:** duplicate Olist; NC license
- **scores:** D4 V4 A4 X3 E4 → **score_sum 19**
- **verdict:** park (prefer `olist-logistics` unless CX is the chosen thesis)

### ledger-research

- **kind:** local (alias)
- **prefer:** `live-ledger-research`
- **repo_path:** `investing/` (+ `PowerBI/12-investing-desk` gold)
- **notes:** Local caches + PBIX mirror of the live research snapshot. Scores live under `live-ledger-research`.

### ecommerce-churn

- **kind:** local
- **repo_path:** `PowerBI/02-ecommerce-churn`
- **source:** e-commerce churn CSV (portfolio sample)
- **license_access:** open / sample (confirm upstream attribution in project Context page)
- **domain:** retention
- **scale:** ~5,630 customers — small
- **complexity:** 2
- **challenge:** Fails scale criterion for this IDS leap; analytics already told in PBIX
- **analytics_fit:** ML propensity + drivers
- **mechanism_object:** customer → propensity → at-risk queue
- **candidate_questions:**
  - Whom should retention contact first under a fixed outreach budget?
- **vs_rates_rise:** Clear domain leap; weak size
- **freeze_path:** yes
- **risks:** “big data” claim would be dishonest
- **scores:** D5 V3 A4 X4 E1 → **score_sum 17**
- **verdict:** park

### bank-value-engagement

- **kind:** local
- **repo_path:** `PowerBI/05-bank-segmentation`
- **source:** Simulated retail bank SQL sample (Nigerian name seed upstream README)
- **license_access:** synthetic / open within repo
- **domain:** retail bank CRM
- **scale:** 5k customers, ~113k transactions
- **complexity:** 3 — RFM + k-means + geo
- **challenge:** Synthetic → cannot claim observed banking truth; closer to Rates’ illustrative book than evidence leap
- **analytics_fit:** clustering / RFM
- **mechanism_object:** customer → segment → dormancy / cross-sell queue
- **candidate_questions:**
  - Which dormant / single-product relationships should relationship managers work first?
- **vs_rates_rise:** Weak — another synthetic book story
- **freeze_path:** yes
- **risks:** inventing evidence; dashboard remake
- **scores:** D4 V3 A3 X3 E2 → **score_sum 15**
- **verdict:** park

### when-rates-rise-book

- **kind:** local
- **repo_path:** `storytelling/` (`data/figures/when-rates-rise.v2.json` + `src/lib/sim/rate-buffer-book.ts`)
- **related_live:** `live-eu-finance-mcp` (macro rhyme-check refresh)
- **source:** calibrated synthetic mortgage book + ECB published aggregates (evidence pack v2)
- **license_access:** own + cited ECB public series
- **domain:** mortgage / rates
- **scale:** seeded ~2k loans (mechanism); evidence is aggregate
- **complexity:** 3
- **challenge:** Insight ceiling is the reason for story 2
- **analytics_fit:** simulation + rhyme-check
- **mechanism_object:** rate → payment → buffer → floating∩thin sleeve
- **candidate_questions:** (shipped) Where should a PM cut when rates rise?
- **vs_rates_rise:** n/a — this *is* story 1
- **freeze_path:** shipped
- **risks:** —
- **scores:** —
- **verdict:** in-use

### helsinki-nuuka-energy

- **kind:** local (alias)
- **prefer:** `live-helsinki-nuuka`
- **repo_path:** `PowerBI/07-helsinki-energy`
- **notes:** Planned PBIP + fetch scripts; live API scored under `live-helsinki-nuuka`.

### sales-executive

- **kind:** local
- **repo_path:** `PowerBI/03-sales-executive`
- **source:** AdventureWorks-style / portfolio sales CSVs
- **license_access:** sample
- **domain:** sales ops
- **scale:** ~60k fact sales rows
- **complexity:** 2
- **challenge:** Classic BI star schema; weak IDS decision cut beyond “look at KPIs”
- **analytics_fit:** descriptives
- **mechanism_object:** unclear for a film
- **candidate_questions:** (weak) Where is growth vs margin tension in the portfolio?
- **vs_rates_rise:** Domain leap only
- **freeze_path:** yes but low value
- **risks:** dashboard remake
- **scores:** D2 V2 A1 X4 E4 → **score_sum 13**
- **verdict:** reject

### nordic-equity-heatmap

- **kind:** local (alias)
- **prefer:** `live-nordic-equity-board`
- **repo_path:** `PowerBI/01-finance`
- **notes:** Gold + PBIX companion to the live Vercel board.

### investing-desk-gold

- **kind:** local
- **repo_path:** `PowerBI/12-investing-desk`
- **prefer:** `live-ledger-research`
- **source:** Derived gold from Ledger / Nordic prices (~365 KB gold)
- **license_access:** same as Ledger
- **domain:** portfolio
- **scale:** small derived tables
- **complexity:** 3
- **challenge:** Duplicate of live Ledger for catalogue purposes
- **analytics_fit:** simulation summaries
- **mechanism_object:** sleeves / mandate / rebalance
- **candidate_questions:** same as `live-ledger-research`
- **vs_rates_rise:** see live Ledger
- **freeze_path:** yes
- **risks:** double-count
- **scores:** D4 V3 A3 X4 E1 → **score_sum 15**
- **verdict:** park (alias of live Ledger)

---

## Process

1. ~~Seed existing-repo batch~~ + ~~live/API batch~~ + ~~external online seed~~ + ~~deeper pass (FEMA/Traficom/Digitraffic/ACS)~~.
2. ~~Human pick by highest score → `home-credit-pd` (22)~~.
3. ~~Decision Spec for `home-credit-pd` (no deep re-pull until Spec exists)~~.
4. ~~Analysis notebook → freeze evidence → manifest → visuals~~ — shipped as `where-should-the-cutoff-sit`.
5. ~~Round D: re-score the parked shortlist for craft stress (story 3)~~ → recommended `digitraffic-tms-raw` (25).
6. ~~Verify the Round D assumptions before committing~~ → format, metadata and licence pass; the
   propagation lag fails, so `digitraffic-tms-raw` falls to **23** and no candidate is clearly ahead.
7. Human pick for story 3 on the revised scores, then a Decision Spec.

Catalogue stays closed to new candidates. It reopens only to re-score parked rows when a shipped
capability changes what a story can be — Round D is the pattern.
