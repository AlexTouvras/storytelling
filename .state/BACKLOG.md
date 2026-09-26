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
- [ ] **Human pick for story 3** — recommended `rata-delay-propagation` as *Where should the recovery time sit?*; `usgs-flood-routing` (25) is the shortlist alternative; `digitraffic-tms-raw` (23) remains a good decision story but not a craft test
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
