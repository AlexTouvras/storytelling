# Decision Spec — How much fast reserve should the grid hold?

> Flagship story for engine spec v3 (`docs/STORYTELLING_ENGINE_SPEC_V3.md` §16).
> Catalogue pick: `fingrid-grid-inertia`, Round F (flagship_sum 32 of 35). **Picked by the human 2026-09-27.**
> **Status:** draft, awaiting sign-off. No freeze, manifest or visual work starts before that.
> **Film title (proposed):** *When the spinning stops*
> **Slug (proposed):** `how-much-fast-reserve`. The slug keeps the decision, as story 3 did.

Companion: `docs/FLAGSHIP.md`, `docs/DATASET_CATALOGUE.md` (Round F).

---

## Decision frame

| Element | Content |
|---------|---------|
| **Decision-maker** | Reserve planner at Fingrid, Finland's grid operator, sizing Fast Frequency Reserve (FFR) hour by hour as Finland's share of the Nordic need |
| **Stake** | If a large plant trips and frequency falls below 49.0 Hz, the grid starts shedding load; automatic disconnection of customers begins at 48.8 Hz. Every MW of reserve bought for an hour is paid for whether or not anything trips |
| **QUESTION** | How much fast reserve should the grid hold when there is less spinning mass to hold it up? |
| **CLAIM (draft)** | The grid does not need to be kept spinning; it needs to be caught faster. In a low-inertia hour, a few hundred MW that react within a second do what tens of GWs of extra spinning mass would |
| **MECHANISM** | A plant trips → the rest of the grid's spinning mass (inertia, as kinetic energy in GWs) gives up energy and slows → frequency falls at a rate set by loss ÷ inertia → fast reserve switches on at 49.7/49.6/49.5 Hz within 1.3/1.0/0.7 s → disturbance reserve (FCR-D) ramps over seconds → the fall stops (the nadir) → slower reserves restore 50 Hz over minutes |
| **VISUAL OBJECT** | A field of hours, one dot per hour of the year placed by the grid's kinetic energy. One hour opens into the grid as a machine: spinning wheels on one shaft, a plant that drops out, and fast hands that catch the shaft |
| **EVIDENCE** | Observed 10 Hz frequency (Fingrid 339); observed hourly kinetic energy (Fingrid 260) and FFR procured (Fingrid 276); published grid-operator figures (Nordic TSOs 2025, FFR design 2024, Ørum et al. 2017). Model output is labelled modelled |
| **COUNTERPOINT** | Keep inertia instead: synchronous condensers or holding thermal units online. Buying 0.1 Hz of nadir at 80 GWs takes about 20 GWs of extra kinetic energy (Ørum et al. 2017). The other lever is to cap the largest unit, which the operators use only in exceptional hours |
| **UNCERTAINTY** | Kinetic energy is itself an operator estimate; the model is one-bus and ignores regional oscillation; trips are unattributed in the open data; Finland's FFR is one share of a Nordic need |
| **TAKEAWAY (draft)** | Size fast reserve to the hour's inertia, and watch the hours below 150 GWs: they went from 88 in 2022 to 339 in 2024 |

**Epistemic rule:** the trace of a real event is `observed`. Hours, kinetic energy and FFR volumes are `observed` (operator data). Published thresholds and simulations are `observed (published)`, with the source named on screen. Anything produced by our model is `modeled`. The illustration is `illustrative`: its wheels do not have real masses, and the film says so.

---

## Why this story, and why this medium

- **New domain.** Rates, credit cut-offs and rail are taken. This is energy-system operations, Nordic, with open CC BY 4.0 data.
- **A chart is not enough.** Inertia cannot be seen in a frequency chart. The chart shows a fall; it cannot show *why* the same loss falls further on a summer night. The film needs one illustration: the wheels. That is spec v3's test.
- **Data → illustration → data is natural.** An hour in the year opens into the machine running at that hour's inertia, the trip plays, and the hour closes back into the field with its nadir now shown. That is exactly the transition Gate 2 proved.
- **Multiple scales.** A tenth of a second, an event lasting a minute, a year of hours, and the 2022–2024 trend.
- **Story 3's lesson.** Story 3 was unlisted for density. This one keeps **one mechanism and six beats**, and puts at most one figure in a sentence.

---

## Evidence

### Published, cited on screen (observed, published)

