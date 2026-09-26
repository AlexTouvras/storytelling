# Backlog

> Tracked in git. Upcoming work and hard scope boundaries.

## Now

- [x] Mobile New Horizon: spread warp field + smaller/brighter star pinpricks
- [x] PoC: Interactive Decision Storytelling runtime + When Rates Rise
- [x] Flagship positioning + stripped landing
- [x] `FLAGSHIP_AUDIT.md` + **Flagship Story v1** (7 acts, zoom visual, decision card)
- [x] Track A: visual continuity (spine + mark field) + Story Grammar extract
- [x] Track B: Evidence Pack v2 (calibrated sim + frozen figures) + Global `eu-finance` MCP
- [x] Harden Story Engine + tests (Playwright / axe / Vitest)
- [x] Cinematic art pass: PressureSky hero/landing + mechanism-as-atmosphere
- [x] Atmosphere motif system (5 motifs, intro/outro/ambient, lab gallery)
- [ ] Human review of motif craft vs Tier A ceiling
- [x] Directed film: When Rates Rise as one scroll-scrubbed shot plus an operable sleeve
- [x] Film narration: prologue, beat copy, and decision context for an online reader
- [x] Landing is the product index: data-field hero, shared path, story list
- [x] Landing flight craft written into story grammar (not a new template)

## Next (Orbit live — first topic shipped)

