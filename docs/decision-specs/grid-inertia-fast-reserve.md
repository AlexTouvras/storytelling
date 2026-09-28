# Decision Spec — How much fast reserve should the grid hold?

> Flagship story for engine spec v3 (`docs/STORYTELLING_ENGINE_SPEC_V3.md` §16).
> Catalogue pick: `fingrid-grid-inertia`, Round F (flagship_sum 32 of 35). **Picked by the human 2026-09-27.**
> **Status:** approved as drafted, 2026-09-27. The human replied "Continue" to this draft; it is read as sign-off on Question, Claim, Takeaway and limitations. Object here and it goes back to draft.
> **Built so far:** frequency model (`src/lib/sim/grid-frequency.ts`) and its check against measured trips (`grid-validation.ts`), evidence pack v1 with kinetic energy and FFR (`data/figures/how-much-fast-reserve.v1.json`), illustration `src/illustrations/grid.riv` (lab at `/lab/grid`). No manifest or route yet.
> **Since sign-off (2026-09-28):** the key's data changed three things, flagged for the human: the trip count (19, not 33); the seasonal cluster (now partly explained, see Evidence); and a much stronger trend (584 hours below 150 GWs in May–July 2026, our count). The takeaway can carry the 2026 figure; the Question and Claim are unchanged.
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
| **VISUAL OBJECT** | A field of hours, one dot per hour of the year placed by the grid's kinetic energy. One hour opens into the grid as a machine: spinning wheels on one shaft, a plant that drops out, a dial against the floor, and fast reserve that fires on its own to catch the fall |
| **EVIDENCE** | Observed 10 Hz frequency (Fingrid 339); observed hourly kinetic energy (Fingrid 260) and FFR procured (Fingrid 276); published grid-operator figures (Nordic TSOs 2025, FFR design 2024, Ørum et al. 2017). Model output is labelled modelled |
| **COUNTERPOINT** | Keep inertia instead: synchronous condensers or holding thermal units online. Buying 0.1 Hz of nadir at 80 GWs takes about 20 GWs of extra kinetic energy (Ørum et al. 2017). The other lever is to cap the largest unit, which the operators use only in exceptional hours |
| **UNCERTAINTY** | Kinetic energy is itself an operator estimate; the model is one-bus and ignores regional oscillation; trips are unattributed in the open data; Finland's FFR is one share of a Nordic need |
| **TAKEAWAY** | Size fast reserve to the hour's inertia, and watch the hours below 150 GWs: 88 in 2022, 339 in 2024 (published), and 584 in May–July 2026 alone (our count) |

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

### Measured by us (observed, and calculated from observed)

Pack: `data/figures/how-much-fast-reserve.v1.json`, frozen by `scripts/freeze-grid-inertia.py` from `scripts/scan-grid-events.py` (10 Hz frequency, dataset 339, keyless) and `scripts/fetch-fingrid.py` (kinetic energy 260 and FFR procured 276, keyed). Window 2025-08 → 2026-07.

- **Time zone.** The 10 Hz archive is in Finnish local time (29 March 2026 has no 03:00 hour). The API datasets are UTC. Every event carries both.
- **The event the film opens on:** 1 June 2026. The fall begins at 17:44:06.5 Finnish summer time (14:44 UTC) from 49.96 Hz and reaches 49.651 Hz 5.5 s later. It rebounds to 49.79 Hz within 20 s and holds, then recovers over minutes. That hour the grid held 170 GWs of kinetic energy and Fingrid had bought no FFR. The first second backs out a loss of about 1,100 MW, as a lower bound.
- **Not every fall is a trip.** The detector catches 33 sustained falls (more than 100 mHz within 5 s). Each is classified by its shape, and the rule was checked by eye on the borderline traces:

| Class | Count | What it is |
|---|---:|---|
| Trip | 19 | Falls at least 100 mHz below the pre-event level, bottoms out 2 s or more after onset, and is still at least 20% down 25–35 s later |
| Schedule step | 3 | Within 20 s of the hour: market schedules stepping |
| Shallow | 4 | A fall from a local peak, less than 100 mHz below the pre-event level |
| Snap-back | 3 | Fully recovered within 30 s; a lost generator leaves the frequency low for minutes |
| Fast dip | 2 | Bottoms out within 2 s, with ringing: a fault-driven swing at the measuring point dominates the reading, so its depth is not the system's (this includes 19 July, 49.71 Hz) |
| Held-then-jump | 2 | The reading holds, then steps by more than 100 mHz in one sample, which no real loss produces |

