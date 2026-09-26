# Architecture (working log)

> Tracked in git. Living decisions for this repo — not a substitute for root `ARCHITECTURE.md` or `docs/FLAGSHIP.md`.

## Overview

**Interactive Decision Storytelling** — Orbit flagship. Engine (Layer 1) is a boring stage; grammar (Layer 2) and decision stories (Layer 3) carry the product. Reference: `when-rates-rise`. Fixture: `rates-and-defaults`.

## Data shapes

| Name | Shape / location | Notes |
|------|------------------|-------|
| Flagship | `docs/FLAGSHIP.md` | Product positioning |
| Reference Story Spec | `docs/reference-story-spec.md` | Editorial + evidence |
| Dataset catalogue | `docs/DATASET_CATALOGUE.md` | Scored shortlist; story 2 pick `home-credit-pd` (shipped). Round D re-scores parked rows for craft stress → story 3 candidate `digitraffic-tms-raw`, awaiting human pick |
| Decision Spec (story 2) | `docs/decision-specs/home-credit-cutoff.md` | Cut-off policy story; **approved** 2026-09-25 |
| Decision Spec (story 3) | `docs/decision-specs/rail-recovery-time.md` | Rail recovery-margin story; **draft** — scope, counterfactual and picker signed off, claim upgrade and wording open. First story whose finding is a propagation rather than a cross-section, and the first with a reader-selectable line |
| Evidence pack (story 3) | `data/figures/where-should-the-recovery-time-sit.v1.json` | **Frozen**, 160 KB, 60 days. Built by `scripts/freeze-rail-recovery.py` from the raw day cache `scripts/fetch-rail-days.py` writes. Carries survival curves, per-leg margin, the margin↔survival mechanism, line separation and a five-strength counterfactual per line, each block `kind`-tagged |
| Evidence pack (story 2) | `data/figures/where-should-the-cutoff-sit.v1.json` | Frozen from `11-credit-risk` gold; `npm run freeze:cutoff` |
| Story Grammar | `docs/STORY_GRAMMAR.md` | Earned Layer 2 verbs + persistent objects |
| Animation craft | `docs/ANIMATION_CRAFT.md` | Motion rules read from `alexgreensh/anidoodle`, the hold audit, and what we declined |
| StoryManifest | `src/stories/schemas/manifest.ts` | Zod; optional hero + role |
| Visual allowlist | `src/stories/schemas/visualAllowlist.ts` | Per-visual states |
| Evidence Pack v2 | `data/figures/when-rates-rise.v2.json` | Frozen modeled + observed |
| Sims | `src/lib/sim/rate-buffer-book.ts` | Calibrated thin cutoff 6% |
| Directed film (Rates) | `src/components/film/RateFilm.tsx` · `/stories/when-rates-rise/film` | Scroll-scrubbed loan field |
| Directed film (Cut-off) | `src/components/film/CutoffFilm.tsx` · `/stories/where-should-the-cutoff-sit/film` | App PD field + gate; evidence from frozen pack |
| Cut-off horizon chart | `src/components/film/CutoffHorizonChart.tsx` in `CutoffInstrument` | Frozen OOT frontier (approval + bad vs PD cut) + live gate dots from cloud stats |
| Animation craft layer | `src/components/film/craft.ts` | Per-mark life, camera creep, arrival order, lead/lag, `weight × zoom^0.35`. Pure, seeded by mark id; the host loop supplies `time` and a `life` amount that is 0 under reduced motion. |
| Cue-table checker | `src/components/film/cue-table.ts` | Validates both pose tables at load and reports their holds. Holds are computed only over channels the canvas *reads* — a channel that never reaches pixels cannot rescue a still frame. Feeds `frame.hold`. |
| Landing field | `src/components/storytelling/LandingField.tsx` | Product-index hero. Tight horizontal lanes, one irregular vertical thread, a zoom into a soft hole on the warp center, then a z-divide vortex whose streaks shorten into the horizon stars and galaxies. On portrait, `warpUnit` (~2× short axis) plus elliptical Y stretch fills the tall frame without emptying the sides; dust draws as additive core+halo pinpricks. Not a story template. |

