# Decision Spec — Where should the speed be held?

> Catalogue pick: `ngsim-phantom-wave`, Round G (flagship_sum 32 of 35). **Topic locked by the human 2026-09-29** ("lock in on this one").
> **Status:** signed off 2026-09-29. The human's "OK go" is read as Continue: Question, Claim, Takeaway, limitations, and the two cinematic choices (side view of three cars; daylight, no weather). Recorded so it can be objected to.
> **Built:** the one-screen card, the frozen pack `data/figures/where-should-the-speed-be-held.v1.json`, the replay, and the five-beat film at `/stories/where-should-the-speed-be-held/film`. Unlisted. Listing is still the publish gate.
> **Since sign-off, from the pack:** the walk is 800 ft at 9.1 mph. The opened car is 928, at 840 ft and 15.3 mph; its acceleration at that instant is positive, so the lamp on the road is off and the side view is the mechanism. Lane 7 is the entrance, lane 8 the exit, lane 6 the lane between them, from where those vehicles go. The coarser rule counts two crossings, on lanes 2 and 3, both in the first nine minutes. Lanes 1, 4 and 5 do not meet it. The replay walks the slow cell back at 8.0 mph and leaves the far end near 48; it slows the cell to about 6 mph against a measured 11, so that depth is not quoted as a measurement. A road lamp is on only below −3 ft/s², because the sign of acceleration lights most of the road. Lane 6 is labelled "lane" on the picture; the pack still calls it auxiliary. Forbidding a harder brake stops the pocket walking. The 20–46 minute bands are not flat teens: the far end does not return to 40.
> **Film title:** *Why is the road ahead already moving?*
> **Slug:** `where-should-the-speed-be-held`. The slug keeps the decision.

Companion: `docs/FLAGSHIP.md`, `docs/DATASET_CATALOGUE.md` (Round G).

---

## Decision frame

| Element | Content |
|---------|---------|
| **Decision-maker** | A freeway operator. On this morning, that is Caltrans, on southbound US-101 |
| **Stake** | Drivers are stopped on a road whose far end is still moving. A new lane takes years. The window to act on the jam itself is the few minutes before the whole section slows down |
| **QUESTION** | Where should the speed be held when the jam has moving traffic at its front? |
| **CLAIM (draft)** | The jam is a pocket of slow cars walking backward through the section at about 9 mph. For the first ten minutes the far end is still near 40 mph. By fifteen minutes the whole section has slowed to match. Hold the speed while the road ahead is still moving |
| **MECHANISM** | One car brakes a little, and a little late → the car behind brakes harder → the car behind that harder still → the extra braking walks upstream as a pocket → cars downstream of the pocket are already moving again → if nothing interrupts it, the pocket fills the section |
| **VISUAL OBJECT** | Every car on the section is one mark, coloured by its speed. One mark opens into three cars seen from the side: a brake lamp, a gap, and the next lamp coming on later. It closes back into the same mark, and the pocket is then seen walking backward through the others |
| **EVIDENCE** | Observed vehicle trajectories, US-101, 15 June 2005, FHWA NGSIM (CC BY-SA 3.0). Cell speeds are `calculated` from those trajectories. The counterfactual is `modelled`. The opened cars are `illustrative` |
| **COUNTERPOINT** | Add a lane. That answers a road that is full at the front. For the first ten minutes of this recording the front is not full: the downstream end of the section is near 40 mph while the upstream end is near 22 |
| **UNCERTAINTY** | One morning, about 2,100 feet, 2005. Positions are noisy. The section has entrance and exit lanes; they are not modelled, so the film does not say they caused the pocket, and does not say they did not. No variable speed limit was operating here, so the film does not claim one would have worked |
| **TAKEAWAY** | Act in the window when the road ahead is still moving. That window, on this morning, is about the first ten minutes |

**Epistemic rule:** a car's position and speed are `observed`. A speed averaged into a cell, a pocket's walk, and the five-minute bands are `calculated`. Anything a car-following rule produces is `modelled`. The side-view cars are `illustrative`: the brake is enlarged, and the film says so. The speeds painted on the road are the calculated ones.

**Title fence.** The film answers the title structurally: the road ahead is moving because the slow cars are a pocket walking backward, not a blockage sitting at the front. It does not answer with why one driver braked, and it does not place the title next to a cause-of-braking breakdown.

---

## Why this story, and why this medium