An earlier count of 33 "trips" (v0) read data gaps as 50 Hz, which faked three falls, and did not separate these shapes. It is superseded.

**Trips, 2025-08 → 2026-07:**

| | Value |
|---|---:|
| Trips | 19 |
| … April–September | 13 (2.96 per 1,000 hours) |
| … October–March | 6 (1.37 per 1,000 hours) |
| … with a nadir below 49.8 Hz | 4 |
| Deepest | 49.651 Hz (1 June 2026) |
| Median kinetic energy at trips | 168 GWs (Apr–Sep), 204 GWs (Oct–Mar); the window's median hour is 183 GWs |

- **Nothing came near the floor.** No event of any class fell below 49.6 Hz. The film must say the system held every time. The story is about the margin, not a near-miss.
- **The seasonal cluster, partly explained.** The two trips with an estimated loss of 600 MW or more fell one in each half-year. The extra spring–summer trips are smaller (median estimated loss 350 MW, against 460 MW in winter), and they happened in hours with less spinning mass. That is what lower inertia does to a fixed detection threshold: smaller losses fall far enough to be counted. Nineteen trips cannot prove it. The film may say "the trips cluster in the months with the least spinning mass", and may not say the grid trips more in summer.

**Hours (calculated from dataset 260, hourly means):**

| Year | Hours below 150 GWs (ours) | Published | Mean GWs (ours / published) |
|---|---:|---:|---|
| 2020 | 229 | 243 | 190 / 190 |
| 2021 | 534 | 559 | 195 / 195 |
| 2022 | 82 | 88 | 193 / 193 |
| 2023 | 237 | 237 | 194 / 194 |
| 2024 | 334 | 339 | 194 / 194 |
| 2025 | 299 | — | 194 / — |
| 2026, Jan–Jul | 689 | — | 187 / — |

- Our counts are 0–6% below the published ones (hourly means smooth the dips), and the means match. That validates reading dataset 260 this way.
- **2026 is a step change.** May, June and July 2026 each had about 200 hours below 150 GWs, against about 60 a month in the same months of 2024: 584 hours in three months, more than any full year the operators have published. Stated as our count from Fingrid's real-time estimate, not as a published KPI.

**Where Fingrid bought fast reserve (calculated, 260 × 276, since 2020):** in 93% of hours below 120 GWs, in about half of hours at 140–160 GWs, and in none above 200 GWs. In the window: 91% of hours at 120–140 GWs, 40% at 140–160 GWs, 9% at 160–180 GWs. Purchases are 0–62 MW an hour. Reserve is already sized to the hour's inertia; the film shows it, rather than recommending it as new.

The FFR forecast (278) was pulled and is not used: the procured volume says where reserve was held.

---

## Model (analysis contract)

| Item | Decision |
|------|----------|
| Form | One-bus swing equation: df/dt = f₀ · (−loss + FCR-D + FFR + load relief) / (2 · kinetic energy) |
| FCR-D | Linear between 49.9 and 49.5 Hz up to 1,450 MW, 0.75 s dead time, 3.5 s first-order lag; load relief 0.5 %/Hz of 40 GW |
| FFR | Step to its volume at its activation frequency, over its activation time |
| Calibration targets | (a) 150 GWs, no FFR, 1,450 MW → nadir 49.0 Hz; (b) 100 GWs with about 300 MW FFR → nadir 49.0 Hz; (c) about 20 GWs of extra mass per 0.1 Hz at 80 GWs |
| Fit (2026-09-27, `grid-frequency.test.ts`) | (a) 49.00 Hz and (b) 49.05 Hz, both within 0.05 Hz. Misses (c): about 11 GWs instead of 20; that study used the pre-2024 FCR-D requirements. **Good enough to draw the shape, not to quote.** Headline numbers come from the published figures, never from the model |
| Validation (2026-09-28, `grid-validation.test.ts`) | For each of the 19 trips, the loss is backed out from its first second at that hour's kinetic energy and pre-event frequency. The model gets the timing of the nadir right (median 7.2 s against 7.5 s observed) and falls a median **1.7× deeper** than the real trips did. That is the design case being conservative, as a sizing case should be: a real grid also has its normal-operation reserve (FCR-N, about 600 MW), more load relief and providers faster than the minimum. An exploratory run with FCR-N closes part of the gap: 1.5× with a 20 s response, 1.1× with a 6 s response that brings the nadir too early. **The film draws the model only for the design case, labelled so, and never overlays it on an observed trip as a prediction** |
| Output | Curves for the reference trip at 194 GWs (a typical hour: the 2022–2024 mean), 150 GWs and 100 GWs, each with and without FFR, labelled modelled. Modelled nadirs: 194 GWs 49.13 Hz; 100 GWs 48.73 Hz without FFR, 49.05 Hz with 300 MW |