## Design patterns

- Decision story = reasoning process; scroll UI is the interface
- Approach B manifests; allow-listed visuals only
- react-scrollama + CSS sticky; one path all breakpoints
- **Continuous spine:** `TransmissionSpine` + `BufferMarkField` — acts change zoom/filter, not metaphor
- **Directed film:** one canvas, scroll-scrubbed camera, loan dots from `buildField`. This is the reference story people open. The essay manifest stays on the engine and is not linked from the landing or the film.
- **No dead air:** a scrubbed film is a pure function of scroll, so it freezes exactly when the reader is reading. Held beats creep the camera and keep the marks living; `e2e/dead-air.spec.ts` measures it in changed pixels rather than asserting it.
- Extract grammar from real stories; no speculative template farm
- AI in production pipeline later — not the brand headline
- Evidence: notebooks/MCP → freeze JSON → manifest display (never invent at render)

## Dependencies

| Dependency | Why introduced | Date |
|------------|----------------|------|
| next 16 / react 19 | App host | 2026-09-23 |
| tailwindcss 3 | Orbit-parity styling | 2026-09-23 |
| framer-motion | Non-essential visual transitions + layout | 2026-09-23 |
| zod | Manifest validation | 2026-09-23 |
| clsx / tailwind-merge | `cn()` | 2026-09-23 |
| tsx | validate + sim + freeze scripts | 2026-09-23 |
| react-scrollama | Step enter → visualState | 2026-09-23 |

## Simulations

| Module | Role |
|--------|------|
| `src/lib/sim/rate-buffer-book.ts` | Floater shock → thin-buffer shares; calibrated v2 |
| `src/lib/sim/calibration.ts` | Moment targets (WP 3053 rhyme) |
| `scripts/run-rate-buffer-sim.ts` | CLI reprint |
| `scripts/calibrate-rate-buffer.ts` | Cutoff search |
| `scripts/freeze-evidence-pack.ts` | Write `data/figures/*.json` |

## Grammar (Layer 2)

| Module | Role |
|--------|------|
| `grammar/TransmissionSpine.tsx` | Persistent CB→…→buffer nodes |
| `grammar/BufferMarkField.tsx` | Stable residual-capacity marks |
| `grammar/stageConfig.ts` | visualState → job / behavior / field |

