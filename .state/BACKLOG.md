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

## Storytelling Engine v3 (`docs/STORYTELLING_ENGINE_SPEC_V3.md`)

- [x] Adopt spec v3 as the working plan
- [x] **Gate 1** — a real `.riv` renders in the app beside a data canvas, trigger/bool inputs drive its state machine, unmount frees it (`/lab/rive`, `e2e/rive-gates.spec.ts`)
- [x] **Gate 2** — data point → camera FOCUS → Rive household opens on the same anchor → shock trigger → closes into the same dot → PULLBACK → the book reprices; reverses, no stacked fires under scrubbing, reduced motion cuts and settles (`/lab/transition`)
- [x] **Human review at Gate 2** — approved 2026-09-27 on PR #8
- [x] Decide Rive state-machine inputs vs data binding: **inputs** for the grid. The story shows two hours, not a continuum, so bools cover it and the writer needs no data-binding objects. Revisit only if an illustration needs a continuous value (the runtime deprecates inputs in favour of data binding). **Revisited 2026-09-29:** every file is on data binding now (see *Rive: cinematic illustrations*)
- [x] Round F topic search (human declined the spec's three suggestions): six new-domain candidates scored with a new **I** (illustration necessity) dimension; `fingrid-grid-inertia` verified on June 2026 10 Hz data. `docs/DATASET_CATALOGUE.md`
- [x] Phase 3: human picked `fingrid-grid-inertia` (2026-09-27)
- [x] Decision Spec draft — `docs/decision-specs/grid-inertia-fast-reserve.md` (six beats; published TSO figures; year scan of 10 Hz events; one-bus model fitted to the published design points, shape only)
- [x] **Human sign-off on the Decision Spec**: read from the human's "Continue" on the draft (2026-09-27); recorded in the Spec's status so it can be objected to
- [x] One-bus frequency model with calibration tests — `src/lib/sim/grid-frequency.ts` (hits the two TSO design points within 0.05 Hz, misses Ørum's 20 GWs by about half; shape only)
- [x] Keyless evidence pack v0 (partial), since superseded by v1
- [x] Grid illustration — `src/illustrations/grid.ts` → `grid.riv`, lab `/lab/grid`, `e2e/grid-illustration.spec.ts`
- [x] Fingrid key received (pasted in chat 2026-09-28, used for the session only); 260 (2020-01 → 2026-07), 276 (2020-01 → 2026-07) and 278 (window) pulled via `scripts/fetch-fingrid.py`; each event paired with its hour's inertia
- [x] Scan fixed (gaps held, not read as 50 Hz) and events classified by shape: 19 trips of 33 falls
- [x] Evidence pack v1 — `data/figures/how-much-fast-reserve.v1.json`; yearly low-inertia counts within 6% of the published KPIs; FFR by kinetic-energy band
- [x] Model checked on the 19 trips — `src/lib/sim/grid-validation.ts`: nadir timing right, depth 1.7× conservative (design case)
- [ ] Human: add `FINGRID_API_KEY` as a Cloud Agents secret for future runs (and consider rotating the one pasted in chat)
- [ ] Human: note the Spec's "since sign-off" changes (19 trips, seasonal cluster partly explained, 2026 step change in low-inertia hours)
- [x] Reader orientation and method page specified (human proposed, 2026-09-28) — Spec sections *Reader orientation* and *Method page*: orientation card, terms taught at first use (no glossary wall), illustration legend at beat 2, kind badges linked to a pack-generated method page
- [x] Phase 3: build the flagship story on the director — `GridFilm` at `/stories/how-much-fast-reserve/film`: one held camera on the trip's hour, the machine opening out of it, three Rive runs against the modelled chart, pullback to 8,760 hours, the decision. `e2e/grid-film.spec.ts`
- [x] Engine (Layer 1): orientation card, term buttons (`<button aria-expanded>`, keyboard + touch), Terms drawer, kind badges — story-agnostic, terms and copy per story; term-order test
- [x] Method route `/stories/[slug]/method`, unlisted, every figure generated from the pack; `/method/evidence.json` download
- [x] Retrofit orientation + method pages to the three existing films — hand-written method boxes replaced by generated method pages; copy moved out of client components so the term check reads what renders
- [x] Make the reader kit a requirement: `validate:stories` rejects a reference story without `reader` + `method`, locked decision 14 in the story-engine rule, `docs/READER_KIT.md`, `e2e/reader-kit.spec.ts` on all four films
- [x] Human: approve the grid film for listing — approved 2026-09-28; slug in `LISTED_SLUGS`, landing links `/film` (`e2e/grid-film.spec.ts` asserts it). Shipped via PR #10 (PR #9 merged into the gates branch)
- [ ] Human: review the retrofitted terms and orientation cards on the three older films — some beat copy was reworded so a term is not used before it is taught (cut-off beats 0, 1, 2, 4, 5; rates title card; recovery beat 9)
- [ ] Rates pack `calibration.notes` says the thin line is "<10% residual income"; the model and film use 6%. The pack is frozen, so fix it at the next re-freeze
- [x] Grid film reader fixes (2026-09-28): the axis opens to the floor before the fall; the pullback holds the trip's hour on screen (`wideShotOn`); the phone picture ends above the tallest beat's text, with the caption and chart cross-fading in turn. e2e guards for each
- [x] Grid film on phones: narration and picture take turns (text first on a solid card, then the full-size picture plays; kicker + label strip stays). Reader asked 2026-09-28 not to shrink the graph for the text. e2e on a 360×740 phone
- [ ] Phase 4–5: regression + polish; documentation last
- [x] **Human pick for the next flagship story** — `ngsim-phantom-wave`, locked 2026-09-29. Spec draft: `docs/decision-specs/where-should-the-speed-be-held.md`
- [x] Human sign-off on that Spec (Question, Claim, Takeaway, limitations, and the two cinematic choices). Read from "OK go" on 2026-09-29; side view and daylight, recorded in the Spec
- [x] Freeze the US-101 pack, check the replay, and build the five-beat film at `/stories/where-should-the-speed-be-held/film` with its reader kit and method page. Unlisted
- [x] Human approves listing the US-101 film — approved 2026-09-29 ("List it next"); slug in `LISTED_SLUGS`, landing links `/film`
- [ ] Human review of the one-screen card at `/stories/where-should-the-speed-be-held/card` — the jam walking back, no scroll. Unlisted. The five-beat film is still the longer form
- [ ] Human review: film words are subtitles (`FilmSubtitle`), and every reader-kit story has a share card at `/stories/<slug>/card` linking to the film and the method page
- [x] Diagnose why the pictures stay charts, and rebuild the US-101 side view as cars (`docs/CINEMATIC_GAP.md`, `cars.riv` on the view model)
- [ ] **Next cinematic shot: a uniform-scale window of the freeway, ordered as a cinematic spine.** Bodies at one scale, lamps at the tail, speed painted on the body. The pack's walk speed is the reveal, after the brake has been watched. Sprites do not go on the lane-index chart. The executive-deck skill is not the reference; the journalism examples in `docs/CINEMATIC_GAP.md` are. The signed question stays until a person reopens it.

## Rive: cinematic illustrations (2026-09-29)

- [x] Writer v2: cubic paths from SVG path data, gradients, trim, clip, blend modes, translation constraints, elastic easing, vertex morphs, eased mixes
- [x] Writer: view models, direct binds, view-model conditions, 1D blend states, pointer listeners, state actions (`onStart`, `report`)
- [x] `scripts/rive-probe.mjs`: check a generated file in the real runtime headlessly
- [x] AI field card character: `robot.riv` (moods morph, energy and gaze blend, hover/press handled in the file, accent colour bindable)
- [x] Migrate `grid.riv` and `household.riv` to data binding; `RiveLayer` on the view model; e2e fails on Rive deprecation warnings
- [x] `/lab/robot` with a mock field card, `e2e/robot-character.spec.ts`
- [x] Human: design review of the robot — friendly helper; homepage neon plus each field card's colour; appears with an introduction, tap tucks to the lower right, tap again returns; text bubble, no sound; skeletons for later. Shipped on `robot.riv` / `/lab/robot`
- [x] Bubble rotates through six short judgements about handing a step to AI (`ROBOT_LINES`), baked into `robot.riv`
- [x] Robot on the live Agentic AI field card at `/lab/ai-card`: the card stays in its own page, the robot is screen chrome over it, a tap tucks to the lower right. Publishing that into `agentic-ai-field-card` itself needs a push this repo's token cannot make
- [ ] Publish the robot into `AlexTouvras/agentic-ai-field-card` (the Pages URL). Prepared locally; push was denied for this run
- [ ] Merge `/stories/ai-card` so Orbit's next sync puts the robot on alextouvras.com (the live site 404s every `/lab/*` route)
- [x] Writer: text runs, embedded fonts, root/child bones, skin/tendon/weight. The robot's waving arm is a rigid bone chain. Skin deformation is in the writer (tendon matrix = rest world transform; weight index 0 is the runtime identity bone)
- [ ] Nested artboards, if a story needs a reusable part. Not earned yet

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
- [x] Narration and visual states for `where-should-the-recovery-time-sit` (slug keeps the decision, not the title) — `recovery-frame.ts` (19 poses, 11 beats, exactly two declared holds at Acts VI and X) and `recovery-copy.ts` (every figure formatted from the frozen pack, per-beat `kind` badge, two in-beat caveats). 21 new tests, 83 green
- [x] **Correct the counterfactual claim** — writing narration off the pack showed the rule is non-monotone on **6 of 7 lines** and every commuter line peaks at ¼ or ½ strength then gets worse, so "optimally redistributed → 78–84%" was wrong twice. Now: best of five frozen variants leaves commuter at **75–81%** vs long-distance **75–77% today**, 3 of 4 short of the worst long-distance line, Helsinki–Tampere (74.9%) named as the one that reaches it. A test forbids the word "optimal" in the narration
- [x] Implement the film — `RecoveryFilm` + the arrival-mark field, route, and manifest entry. Three panels over one stop axis, 44 runs a line, 21 poses / 11 beats / three declared holds, route at `/stories/where-should-the-recovery-time-sit/film`, schema-valid manifest with five `dataRef`s. Deliberately **not** in `LISTED_SLUGS` (human gate on publish)
- [x] Implement third decision story film (after the pack is frozen)
- [x] Review the film beat by beat from screenshots rather than from green tests — which is the only reason any of it was found. Every drawing bug in the film passed every gate: an unlabelled survival swoosh on a second scale, margin bars off-plot, survival-axis labels outside the clip, a service split with only one service on screen that lifted the on-time trains off the baseline, the traced run still fat and cyan seven acts after the camera left it
- [x] Push the third film to prod — `main` `ce64be3`, Orbit sync dispatched 2026-09-26. Shipped **unlisted** in that push — the slug stayed out of `LISTED_SLUGS` because listing is the publish gate and the push had not asked for it. Listed minutes later on request; see the next item
- [x] Publish the third film — listed 2026-09-26 on request (`main` `435203e`), then **unlisted the same day** (`main` see below) after the human read it: *too packed, and in many places not understandable.* Live at its route, off the index
- [ ] **Cut the third film down before it is proposed again.** The verdict was density, not rendering. Ten acts, a seasonality act, a second decision at the close, three in-film corrections and a figure in almost every sentence — each earned its place separately and the sum cannot be followed. Next pass starts by choosing what to drop, and a person reads the narration one beat per screen *before* anything is built
- [ ] **Expectation gap on the motion, worth settling before the next film.** anidoodle was read as doctrine and its primitives extracted (`markLife`, `cameraCreep`, `leadLag`, `arrival`, `strokeWeight`); we never vendored a drawn-animation engine, and the craft layer is deliberately near-invisible — breath, creep, stagger, at amplitudes tuned to be felt and not seen. "We used anidoodle" reads as a promise of illustrative, hand-drawn motion, which is not what any of the three films do. Decide which of the two we actually want before building a fourth
- [ ] Confirm on the live Orbit page that `/stories` no longer links the delay film
- [ ] **Human review: the Act V rendering correction.** "Same marks, two decays" cannot be drawn — by Act V the camera has been on one line since Act II and a line is one service. The split moved to the decay curve, where its 89%/72% figures actually live, and dissolves back for Act VII. Noted in the Spec under Act V. The picture changed; the claim did not
- [x] Frame-cost budget for the craft layer, desktop + phone — **declined 2026-09-26 as "accepted unprofiled", then overtaken the same day**, because the third film could not ship without it. Measured in `e2e/frame-cost.spec.ts`. Unthrottled both films hold 60 Hz; at 4× CPU throttle the craft layer costs one frame interval (cut-off 60→30 Hz, rate 30→20 Hz). The added arithmetic is only ~0.4 ms/frame; the rest is that a held frame is now genuinely new and must be composited.
- [x] Reduce held-frame work on small screens (DPR cap / mark count / deliberate 30 Hz) — done as **mark count**, on the delay film where it actually bit: batch marks into one path per colour and alpha step, and thin the *backdrop* by stage area while the selected line never thins. Pixel 7 viewport at 4× throttle went 12 → 30 Hz at the open, and unthrottled from dropping frames to none. DPR cap not needed and not taken
- [ ] **Narration sits on the canvas on a phone, in all three films.** The stage is laid out in fixed shares of viewport height; a beat's copy wrapped into a 412px column is much taller than the same copy on a desktop, so it rises into the data band. Legible today only because of the void gradient behind it. Engine-level — not specific to the delay film, and not this film's to fix
- [ ] Re-derive the dead-air floor now that three films exist. Its docstring says it is set by the sparsest frame *any* film holds on; it was set when there were two, and is still the rate film's beat-2 close-up at 1.5× the floor. The delay film's closing hold sits at 2.0×, so nothing is wrong — but the floor is a sample of three now and should be justified rather than inherited
- [x] Cue-table `rendered` bookkeeping beyond one canvas — the union of two surfaces' channels hides a frozen surface; holds are per-surface. Pinned by a test; all three films are single-canvas so nothing to fix today.
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
- “AI-powered storytelling” as the headline
- Polishing `rates-and-defaults` as the publish piece
- Weekly topic discovery / auto-publish
- Changing the landing hero's reduced-motion end frame (declined 2026-09-26 — it keeps the flight's opening frame; reasoning in `docs/ANIMATION_CRAFT.md`)
- Modifying the Orbit repo from this project (until packaging)
- Production deploy of this repo alone (this phase)

## Definition of done (flagship formalization)

- [x] FLAGSHIP.md + landing tell system + story as two artifacts
- [x] Reference story titled as a portfolio decision question
- [ ] Human sign-off that this replaces “scrolly engine” as the Orbit pitch