---

## Uncertainty & scenarios

| Lens | What the reader should feel |
|------|-----------------------------|
| **Same loss, less mass** | The reference trip on a typical hour vs a low-inertia hour: the same loss, a steeper fall, a deeper nadir |
| **Catch vs carry** | 300 MW of fast reserve against 20 GWs of spinning mass for the same safety margin |
| **The hours are moving** | Hours below 150 GWs rose again in 2023 and 2024, dipped in 2025 (299, our count), then jumped in the summer of 2026. The operators note a year-to-year weather effect; the film states the trend and the caveat together |
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
| 4 | **Every hour** | Low-inertia hours are few but growing, and they are where fast reserve is bought | The illustration closes into its dot; PULLBACK to the year of hours by kinetic energy, with the 150 GWs line and the FFR hours lit (pack `hours`; FFR in 91% of the window's hours at 120–140 GWs, none above 200) | `zoom` + `filter` | observed, calculated |
| 5 | **Catch it faster** | Buy speed, not mass: about 300 MW of fast reserve vs about 20 GWs of spinning mass for the same margin | Decision card with the published figures and the trend (88 → 237 → 339 hours, published; 584 in May–July 2026, our count) | `highlight` | observed (published), calculated |

**Atmosphere:** none by default. The trace and the field are the atmosphere.

**Operable sleeve (optional, after the film):** one slider for an hour's kinetic energy (100–250 GWs) and one for FFR (0–400 MW), redrawing the modelled nadir with the 49.0 Hz line. Labelled modelled. Cut if beat 5 already lands.

---

## Illustration brief (Rive)

Built as `src/illustrations/grid.ts` → `grid.riv`, one artboard, **Grid**:
- A row of wheels on one shaft (spinning generators): 8 in a typical hour (194 GWs), 4 in a light hour (100 GWs). The count is the ratio of the two hours' kinetic energy; a light hour fades every other wheel.
- One larger violet wheel, the plant, that drops out on the `trip` trigger.
- A dial above the shaft with the 49.0 Hz floor and the 48.8 Hz shedding mark. The needle follows the modelled reference trip to scale and turns violet below the floor.
- Fast reserve is a cyan block under the shaft. It fires on its own at the sample where the modelled frequency reaches 49.6 Hz; there is no `catch` trigger, because real FFR is not dispatched by hand.
- The wheels slow visibly. That is exaggerated (a real 1 Hz fall is 2% of the speed), and the film says so; the dial is the honest reading.

Inputs: trigger `trip`; bools `tripped` (jump to the end state), `light`, `reserve`. States: `steady` → `trip <variant>` → `held <variant>`, for the four combinations of light and reserve.

No number input was needed: the story shows two hours, not a continuum, so two bools cover it. The optional sleeve, if built, draws its continuum in the data layer.

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

- [x] Human approves Question / Claim / Takeaway / limitations ("Continue", 2026-09-27)
- [x] Fingrid API key added; kinetic energy and FFR pulled and checked (yearly counts within 6% of the published KPIs)
- [x] Model checked against observed events with their hour's kinetic energy (timing right; depth 1.7× conservative)
- [x] Evidence pack frozen with kind tags (v1)
- [ ] Beat list stable enough to write narration and visual states