## Key decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-23 | Standalone repo, not inside Orbit | Engine first; later `/stories` host |
| 2026-09-24 | Portfolio teaser, flagship landing, then the story | First Orbit section after the title is a short teaser with one visual and a button. The button opens `/stories`, where stories accumulate as rows. When Rates Rise opens the film. |
| 2026-09-23 | sticky + react-scrollama | One layout; drop split-pane |
| 2026-09-23 | Reference story + ECB evidence + book sim | Decision story, not chart demo |
| 2026-09-23 | **Interactive Decision Storytelling** as Orbit flagship | Stronger than “scrollytelling side feature” |
| 2026-09-23 | Three layers; no five templates yet | Extract grammar from When Rates Rise |
| 2026-09-23 | Flagship Story v1 after FLAGSHIP_AUDIT | Experience matches analytical substance |
| 2026-09-23 | Continuous spine + grammar extract (track A) | Stop swapping metaphors per act |
| 2026-09-23 | Calibrated thin 6% + Evidence Pack v2 (track B) | Rhyme WP 3053 26→33 without claiming identity |
| 2026-09-23 | Global MCP `eu-finance` | ECB/Eurostat refresh for evidence pack |
| 2026-09-23 | Engine harden: Vitest + Playwright/axe; safe Scrollama offset; SceneRenderer state guard | Catch broken observers and invalid visual states |
| 2026-09-24 | Cinematic chrome = PressureSky (living buffer field) | Pinloop-level craft; atmosphere is the mechanism, not empty sky |
| 2026-09-24 | Atmosphere motif registry (5 allow-listed motifs) | Reusable intro/outro/ambient; not five story templates |
| 2026-09-24 | Directed film route for When Rates Rise | One camera over loan-level sim output; sliders recompute payments. Essay route unchanged. |
| 2026-09-24 | Landing is a product index with a data-field hero | Gradient wordmark, then the shared path cuts through the field. No per-story poster. |
| 2026-09-24 | Landing camera enters one record | Top-down lanes sit close. One vertical thread joins a single dot on each lane with irregular sideways steps. Other points fade, the thread disappears, and that dot opens into a soft hole centered on the warp. The same streaks then shorten onto their heads; those heads are the horizon stars, and the brightest open into galaxies. |
| 2026-09-25 | Mobile horizon spread + star pinpricks | Portrait elliptical warp (`warpUnit` ×2 on short axis + `warpAspectY`) keeps New Horizon from clustering on center or collapsing into a vertical band. Dust heads draw as additive core+halo pinpricks; galaxy/orb bodies scale down on narrow frames. Horizontal clip lives only on content below the sticky field (`overflow-x-clip` / local `overflow-hidden`) — never on sticky ancestors, or the canvas stops following the page. |
| 2026-09-26 | Animation craft read from `anidoodle`, not vendored | Its motion doctrine is specific and paid-for; its styles, characters, music and render toolchain are not ours. We reimplemented five rules and wrote down the rest as declined, with reasons. `docs/ANIMATION_CRAFT.md`. |
| 2026-09-26 | Holds must stay alive, and it is measured | The cue tables held 32% / 44% of the two films with a frozen canvas, endings included. A hold is legitimate here (the reader is reading prose) — a freeze is not. The gate self-tests: `life: 0` reproduces the freeze and reports 0 changed pixels. |
| 2026-09-26 | Story 3 is a propagation, and reuses the existing visual objects | `rata-delay-propagation` picked. The Spec proposes **no new `visualId`**: the persistent mark field plus a frontier-style chart already express all nine beats (decay curve and padding profile are the chart role; the run under a moving camera is the field; the line picker is a `filter` over the same marks). Register a new visual only if implementation proves that false. |
| 2026-09-26 | The recovery-time mechanism is margin, not service type | Freezing 60 days turned the category contrast into something stronger: leg margin predicts delay survival at ρ **−0.96** across the seven lines, −0.85 across 68 legs, and −0.78 / −0.75 *within* commuter and long-distance separately. Negative-margin legs carry a delay across at 99%, 4+ min legs at 48%. Service type is only how margin is distributed today — and margin is the thing a timetable planner actually controls, so the claim became actionable instead of descriptive. A claim upgrade is proposed rather than taken, since the weaker one was the signed-off version. |
| 2026-09-26 | Recomputing on the real pack is a gate, not a formality | The 24-day verification concluded lines never separate (head-to-head a coin flip). On 60 days, 2 of 9 pairs separate robustly *and* the unifying explanation surfaced — separation tracks margin gap. Same finding, too small a sample. Everything a Spec quotes from verification is provisional until the pack exists; `docs/decision-specs/rail-recovery-time.md` carries the revision in the open rather than quietly restating. |
| 2026-09-26 | Redistribution has a floor, and it reframes the decision | The frozen counterfactual conserves each line's scheduled run time exactly (`journey_time_change_min` 0.00) and still takes long-distance carry-over from 77% to 50%. Commuter lines move 93% → 86% because they have nothing to redistribute. So for commuter the question is not *where* margin sits but whether to buy any, which costs journey time and is deliberately unmodelled. Found by running the counterfactual per line instead of only on the focus lane. |
| 2026-09-26 | A line is a modal route signature, never an average of stop positions | Averaging stop positions across trains that share two endpoints merged the Tampere and Savonia routes into a 38-station "Helsinki–Oulu" **no train runs** — the film would have drawn a line that does not exist. A line is the actual operated stop sequence, with expresses absorbed into the longest signature they are a subsequence of: 115 signatures → 34 real routes. Grouping by origin/destination is the opposite failure, starving all but one line. |
| 2026-09-26 | A reader control is verified like a figure | "Can the reader pick a line?" is two measurable claims: does each selectable line carry its own sample, and do lines differ. First is yes (7 routes, 6 inside a 60-day pack) and it sets the pack window. Second is **no** within a service type — head-to-head is a coin flip (7/16, 6/11 days), and the two comparisons that separate are the thinnest-sampled. So the picker ships as recognition, captions forbidden from implying a ranking. A control the evidence cannot support is as much a defect as a figure it cannot support. |
| 2026-09-26 | Category filters belong to every measurement, not the headline one | The rail pass filtered service category for delay survival but not for padding, so freight — timetabled far slower over the same rails — inflated scheduled run times and `YV→KOK` read 13.0 min of slack against 5.4 passenger-only. Corrected figures moved the story's claim from "the budget is in the wrong places" to the measured split: long-distance 2.1 min median padding / 3% negative legs vs commuter 0.2 min / 19%. Better claim, found only by recomputing. |
| 2026-09-26 | Prefer a check that does not need the estimator | The percentile floor was the weakest number in the Spec, so it was tested three ways: resampling (stable under 0.1 min from n=40 to n=13,671), window sensitivity (4% of legs flip sign), and one test needing no percentile at all — negative-padding legs beat their schedule on 0% of runs against 70% for positive legs, 0 of 41 ever beating it most of the time. The third retires the objection rather than bounding it. |
| 2026-09-26 | Search for a propagation whose lag is *recorded*, not inferred | Round E's whole seed criterion, taken straight from Round D's failure: a logged per-event lag (a train's scheduled vs actual time at every station) cannot fail the way an inferred one did (a speed field sampled at 2.3 km against a 15 km/h front). `rata-delay-propagation` scores **28** and is the catalogue's only *measured* C. |
| 2026-09-26 | A craft score above 3 needs a measured mechanism | Round D scored `digitraffic-tms-raw` **C 5** on a queue front travelling upstream, then the data said otherwise: upstream ordering on 3 of 7 weekdays, front speed 2.8–45 km/h, and 2.3 km detector spacing against a ~15 km/h front is a ~10-minute quantum with no denser chain in the network. Scoring an unmeasured mechanism is the same error as scoring analytics depth off a README. |
| 2026-09-26 | Keeping a hold alive costs one frame interval on a phone, and that is the bill | `e2e/frame-cost.spec.ts` measures the densest hold with the craft layer on and off (reduced motion sets `life: 0`). Unthrottled 60 Hz either way; at 4× CPU throttle the cut-off film goes 60→30 Hz. The added arithmetic is ~0.4 ms/frame — three quarters of it `hash()` recomputing constants. The rest is unavoidable: an unchanged canvas is not composited, and held frames are no longer unchanged. |
| 2026-09-26 | Holds are per-surface | `rendered` has only ever described one canvas. The union of two surfaces' channels reports no hold whenever either moves, hiding a frozen surface behind a moving one — the same trap the list exists to prevent. Pinned in `cue-table.test.ts`. |
| 2026-09-26 | Story topics are re-scored when a capability ships, not re-sought | Round D adds one dimension (**C**, craft stress: does motion carry the mechanism, or only stage it) to the existing scores rather than reopening the search. Tie-break is explicit — a third cross-section-under-a-moving-cut film would exercise the engine and teach us nothing. `docs/DATASET_CATALOGUE.md`. |
| 2026-09-26 | Dead air is measured per frame, never over a window | A one-second window is wide enough to hide a still picture. The first tuning cleared it at 0.86% / 8.0% while a third of consecutive frames were bit-identical and nobody could see the motion. Binding rule is now **no identical consecutive frames**; the mean floor is only a backstop. Tuning is judged from a recording, not from the number. |
| 2026-09-24 | Landing flight becomes craft rules, not a template | `docs/STORY_GRAMMAR.md` and the story-engine rule: same marks through a transition, one camera, neighbor-only thread, monotonic travel, unlabeled field. The vortex stays product-index chrome. |
| 2026-09-24 | Entry holds on the chosen dot | The camera centers that dot and moves closer before the warp. The disc stays bounded, its center only partly dark, then the edge leaves the frame and the streaks start inside it. |