- **A wide audience already has the feeling.** Being stopped with moving traffic ahead does not require a specialist.
- **A chart of the morning is one low number.** The main lanes average about 20 mph. That average hides a far end near 40 mph and a pocket near 9 mph walking toward the cars that have not reached it.
- **Data → illustration → data is the move the grid film proved.** A mark opens into the brake and closes back into the same mark. The new part is that the mark is one of many bodies, and the consequence travels through the others.
- **One mechanism, five beats.** Story 3 was unlisted for density. This draft stops at the pocket and the window.

---

## Evidence

### The recording (observed)

| | Value |
|---|---|
| Source | FHWA NGSIM vehicle trajectories, `location='us-101'`, SODA `8ect-6jqj` |
| Licence | CC BY-SA 3.0, no key |
| When | 15 June 2005, about 46 minutes (`global_time` 1118846979700–1118849752200). The minutes are continuous; this is the 7:50–8:35 study period |
| Rows | 4,802,933 |
| Geometry | `local_y` increases in the direction of travel, from 0 to about 2,200 ft. Upstream is the smaller coordinate |
| Lanes 1–5 | The through lanes, the full length. Whole-morning mean speeds about 19, 20, 20, 21 and 23 mph |
| Lanes 6–8 | Short lanes inside the section. Lane 7 (about 370–660 ft) is the entrance: its vehicles continue into a through lane. Lane 8 (about 1,310–1,610 ft) is the exit: its vehicles arrive from a through lane. Lane 6 (about 615–1,350 ft) is the lane between them. A sample of six vehicles a lane, plus where the lanes sit. Drawn, not modelled |

### The morning fills in (calculated)

Mean speed, lanes 1–5, miles per hour. Upstream is `local_y` under 500 ft. Downstream is `local_y` over 1,700 ft.

| Minute | Upstream | Middle | Downstream |
|---:|---:|---:|---:|
| 0–5 | 23 | 30 | 41 |
| 5–10 | 22 | 27 | 39 |
| 10–15 | 17 | 21 | 23 |
| 15–20 | 18 | 20 | 19 |
| 20–45 | teens | teens | teens |

For ten minutes the far end is still near 40 mph. By fifteen minutes it has fallen into line with the rest. The rest of the recording stays slow, and the two ends no longer separate. **The decision window is that opening, and the film says so.**

### The pocket (calculated)

Lane 2, first 15 minutes, speeds in 100-ft by 10-second cells. From 240 s to 300 s the slowest cell moves from 800 ft to the upstream end. The speed there falls from about 19 mph to about 9 mph. The downstream end, at 2,100 ft, stays at 45–48 mph for that minute. About 800 ft in 60 seconds is about 9 mph against the traffic. Two further pockets on the same lane do the same between 360 s and 520 s, each while the downstream end stays in the forties.

A coarser pass (200-ft by 20-second cells, the back of the cells slower than 25 mph, a move of at least 400 ft at 5–12 mph, downstream still above 35 mph) counts two crossings, both in the first nine minutes: lane 2 and lane 3, each at 6.8 mph. Lanes 1, 4 and 5 do not meet that rule. The film may say the counted walks are on lanes 2 and 3. It may not say the other lanes were free of slow cars. A jump faster than 12 mph is a different car becoming the slowest, and is not counted.

The featured picture is the lane-2 minute above, because that is the one measured on the fine cells. The featured car — the one the illustration opens — is car 928, at the upstream edge of that pocket at 240 s (840 ft, 15.3 mph). The film does not swap it.

### What this recording cannot say

- Whether an incident sat just outside the cameras.
- A wave speed finer than about 9 mph. A 100-ft cell is the resolution of the check.
- That a variable speed limit would have changed this morning. None was in operation.
- That the entrance caused the pocket, or that it did not. The entrance is drawn and not modelled.
- Any morning but this one.

I-24 MOTION is a later, separate recording (Nashville, 2022, account-gated). It is not this pack and not this film.

---

## Model (analysis contract)

The headlines are the observed and calculated figures above. The model is a shape, used once, on the featured minute.

| Item | Decision |
|------|----------|
| Form | Replay the observed lead car. Each follower brakes from the gap and the speed of the car ahead, with a short lag |
| Calibration | On the featured minute the replay must put a slow pocket walking upstream at about 9 mph, with the downstream end still in the forties. If it cannot, the model is not drawn |
| Counterfactual | One variant only: followers are not allowed to brake harder than the car ahead. Journey not re-timed into a new road. Labelled modelled |
| What it may say | Whether that one change stops the pocket deepening on this minute |
| What it must not say | That the variant is optimal, that a new lane would not help, that a variable speed limit was tested here, a number the pack did not freeze |