| Figure | Value | Source |
|--------|-------|--------|
| Frequency floor after the reference incident | 49.0 Hz; load shedding starts at 48.8 Hz | Nordic TSOs, *Requirements for minimum inertia*, 28 Aug 2025 |
| Reference incident | Oskarshamn 3, 1,450 MW. Olkiluoto 3 counts as 1,300 MW because its protection scheme sheds 300 MW of load | same |
| Design kinetic energy for FCR-D | 150 GWs: FCR-D alone holds 49.0 Hz above this | same |
| Stability level | 120 GWs; stability is challenged around 90 GWs | same |
| Very low inertia reference case | 100 GWs: about 300 MW of Nordic FFR keeps the reference trip above 49.0 Hz | same, and FFR Design of Requirements 2024 |
| The cost of inertia instead | About 20 GWs of extra kinetic energy moves the nadir 0.1 Hz at 80 GWs | Ørum et al. 2017, via Energinet FFR methodology |
| Inertia KPIs | Min 138 / 127 / 131 GWs, mean 193 / 194 / 194 GWs in 2022 / 2023 / 2024 | Nordic TSOs 2025, Table 1 |
| Hours below 150 GWs | 243, 559, 88, 237, 339 (2020–2024); hours below 120 GWs: 0 except 52 in 2021 | same |
| FFR product | Activation 49.7 Hz / 1.3 s, 49.6 Hz / 1.0 s, 49.5 Hz / 0.7 s; Fingrid procures 0–60 MW, mostly spring to autumn | Fingrid FFR product page |

### Measured by us (observed)

- **Frequency events.** Fingrid dataset 339 at 10 Hz, keyless. A year of events is scanned below; the method median-filters over 9 samples, because the raw data has 1–2-sample spikes that would otherwise read as near-misses at 49.01 Hz.
- **The event the film opens on (proposed):** 2026-06-01 17:44:06. Frequency falls 49.97 → 49.65 Hz in about 6 s (steepest about 0.2 Hz/s), rebounds to 49.79 Hz within 20 s and holds, then recovers over minutes.
- **Hour-shift deviations are a different mechanism.** Some dips land exactly on the hour, when market schedules step. The film must not present them as trips; they are separated by timestamp and excluded from the event field.

**Year scan, 2025-08 → 2026-07** (`scripts/scan-grid-events.py`; 311M samples, gap share at most 0.16% in any month):

| | Count |
|---|---:|
| Sustained falls (more than 100 mHz within 5 s, after the median filter) | 36 |
| On the hour (hour-shift, excluded) | 3 |
| Trip-like events | 33 |
| … of which April–September | 26 |
| … with a nadir below 49.8 Hz | 5 |
| Deepest | 49.65 Hz (2026-06-01 17:44), then 49.71 Hz (2026-07-19 12:56) |

- **Nothing came near the floor.** No event in the year fell below 49.6 Hz. The film must say that the system held every time. The story is about the margin, not a near-miss.
- **The seasonal cluster is not yet explained.** A fixed detection threshold counts a trip only if it falls far enough, and the same loss falls further when inertia is low. So 26 of 33 in spring and summer could be low inertia, more trips (maintenance season), or both. Pairing each event with its hour's kinetic energy (dataset 260) separates the two. Until then the film may not claim either.

### Needs the Fingrid API key (not yet pulled)

- Hourly kinetic energy (dataset 260), to place every hour and to pair each event with its hour's inertia.
- FFR procured (276) and forecast (278), to show where Fingrid actually bought reserve.

The key is free. It goes in as a secret named `FINGRID_API_KEY`.

---

## Model (analysis contract)

| Item | Decision |
|------|----------|
| Form | One-bus swing equation: df/dt = f₀ · (−loss + FCR-D + FFR + load relief) / (2 · kinetic energy) |
| FCR-D | Linear between 49.9 and 49.5 Hz up to 1,450 MW, first-order lag |
| FFR | Step to its volume at its activation frequency, over its activation time |
| Calibration targets | (a) 150 GWs, no FFR, 1,450 MW → nadir 49.0 Hz; (b) 100 GWs with about 300 MW FFR → nadir 49.0 Hz; (c) about 20 GWs of extra mass per 0.1 Hz at 80 GWs |
| First fit (2026-09-27) | Hits (a) exactly and gets (b) and (c) in shape but not size: 49.09 Hz instead of 49.0, and 12 GWs instead of 20. **Good enough to draw the shape, not to quote.** Headline numbers come from the published figures, never from the model |
| Validation to do | With dataset 260, back out each observed event's loss from its initial fall and check that the model reproduces its nadir time and depth |
| Output | Three curves for the reference trip — 190 GWs (a typical hour), 150 GWs, 100 GWs — each with and without FFR, labelled modelled |

---