- [x] Integrate into Orbit: portfolio teaser after the title, then `/stories` as the flagship landing, then `/stories/[slug]`
- [ ] Human sign-off: live Orbit pitch reads as Interactive Decision Storytelling (not “scrolly engine”)
- [x] Dataset selection brief + catalogue scaffold (`docs/DATASET_CATALOGUE.md`)
- [x] Seed + score existing-repo dataset catalogue → shortlist top 3
- [x] External online seed round scored into catalogue
- [x] Deeper online pass (FEMA NFIP, Traficom vehicles, Digitraffic TMS, ACS PUMS, IEEE-CIS; reject SILC PUF)
- [x] Human pick by highest score → `home-credit-pd` (22)
- [x] Decision Spec draft — `docs/decision-specs/home-credit-cutoff.md`
- [x] Human sign-off on Decision Spec
- [x] Freeze evidence pack `data/figures/where-should-the-cutoff-sit.v1.json`
- [x] Implement second decision story film (`CutoffFilm` + landing list)
- [x] Move-the-gate horizon graph (approval + bad vs PD cut, live marker)
- [x] Human scrub / gate — push to prod for Orbit storytelling-sync
- [ ] Confirm live Orbit `/stories` shows cut-off film
- [x] Animation craft pass from `anidoodle`: hold audit, craft layer, cue-table checker, dead-air gate
- [x] Human scrub of the moving films — approved 2026-09-26 on the recorded clips ("it looks better")
- [x] Push the craft pass to prod — `main` `7430497`, Orbit sync dispatched 2026-09-26
- [x] Confirm the craft pass on the live Orbit page — validated online 2026-09-26
- [x] Round D: re-score parked datasets for craft stress → story 3 candidate `digitraffic-tms-raw` (craft_sum 25), fallback `entsoe-europe-load` (24). `docs/DATASET_CATALOGUE.md`
- [x] Verify the Round D assumptions against the live Digitraffic API + 70 station-days of passages — format, metadata and CC BY 4.0 licence pass; **the upstream propagation lag fails** (3/7 weekdays, front speed 2.8–45 km/h; 2.3 km detector spacing cannot resolve a ~15 km/h front). C drops 5 → 3, craft_sum 23. Queue flag is `0` in every row; congestion must come from speed.
- [x] Round E: seed for a propagation whose lag is *recorded per event* rather than inferred from a coarse field → `rata-delay-propagation` (Digitraffic Railway), **craft_sum 28**, verified on ten weekdays before recommending. Delay carry-over 73.6–83.6% every day; decay curve tight and monotone for four stops; 10/12 legs keep their sign on all ten days.
- [x] **Human pick for story 3** → `rata-delay-propagation`, 2026-09-26
- [x] Answer the three Round E open questions on 24 days across a year: commuter vs long-distance **must** be separated (73–97% vs 57–77%, 24/24 days); padding per leg **is** derivable; carry-over survives winter (65–90%, never below 65%)
- [x] Decision Spec draft — `docs/decision-specs/rail-recovery-time.md`
- [x] **Scope signed off** (human, 2026-09-26): wide opening → one focus lane → reader-selectable line; counterfactual is survival-proportional re-allocation, whole beat badged `modelled`
- [x] Verify the line picker before designing it — buildable (7 routes clear 1,000+ late arrivals and 30+ usable days; 6 fit a **60-day** pack, which now sets the pack window), but **lines do not separate within a service type** (head-to-head 7/16 and 6/11 days), so the picker is recognition and captions may not imply a ranking
- [x] Fix the line definition — origin/destination grouping starves all but one line; averaging stop positions invented a 38-station "Helsinki–Oulu" merging the Tampere and Savonia routes into a path no train runs. Modal route signature, expresses absorbed as subsequences: 115 → 34 real routes
- [x] Correct the padding figures — freight had entered the scheduled-run-time median (`YV→KOK` 13.0 min vs **5.4** passenger-only). Corrected: 380 legs, median 0.9 min, 41 negative. The correction produced a **better claim**: long-distance 2.1 min / 3% negative vs commuter 0.2 min / 19%, which closes the mechanism against the 90% vs 71% survival split
- [x] Attack the percentile floor — stable under resampling (n=40 → 13,671, <0.1 min), 4% of legs flip sign between windows, and a percentile-free check settles it: negative-padding legs beat schedule on 0% of runs vs 70% for positive legs, 0 of 41 ever beating it most of the time
- [x] Claim and picker captions signed off (human, 2026-09-26) — "long-distance trains are given room to recover; commuter trains are given almost none", picker as recognition with the sameness stated as the finding
- [x] Pull the 60-day window (`scripts/fetch-rail-days.py`, 2026-07-28 → 09-25) and freeze `data/figures/where-should-the-recovery-time-sit.v1.json` — 160 KB, 65,373 passenger runs, every block `kind`-tagged
- [x] Recompute every Spec figure on the pack — carry-over 81% median (67–90% band), commuter 87% vs long-distance 72% with commuter higher on **60/60 days**, 403 legs, 52 negative, 0 of 52 ever beating schedule
- [x] **Found the real mechanism while recomputing:** leg margin predicts survival at ρ −0.96 across lines, −0.85 across 68 legs, −0.78/−0.75 within each service type. 99% carry at negative margin → 48% at 4+ min. Service type is just how margin is distributed
- [x] Counterfactual frozen at five strengths per line, journey time conserved exactly — focus line 77% → 50% at +1; commuter lines only 93% → 86% because there is nothing to move, which reframes their decision as whether to *buy* margin
- [x] Revise the "lines never separate" finding — on 60 days 2 of 9 pairs do separate, and separation tracks margin gap. Recorded as a revision in the open
- [x] **Re-freeze on a full year** (human asked: is there seasonality?) — 365 days, 2025-09-26 → 2026-09-25, 6.5 GB pulled, 395,094 runs, 185 KB pack. Answer: **volume is seasonal, the mechanism is not.** Monthly late share 2.7–7.2% (daily 0.4–15.4%) while carry-over stays 75–85% every month; highest in Jan–Feb, so winter makes more delays *and* stickier ones
- [x] Scope margin to timetable periods — the year contains an annual re-cut (18.8% of legs moved on 2025-12-14 against a 1.3% weekly baseline). Three periods detected; margin uses the current one. Pooling had diluted long-distance ρ from −0.69 to −0.48
- [x] Fix the measurement unit to (leg, service type) — Helsinki–Pasila is run by both categories at different scheduled times. Also made the counterfactual self-consistent (zero-strength replay now reproduces measured carry-over exactly)
- [x] Make the freeze stream — a year of raw JSON exceeds this pod's RAM; day-level reduction plus a second file pass for the replay
- [x] Add per-period robustness for the mechanism — holds in all three periods and both categories (−0.85 / −0.79 / −0.79), across two annual re-cuts
- [x] Commuter framing corrected — redistribution *does* help commuter lines (4–10 pts), but their floor (78–84%) stays worse than long-distance today (75–77%). Human chose to make that the closing turn rather than a footnote
- [x] **Claim upgrade adopted** (human, 2026-09-26) — *a delay dies only where the timetable leaves room for it to die; margin decides survival, and today margin is handed out by service type.* Names the lever a planner actually controls
- [x] **Seasonality gets its own act** (human, 2026-09-26) — Act VI *A year of it*, deliberately the shortest beat: volume swings by season, the mechanism does not, and Jan–Feb is worst at both. Arc is now ten acts with no new `visualId`; the beat is one image with no interaction, and falls back to a line on the decision card if it cannot land in one screen
- [x] Rewrite the act briefs against the margin finding — full ten-act arc, commuter floor as Act X's second decision, beat list confirmed
- [x] **Question / Takeaway / limitations wording signed off** (human, 2026-09-26) — **Spec closed.** Film titled *Why don't delays die?* with the planner's decision (*where should the recovery time sit?*) split into its own frame row and held back to Act X; Takeaway leads with the mechanism; limitations appear once on the closing panel with attribution and non-affiliation, badges plus two in-beat caveats elsewhere
- [x] Fence the *why* title against the 1% cause codes — the film answers it structurally, and the Spec forbids answering it with a cause of delays or placing the title beside a cause breakdown. Reverts to the decision if that cannot hold
- [ ] Narration and visual states for `where-should-the-recovery-time-sit` (slug keeps the decision, not the title)
- [ ] Implement third decision story film (after the pack is frozen)
- [x] Frame-cost budget for the craft layer, desktop + phone — measured in `e2e/frame-cost.spec.ts`. Unthrottled both films hold 60 Hz; at 4× CPU throttle the craft layer costs one frame interval (cut-off 60→30 Hz, rate 30→20 Hz). The added arithmetic is only ~0.4 ms/frame; the rest is that a held frame is now genuinely new and must be composited.
- [ ] Reduce held-frame work on small screens (DPR cap / mark count / deliberate 30 Hz) — scoped by the numbers in `docs/ANIMATION_CRAFT.md`, measurement already in place to check it
- [x] Cue-table `rendered` bookkeeping beyond one canvas — the union of two surfaces' channels hides a frozen surface; holds are per-surface. Pinned by a test; both films are single-canvas so nothing to fix today.
- [ ] Agent pipeline (research → evidence → spec → manifest) — only after a second story earns reusable steps
- [ ] Weekly decision stories — after pipeline + human gate exist
- [ ] HFCS research microdata (data ladder step 3)
- [ ] Optional: self-host `socioeconomic-data-mcp` for broader series
- [ ] Landing reduced-motion end frame — own piece of work, deferred 2026-09-26. `FlagshipLanding` drops the scroll listener under reduced motion and pins the hero canvas on the flight's *first* frame, so that reader never sees the horizon it travels to. The films are unaffected (they step pose to pose and reach every beat). anidoodle's rule is that a scroll piece should show its finished picture; whether the product index hero should settle on the horizon is an editorial call. Context in `docs/ANIMATION_CRAFT.md`.
- [ ] Tier B: WebGL backends for motifs that earn it

## Later

- [ ] Progress-trigger scenes
- [ ] Package exports for Orbit `/stories/[slug]` (if still needed after live integrate)
- [ ] Research → Evidence → Model → Story Architect pipeline (human approve)
- [ ] Additional decision stories (build/buy, affordability, concentration, …)

## Out of scope (strict)

- Branding as “scrollytelling side feature”
- Five templates designed before a second real story
- “AI-powered storytelling” as the headline
- Polishing `rates-and-defaults` as the publish piece
- Weekly topic discovery / auto-publish
- Modifying the Orbit repo from this project (until packaging)
- Production deploy of this repo alone (this phase)

## Definition of done (flagship formalization)

- [x] FLAGSHIP.md + landing tell system + story as two artifacts
- [x] Reference story titled as a portfolio decision question
- [ ] Human sign-off that this replaces “scrolly engine” as the Orbit pitch