Headline numbers come from the trajectories. The model never replaces them.

---

## Uncertainty & scenarios

| Lens | What the reader should feel |
|------|-----------------------------|
| **The window** | The first ten minutes, far end near 40 mph, against the same section after fifteen minutes, when both ends are near 19 |
| **One change** | The featured minute as driven, against the one modelled variant where nobody brakes harder than the car ahead |
| **What we do not claim** | A cause for any single brake. An incident. A ramp effect. A result for a variable speed limit. Any other day |

---

## Narrative arc (five beats)

| # | Beat | Reader must understand | Representation | Grammar | Kind |
|---|------|------------------------|----------------|---------|------|
| 0 | **Stopped** | You are stopped, and the far end of this short stretch is moving | The section in the first minutes, every car a mark coloured by speed. Camera on one slow mark, the fast marks visible ahead of it | `reveal` | observed, calculated |
| 1 | **One brake** | The car behind brakes harder than the car ahead, and a little later | That mark opens into a side view of three cars. The lead lamp comes on; the next comes on later; the third later and fuller | FOCUS → MORPH → trigger | illustrative |
| 2 | **The pocket** | The extra braking walks backward. The road ahead of it stays fast | Lane 2 at one scale: the same cars point ahead, the slowest 100-foot cell walks from 800 ft to the back, and the walk speed is spoken only then | `trace` | calculated |
| 3 | **The window closes** | Ten minutes later the far end has slowed to match, and it stays there | Pull back across the 46 minutes. The downstream marks lose their speed and join the rest | PULLBACK | calculated |
| 4 | **While it is still moving** | Hold the speed in that opening window. A new lane answers a different problem, a front that is already full | Decision card. The two ends at 0–10 minutes and at 15–20. The one modelled variant, if calibration passed. Limitations on the card | `highlight` | calculated, modelled |

**Atmosphere:** none beyond the road. The recording is a June morning. Daylight, no weather, no skyline. The marks are the atmosphere.

## One screen

The human pointed at a single diagram — cars, a density step, the shockwave arithmetic — and asked for that as a surface that does not scroll. Agreed as an alternative, not as a replacement for the five beats.

The reference diagram uses illustrative inputs and draws a fixed bottleneck. This minute does not. The card at `/stories/where-should-the-speed-be-held/card` draws the two observed frames of lane 2, sixty seconds apart, on one scale. The slow stretch is marked on both, and a dashed line on the later frame shows where it sat. The far end stays near 45 mph in both. The decision is the last line. There is no second chart and no formula: the positions are the evidence, and a formula on these coarse bins does not recover the measured 9 mph, so it is not printed.

The card is unlisted. Listing waits on the same human gate as the film.

**Operable sleeve:** none in v1. One modelled variant is enough. A slider would invite speeds the pack did not freeze.

---

## Reader orientation

Orientation card, after the title and before beat 0. No term the reader has to learn:

> Southbound US-101, a Wednesday morning in June 2005. You are stopped, and the cars ahead of you are not. This story is about that gap, how it moves, and what the operator can do in the minutes before it closes.

Plus the usual reading line (scroll to move; underlined words explain themselves; badges say where each number comes from) and the method link.

| Film word | Technical name (shown once) | Plain definition | First needed |
|---|---|---|---|
| the road ahead | downstream end | The direction the cars are going. On this picture, toward the far end of the stretch | beat 0 |
| pocket | stop-and-go wave | A short stretch of slow cars with faster cars on both sides of it | beat 2 |
| against the traffic | upstream | Back toward the cars that have not reached the slow stretch yet | beat 2 |
| steadier speed | variable speed limit | Holding drivers to one speed, a little below the open road, so the gaps do not collapse | beat 4 |

The entrance is not a term. If a beat needs to mention it, the sentence is "an entrance lane", and the limitations say it was not modelled.

Illustration legend, the first time the cars open (beat 1). At most four labels, then they fade:

- the lamp is the brake
- the gap is what the next driver sees
- each next lamp comes on later

One persistent caption: *Illustration. The brake is enlarged. The speeds on the road are measured.*

Kind badges link to the method page, as on the other films.

## Method page

`/stories/where-should-the-speed-be-held/method`, unlisted, generated from the pack.

1. **The decision.** Question, claim, takeaway, and what we do not claim.
2. **Data.** NGSIM US-101: licence, link, the 46 minutes, the lane map, coverage.
3. **Pipeline.** The command that freezes the pack from the SODA API, and the cell sizes.
4. **The morning.** The five-minute bands, all lanes.
5. **The pockets.** The rule that counts a crossing, the crossings it found, the featured minute and the featured car id.
6. **The model.** The rule, the calibration against the featured minute, the one variant, and whether it is drawn.
7. **Schema.** Every pack block, its `kind`, its source. The pack as a download.
8. **Limitations.** The pack's list, verbatim.

