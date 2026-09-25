# Architecture (working log)

> Tracked in git. Living decisions for this repo — not a substitute for root `ARCHITECTURE.md` or `docs/FLAGSHIP.md`.

## Overview

**Interactive Decision Storytelling** — Orbit flagship. Engine (Layer 1) is a boring stage; grammar (Layer 2) and decision stories (Layer 3) carry the product. Reference: `when-rates-rise`. Fixture: `rates-and-defaults`.

## Data shapes

| Name | Shape / location | Notes |
|------|------------------|-------|
| Flagship | `docs/FLAGSHIP.md` | Product positioning |
| Reference Story Spec | `docs/reference-story-spec.md` | Editorial + evidence |
| Story Grammar | `docs/STORY_GRAMMAR.md` | Earned Layer 2 verbs + persistent objects |
| StoryManifest | `src/stories/schemas/manifest.ts` | Zod; optional hero + role |
| Visual allowlist | `src/stories/schemas/visualAllowlist.ts` | Per-visual states |
| Evidence Pack v2 | `data/figures/when-rates-rise.v2.json` | Frozen modeled + observed |
| Sims | `src/lib/sim/rate-buffer-book.ts` | Calibrated thin cutoff 6% |
| Directed film | `src/components/film/` · `/stories/when-rates-rise/film` | Scroll-scrubbed canvas of the seeded book. Not a template. |
| Landing field | `src/components/storytelling/LandingField.tsx` | Product-index hero. Tight horizontal lanes, one irregular vertical thread, a zoom into a soft hole on the warp center, then a z-divide vortex whose streaks shorten into the horizon stars and galaxies. Horizon warp uses `warpUnit` (portrait boost) so mobile stars/orbs/galaxies are not crushed to center; star dots are additive pinpricks. Not a story template. |

## Design patterns

- Decision story = reasoning process; scroll UI is the interface
- Approach B manifests; allow-listed visuals only
- react-scrollama + CSS sticky; one path all breakpoints
- **Continuous spine:** `TransmissionSpine` + `BufferMarkField` — acts change zoom/filter, not metaphor
- **Directed film:** one canvas, scroll-scrubbed camera, loan dots from `buildField`. This is the reference story people open. The essay manifest stays on the engine and is not linked from the landing or the film.
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
| 2026-09-25 | Mobile horizon spread + star pinpricks | Portrait `warpUnit` boost (and softer vignette) keeps the New Horizon act from clustering on center. Dust heads draw as additive core+halo pinpricks; galaxy/orb bodies scale down on narrow frames. |
| 2026-09-24 | Landing flight becomes craft rules, not a template | `docs/STORY_GRAMMAR.md` and the story-engine rule: same marks through a transition, one camera, neighbor-only thread, monotonic travel, unlabeled field. The vortex stays product-index chrome. |
| 2026-09-24 | Entry holds on the chosen dot | The camera centers that dot and moves closer before the warp. The disc stays bounded, its center only partly dark, then the edge leaves the frame and the streaks start inside it. |
