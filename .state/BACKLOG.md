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
- [x] Field card lecture feasibility: Agentic AI card as a paced briefing + podium driver (`/lab/lectures/agentic-ai`)
- [ ] Human call: does the four-minute briefing earn its place beside the forty-second card? (decides whether this leaves `/lab`)
- [ ] If yes: second lecture (Technology Delivery is the next most film-shaped card) before generalising any teaching channels
- [ ] Agent pipeline (research → evidence → spec → manifest) — only after a second story earns reusable steps
- [ ] Weekly decision stories — after pipeline + human gate exist
- [ ] HFCS research microdata (data ladder step 3)
- [ ] Optional: self-host `socioeconomic-data-mcp` for broader series
- [ ] Tier B: WebGL backends for motifs that earn it

## Later

- [ ] Progress-trigger scenes
- [ ] Package exports for Orbit `/stories/[slug]` (if still needed after live integrate)
- [ ] Research → Evidence → Model → Story Architect pipeline (human approve)
- [ ] Additional decision stories (build/buy, affordability, concentration, …)

## Out of scope (strict)

- Branding as “scrollytelling side feature”
- Five templates designed before a second real story
- A lecture template, a teaching `visualId`, or generalised “teaching channels” on one example
- Editing the field card repos from here (the frozen JSON is read from a published commit)
- Publishing the lecture (unlisted + noindex until the human call above)
- “AI-powered storytelling” as the headline
- Polishing `rates-and-defaults` as the publish piece
- Weekly topic discovery / auto-publish
- Changing the landing hero's reduced-motion end frame (declined 2026-09-26 — it keeps the flight's opening frame; reasoning in `docs/ANIMATION_CRAFT.md`)
- Profiling frame cost of the animation craft layer (declined 2026-09-26 — accepted unprofiled)
- Modifying the Orbit repo from this project (until packaging)
- Production deploy of this repo alone (this phase)

## Definition of done (flagship formalization)

- [x] FLAGSHIP.md + landing tell system + story as two artifacts
- [x] Reference story titled as a portfolio decision question
- [ ] Human sign-off that this replaces “scrolly engine” as the Orbit pitch