---

## Cinematics

Inherited, and not reopened: same marks through the cut; one camera; pull back on the subject; on a phone the words and the picture take turns; a hold is not a freeze; reduced motion settles to a still frame that is still readable; the illustration carries no number.

### The road (canvas)

Overhead, looking along the stretch, `local_y` running away from the reader so "ahead" is up the picture. Each car is one mark. Colour is speed: fast marks in the existing cyan, slow marks in the existing violet, with nothing else on the scale. A mark that is braking lights a small red lamp. The lamp is data — it is on when that car's acceleration is below −3 ft/s². A negative sign alone is noise in this file and would light most of the road. The slow colour is the pocket the reader watches walk upstream in beat 2; the lamps mark hard brakes and do not themselves draw that walk. Marks are not given a vehicle shape on the canvas. The shape appears only when one mark opens.

### The opened cars (Rive)

Built from code, as `grid.riv` was. One artboard, three cars in side view, no person, no cabin interior, no face. The file's view model is a trigger `brake` and a bool `braked` that jumps to the end state — the same surface the director already drives. The continuum of speeds stays on the canvas.

The lead car's lamp comes on. The second lamp follows, later. The third follows later and reads fuller, which is the exaggeration: a real brake difference of a few miles per hour would not read across a diagram, and the caption says the brake is enlarged. The gap between the cars closes. Wheels slow. Nothing in the artboard is a chart.

The camera drops onto the featured mark (FOCUS), the side view opens on that mark (MORPH), the trigger fires, and the view closes back into the mark before the pullback. Scrubbing reverses it, as Gate 2 required.

### Revision 2026-09-29 — the opened cars were not cars

The first build drew each car as a rounded rectangle, a glass rectangle and one wheel. That is the chart's vocabulary at a larger size, and it is why the beat did not read. `docs/CINEMATIC_GAP.md` records the cause and the systems that already do this job. The side view is now a depiction (shell, cabin, two wheels, a tail lamp), driven by the view model, the same surface as the other illustrations. The road marks stay marks: lane index and feet are not one scale, so a vehicle sprite there would be a stretched chart.

Beat 2, the pocket, now leaves that chart. The approved still shows lane 2 at one scale: identical cars pointing ahead, the slowest 100-foot cell tinted, then the same picture a minute later with the cell at the back. The walk speed is the third subtitle, once both positions are on screen. A phone draws a 200-foot enlargement of the same cells so the cars stay cars. The question on this page stays the question.

### Closed 2026-09-29

"OK go" accepted both as proposed.

1. **Side view, not the driver's seat.** The opened beat looks at three cars from the side, so the lamps and the gap are all in frame.
2. **Daylight, no weather.** The morning is a road and its marks. No sky, no weather, no skyline.

---

## Beat × visual-grammar map

| Beat | Primary behaviour | Notes |
|------|-------------------|-------|
| Stopped | `reveal` | Marks only. The far end is already fast. No chrome |
| One brake | FOCUS → MORPH → trigger | Gate 2 transition. The featured car is the entity |
| The pocket | `trace` | The approved still, in three cues. Identical cars, the cell walking back, the 9 mph figure on the last cue |
| The window closes | PULLBACK | `wideShotOn` the section. Downstream marks lose their speed |
| While it is still moving | `highlight` | Decision card and limitations |

No new `visualId` until implementation shows the mark field cannot do beats 0, 2 and 3.

---

## Out of scope for v1

- I-24 MOTION, the CIRCLES cars, and any variable speed limit that was actually switched on
- A model of the entrance, ramp metering, or a new lane
- Why a particular driver braked
- Any day but 15 June 2005
- A slider

---

## Definition of done (this Spec)

- [x] Human approves Question / Claim / Takeaway / limitations, and the two cinematic choices (2026-09-29, "OK go")
- [x] Evidence pack frozen with kind tags, featured car id 928 included
- [x] Model checked against the featured minute; the walk passes and the depth is not quoted as a measurement
- [x] Beat list stable enough to write narration and visual states (five beats)
- [x] Orientation card, four terms, illustration legend
- [x] Method page generated from the pack
- [x] Human approved listing (2026-09-29, "List it next"); slug in `LISTED_SLUGS`, the landing links the film