## Uncertainty & scenarios

| Lens | What the reader should feel |
|------|-----------------------------|
| **Same loss, less mass** | The reference trip on a typical hour vs a low-inertia hour: the same loss, a steeper fall, a deeper nadir |
| **Catch vs carry** | 300 MW of fast reserve against 20 GWs of spinning mass for the same safety margin |
| **The hours are moving** | Hours below 150 GWs rose again in 2023 and 2024. The operators note a year-to-year weather effect; the film states the trend and the caveat together |
| **What we do not claim** | That the grid is unsafe; that any real event breached 49.0 Hz; which unit tripped on any day; a forecast of future inertia |

---

## Narrative arc (six beats)

Following the v3 pipeline: for each insight, what must the reader understand, and which representation shows it best.

| # | Beat | Reader must understand | Representation | Grammar | Kind |
|---|------|------------------------|----------------|---------|------|
| 0 | **Fifty** | The whole Nordic grid turns at one speed, 50 Hz, and it is never exactly still | Live-looking 10 Hz trace of a quiet minute, one number | `reveal` | observed |
| 1 | **A trip** | A real loss: 1 June 2026, 17:44 | The same trace, the event; camera follows the fall to the nadir | `trace` + `annotate` | observed |
| 2 | **Inside the hour** | The fall is spinning mass giving up energy. How far it falls depends on how much mass is spinning | The event's hour opens into the illustration: wheels on one shaft, one plant drops out, the shaft slows | camera FOCUS → MORPH → trigger | illustrative |
| 3 | **Fewer wheels** | On a light, windy night there is less mass, so the same loss falls faster and deeper | Same illustration with fewer wheels; the modelled 100 GWs curve drawn beside it; then fast reserve catches the shaft | `compare` + trigger | modeled |
| 4 | **Every hour** | Low-inertia hours are few but growing, and they are where fast reserve is bought | The illustration closes into its dot; PULLBACK to the year of hours by kinetic energy, with the 150 GWs line and the FFR hours lit | `zoom` + `filter` | observed |
| 5 | **Catch it faster** | Buy speed, not mass: about 300 MW of fast reserve vs about 20 GWs of spinning mass for the same margin | Decision card with the published figures and the trend (88 → 237 → 339 hours) | `highlight` | observed (published) |

**Atmosphere:** none by default. The trace and the field are the atmosphere.

**Operable sleeve (optional, after the film):** one slider for an hour's kinetic energy (100–250 GWs) and one for FFR (0–400 MW), redrawing the modelled nadir with the 49.0 Hz line. Labelled modelled. Cut if beat 5 already lands.

---

## Illustration brief (Rive)

One artboard, **Grid**:
- A shaft with wheels (spinning generators). The number of wheels is driven by the hour's kinetic energy.
- One larger wheel that drops out on a `trip` trigger.
- Hands (fast reserve) that grab the shaft on a `catch` trigger.

States: `steady` → `tripped` (shaft slows) → `caught` (slowing stops) → `held`.

This needs a **number input** (or data binding) for the wheel count. The `.riv` writer so far emits only triggers and booleans. Decide state-machine inputs versus data binding before building it (open in `.state/BACKLOG.md`).

---

## Beat × visual-grammar map (Layer 2)

| Beat | Primary behaviour | Notes |
|------|-------------------|-------|
| Fifty | `reveal` | Trace only; no chrome |
| A trip | `trace` + `annotate` | The camera follows the fall and stops at the nadir; three labels at most |
| Inside the hour | FOCUS → MORPH → trigger | Gate 2 transition; the hour-dot is the entity |
| Fewer wheels | `compare` + trigger | Two machines, two curves at most |
| Every hour | PULLBACK + `filter` | Same dot, now among 8,760 |
| Catch it faster | `highlight` | Decision card and limitations |

New `visualId`s go through `SceneRenderer` only when implementing.

---

## Out of scope for v1

- Regional or multi-bus dynamics, oscillation damping, voltage
- Attributing any trip to a named plant (unless Fingrid's own disturbance report names it)
- Market prices of reserves
- Forecasting future inertia (the operators' 2035/2045 scenarios may be cited, not modelled)
- Anything that implies the grid is unsafe today

---

## Definition of done (this Spec)

- [ ] Human approves Question / Claim / Takeaway / limitations
- [ ] Fingrid API key added; kinetic energy and FFR pulled and checked
- [ ] Model validated against observed events with their hour's kinetic energy
- [ ] Evidence pack frozen with kind tags
- [ ] Beat list stable enough to write narration and visual states
