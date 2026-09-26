# Decision Spec — Where should the recovery time sit?

> Third Interactive Decision Storytelling piece (Orbit flagship).
> Catalogue pick: `rata-delay-propagation` (Round E, `craft_sum` 28 — the catalogue's only *measured* craft score).
> **Status:** draft. Scope and counterfactual method signed off; wording of Question / Claim /
> Takeaway / limitations and the line-picker captions still open.
> **Slug (proposed):** `where-should-the-recovery-time-sit`
> **Corpus:** Fintraffic Digitraffic Railway, `/api/v1/trains/{date}` (CC BY 4.0, no authentication, ~720 days retained).

Companion positioning: `docs/FLAGSHIP.md`. Patterns earned from `docs/reference-story-spec.md`
(*When Rates Rise*), `docs/decision-specs/home-credit-cutoff.md` (*Where Should the Cut-Off Sit*),
and the motion rules in `docs/ANIMATION_CRAFT.md`.

---

## Decision frame (locked intent)

| Element | Content |
|---------|---------|
| **Decision-maker** | Timetable planning at the infrastructure authority, allocating a fixed budget of recovery margin across a line |
| **Stake** | Padding buys punctuality and costs journey time and capacity — and it is paid on every train, every day of the timetable period |
| **QUESTION** | Where should the recovery time sit? |
| **CLAIM** | A delay is not an event, it is a thing that travels. Where the padding sits decides whether it dies in two stops or survives eight — and long-distance trains are given room to recover while commuter trains are given almost none |
| **MECHANISM** | Train is late at a stop → the next leg's scheduled run time either exceeds what the leg actually takes or it does not → the delay is absorbed or handed on → the same test repeats at every stop to the end of the run |
| **VISUAL OBJECT** | One field of arrival marks (a mark = one train at one stop), positioned by place in the run against minutes late. The film opens on the whole network, then settles onto **one line** the reader can change. The same marks carry the decay curve and the padding profile |
| **EVIDENCE** | Observed scheduled and actual times at every stop; calculated carry-over, decay curve and per-leg padding; a clearly-labelled modelled counterfactual for re-allocated padding |
| **COUNTERPOINT** | The carry-over is not a constant. It rises when the network is stressed, so padding sized on a quiet day is padding sized for the wrong day |
| **UNCERTAINTY** | Cause attribution covers only ~1% of rows; sample thins beyond ~4 stops; the technical minimum run time is a percentile proxy, not an engineering fact. Individual **lines within one service type do not reliably differ** — the separation is between service types |
| **TAKEAWAY** | Size the margin from where delay actually survives, not evenly along the line — and separate commuter from long-distance, because the same delay behaves differently on each and only one of them is given room to recover |

**Epistemic rule.** Teaching beats may follow one illustrative train. Any figure that looks like a
network fact carries `observed` | `calculated` | `illustrative` | `hypothetical`. We are reading a
public operational feed, not speaking for Fintraffic or VR: no beat may imply either endorses this
analysis, and no beat may present the counterfactual as a plan.

---

## Why this story (vs stories 1 and 2)

| | Rates | Cut-off | Recovery time |
|--|-------|---------|---------------|
| Decision | Where pressure appears when rates rise | Where to put the origination gate | Where to put the recovery margin |
| Shape | Cross-section under a shock | Cross-section under a moving cut | **Propagation along a run** |
| Object | Buffer / floating∩thin sleeve | Application cloud + acceptance frontier | Arrival marks along a run + decay curve + padding profile |
| Analytics | Shock sim + ECB rhyme | PD model + policy frontier | Survival of a delay + per-leg absorption + budget counterfactual |
| Craft | `leadLag` stages a distribution | `leadLag` stages a distribution | **`leadLag` carries the evidence** |

Stories 1 and 2 are the same film structurally: a population changing state under a moving cut. This
is the first one whose finding *is* an order and a decay, which is the reason it was picked — and the
reason the pick was verified before this Spec was written.

---

## Model & data (analysis contract)

| Item | Decision |
|------|----------|
| Source | [Digitraffic Railway](https://www.digitraffic.fi/en/railway-traffic/) `/api/v1/trains/{departure_date}` — every train on a date, with `timeTableRows` per station |
| Access | No key. `Accept-Encoding: gzip` required; send a `Digitraffic-User` identifying header. 60 requests/minute per IP. ~20 MB JSON per day |
| Licence | CC BY 4.0 (Fintraffic open data), commercial use permitted with attribution |
| Working grain | `ARRIVAL` rows at commercial stops on non-cancelled trains, with `differenceInMinutes` present |
| Late threshold | **5 minutes** — one threshold throughout; sensitivity to 3 and 10 minutes shown, not hidden |
| Windows | **60 days** for the frozen pack — set by the line picker, not by the headline figures. Verification ran on 10 consecutive weekdays (2026-09-14 → 09-25) plus a 14-day spread across a year; every selectable line needs ~30–51 days to carry its own decay curve and an honest day-to-day band |
| Segmentation | **Commuter and long-distance are separated everywhere.** Not optional — see evidence |
| Line definition | A line is a **modal route signature**: the actual ordered stop sequence operated between two endpoints, with expresses absorbed into the longest signature they are a subsequence of. Never an average of stop positions — see the trap below |
| Padding per leg | Median scheduled leg run time (next stop's scheduled arrival − this stop's scheduled departure) minus the **5th percentile of observed run times**, on **passenger services only**. Legs need 60+ observations. Reported beside a percentile-free check: the share of runs that beat the scheduled time |
| Counterfactual | Re-allocate the same total padding minutes across legs in proportion to measured survival, then replay observed delays through the new schedule. **Modelled, and labelled as such on screen** |
| Excluded | Cargo, shunting, locomotive, on-track machines and test drives — no passenger decision attached, **and including them corrupts padding** (see below) |

Freeze path: pull → aggregate → `data/figures/where-should-the-recovery-time-sit.v1.json`. The engine
never queries the API at render time.

---

## What was measured before this Spec existed

All figures below are from the live API, not from a README. Scripts were throwaway; the numbers are
the contract.

### Coverage

| | |
|---|---|
| Timetable rows on one day | 70,440 across 1,797 trains |
| Rows with an actual time | **92.9%** |
| Rows with delay minutes | **96.1%** |
| Rows carrying a cause | **1.0%** |
| Categories | Commuter 1,044 trains · Cargo 222 · Long-distance 213 · shunting and other |

### A delay carries

Share of 5+ minute late arrivals still 5+ minutes late N stops later, across **24 days spanning a
year** (October 2025 → September 2026, including three consecutive January days):

| stops on | +1 | +2 | +3 | +4 |
|---|--:|--:|--:|--:|
| median | **77%** | 68% | 61% | 57% |
| range across 24 days | 65–90% | 54–86% | 42–84% | 31–83% |

It is always a majority at the next stop and never below 65%. The tight 10-weekday September window
sits at 74–84%, so the wider range is seasonal spread rather than instability.

### Commuter and long-distance are different services

Carry-over to the next stop, by category, on each of the 24 days:

| | range across days | 
|---|---|
| Commuter | **73–97%** |
| Long-distance | **57–77%** |

Commuter is higher on **24 of 24 days**, with no overlap in the medians. Over six stops the gap widens
from 87% vs 71% to 64% vs 35%. A film that pools them would be averaging two different mechanisms.

### The baseline moves more than the mechanism

The share of arrivals that are 5+ minutes late ranges **2.1%–5.9%** across the same days. How *many*
trains run late swings by a factor of nearly three; what happens to a delay once it exists is
comparatively stable. Worth a beat on its own — and the days with the most lateness also have the
highest carry-over, which is the counterpoint above.

### Padding is derivable, and 41 legs have none

Over **380 passenger legs** with 60+ observations across 24 days, median scheduled run time minus the
5th-percentile observed run time:

| | |
|---|---|
| Median padding | **0.9 min** |
| Range | **−1.4 to +15.5 min** |
| Legs with *negative* padding | **41** (11%) |

`HL→TPE` is scheduled at 49 minutes against a 33.5-minute floor and beats its schedule on 88% of runs.
`JK→SAU` is scheduled at 5.3 minutes against a 6.1-minute floor and beats its schedule on **0 of 992
runs** — timetabled to be late. That contrast is the decision in one image.

> **Correction.** An earlier pass reported 273 legs, median 0.5 min, range −2.4 to +13.3. That pass
> filtered service category when measuring delay survival but *not* when measuring padding, so cargo,
> shunting and locomotive movements entered the scheduled-run-time median. Freight is timetabled far
> slower over the same rails, which inflates apparent slack — `YV→KOK` read 13.0 min with freight and
> **5.4 min** without, an overstatement of 7.6 minutes. The figures above are passenger-only. Legs the
> Spec names individually must be quoted from the corrected set.

### The margin is not spread evenly — it is spread by service type

Same 380 legs, split:

| | legs | median padding | range | negative |
|---|--:|--:|--:|--:|
| **Long-distance** | 194 | **2.1 min** | −1.4 to +15.5 | **5 (3%)** |
| **Commuter** | 186 | **0.2 min** | −0.8 to +2.1 | **36 (19%)** |

Long-distance trains get roughly ten times the recovery margin and are almost never timetabled below
their realistic floor. Commuter trains get almost none, and a fifth of their legs are scheduled faster
than the leg has ever actually run.

**This closes the mechanism.** Commuter delays survive at 90% and long-distance at 71% — and the
schedule gives commuter trains nowhere to recover. Two independent measurements, one on outcomes and
one on the timetable, point the same way. That is the story's spine, and it is the reason the claim
changed from "the budget is in the wrong places" to something the data can actually support.

### The percentile floor holds up better than assumed

The floor was the weakest number in the first draft, so it was attacked directly:

| Test | Result |
|---|---|
| Resample one leg at n = 40 / 80 / 160 / 320 / 640 vs full | Floor identical to 0.1 min at every size, up to n = 13,671 |
| Same legs, 10-day vs 24-day window | Sign flips on **11 of 265 legs (4%)**; median shift +0.00 min |
| Percentile-free check: does the leg ever beat its schedule? | Negative-padding legs beat schedule on **0%** of runs (median); positive-padding legs **70%** |
| Negative-padding legs that still beat schedule most of the time | **0 of 41** |

The last row is the one that matters: the negative-padding claim does not depend on the percentile at
all. A leg scheduled below its floor is a leg that never once, in hundreds of runs, arrived early.

### The trap in defining a line

Two definitions were tried and both failed before the third worked, which is worth recording because the
film draws the line on screen.

1. **Grouping by origin and destination** split long-distance into 70 routes a day and starved every
   one of them: only a single line cleared the sample bar.
2. **Averaging stop positions across trains sharing two endpoints** produced a 38-station
   "Helsinki–Oulu" path. Oulu is reachable both via Tampere and via the Savonia line through Kouvola
   and Kuopio, so the average merged two physical routes into a line **no train has ever run**. A film
   drawing that line would be drawing a line that does not exist.
3. **Modal route signature** — the actual operated stop sequence, with expresses absorbed into the
   longest signature they are a subsequence of — yields 34 distinct real routes from 115 signatures.
   This is the definition in the contract above.

### Can the reader pick a line? Yes — but the picker is not the argument

Asked and measured, because "start wide, then focus on one lane" only works if every selectable lane
clears the sample bar on its own. Bar: 1,000+ late arrivals at the next stop, and 30+ days carrying
20+ late arrivals so the day band is honest.

| Line | Service | late/day | legs at 60+ obs | carry | band | pack needed |
|------|---------|--:|--:|--:|---|--:|
| Ring Rail loop (HKI→HKI, 26 stops) | Commuter | 109 | 47 | 94% | 77–100% | ~30 d |
| Helsinki–Riihimäki trunk (21 stops) | Commuter | 69 | 21 | 87% | 69–96% | ~30 d |
| **Helsinki–Rovaniemi north main (24 stops)** | Long-distance | 62 | 47 | 69% | 53–77% | **~30 d** |
| Helsinki–Tampere (19 stops) | Commuter | 28 | 20 | 78% | 57–94% | ~40 d |
| Helsinki–Siuntio coastal (19 stops) | Commuter | 27 | 34 | 87% | 70–96% | ~60 d |
| Helsinki–Oulu (22 stops) | Long-distance | 26 | 35 | 64% | 38–87% | ~51 d |
| Helsinki–Joensuu (13 stops) | Long-distance | 22 | 15 | 77% | 71–94% | ~51 d |

Seven lines are reachable, all inside the API's ~720-day retention; a 60-day pack covers six of them.
So the control is buildable.

**But lines within one service type do not reliably differ.** Head-to-head on shared days, the higher
carry-over goes to:

| | |
|---|---|
| Helsinki–Joensuu vs north main | 7 of 16 days — a coin flip |
| Ring Rail vs coastal | 6 of 11 days — a coin flip |
| Helsinki–Riihimäki vs coastal | 9 of 12 days |
| North main vs Helsinki–Kuopio | 11 of 15 days |

The two comparisons that separate are the two with the thinnest samples. The dimension that separates
cleanly on every test is **service type**, not identity of line. A seven-way line picker would
therefore hand the reader seven labels for one answer.

**Design consequence.** The reader picks a line, but the picker's job is recognition ("my line"), not
evidence. The argument is carried by the service-type contrast, and the picker must not be captioned in
a way that implies lines differ from one another when measured. Where two lines genuinely do sit apart,
say so with the day count; where they do not, the interface should let the reader discover that.

### The Ring is a special case worth knowing about

The Ring Rail Line returns to where it started, so a delay can come round. It does **not** decay: 87%
at the next stop, and still 71% twelve stops later, non-monotonic in between (n = 193 late runs, first
late stop per run). With a median 0.1 min of padding and 27% of legs negative, a delay on the Ring has
nowhere to die. Striking, and a candidate beat — but it contradicts the decay curve the rest of the
film is built on, so it belongs as a named exception or not at all. Do not open with it.

### Legs behave consistently

Taking late trains only and legs with 40+ observations, **10 of 12** examined keep the same sign on
all ten weekdays: `KEM→OL` adds a mean +6.0 min (range +2.8 to +12.3), `KV→LH` absorbs −4.8 min
(range −5.7 to −4.2), `OL→YV` absorbs −8.1 min. The two that flip sit within a rounding of zero.

---

## Uncertainty & scenarios

| Lens | What the reader should feel |
|------|-----------------------------|
| **Threshold** | 5 minutes is a choice. At 3 the carry-over rises, at 10 it falls; the *shape* of the decay is what survives the choice |
| **Stress scenario** | On the worst days carry-over reaches 90%. Padding sized on a median day is undersized exactly when it matters |
| **Segment scenario** | Move the same minutes within commuter vs within long-distance — the two need different profiles, not one line |
| **Budget counterfactual** | Re-allocate the same total minutes toward the legs where delay survives; show what it buys and what it costs in journey time |
| **Thin attribution** | Only 1% of rows carry a cause. We can say a delay survived a leg; we mostly cannot say why. The story must not imply we can |
| **Percentile floor** | The "technical minimum" is a 5th percentile of observed runs, not an engineering figure. Resampling shows it stable from n=40 upward and 4% of legs flip sign between windows, so the limit is interpretive rather than statistical — a leg with no slack is not necessarily a leg that *should* have slack |
| **Line identity** | Lines within a service type do not reliably separate. The picker is for recognition; any beat implying line A is worse than line B needs the day count on screen |
| **What we do not claim** | That Fintraffic or VR endorse this; that the counterfactual is implementable; that capacity, rolling-stock or crew constraints are modelled; that one line generalises to the network |

---

## Narrative arc (beats × grammar)

Beats vary in length. Do not clone seven equal chapters.

Wide, then one lane, then the reader's lane. The film narrows once and does not zoom back out.

| Act | Beat | Reader job | Grammar | Persistent object |
|-----|------|------------|---------|-------------------|
| **Open** | QUESTION | Feel the whole network running late at once | `reveal` | Dim field of every arrival on one day |
| **I — Settle on a line** | ZOOM | The network becomes one line, stops in order | `zoom` + `annotate` | Same marks; the camera settles onto the north main line |
| **II — One train** | ORIENT | Watch one run pick up a delay | `trace` + `annotate` | One run along that line, left to right |
| **III — It carries** | TRANSFORM | The delay reaches the next stop before the train recovers | `transform` | Same marks; the delay is handed along the run |
| **IV — Every late train** | ACCUMULATE | One run becomes a decay curve | `accumulate` | Marks fill; the survival curve emerges *from* them |
| **V — Two services** | SPLIT | The same delay behaves differently on commuter and long-distance | `split` | One field divides; two decays, same marks |
| **VI — Where the slack is** | COMPARE | Padding per leg against where delay survives — and who got the margin | `compare` + `trace` | Padding profile along the line; the negative legs |
| **VII — Your line** | FILTER | Change the line and see whether your line behaves differently | `filter` | Line picker; the same profile and curve re-fit |
| **VIII — Move the budget** | FILTER | Re-allocate the same minutes and replay | `filter` | Scrubbed budget; the decay curve responds |
| **IX — What it costs** | SYNTHESIS | Punctuality bought, journey time paid | `highlight` | Decision card + limitations |

**Atmosphere:** an intro/outro motif only if it earns the mood. No new page architecture.
Directed-film path (one scrubbed shot plus an operable sleeve), consistent with stories 1 and 2.

**Next-story rule check.** No new `visualId` is proposed. The persistent mark field plus a
frontier-style chart already express every beat: Act VI's padding profile and Act IV's decay curve are
both the cut-off film's chart role, and Acts I–V are the mark field under a moving camera. The Act VII
line picker is a `filter` over the same marks, not a new surface. Register a new visual only if
implementation proves that false.

**Craft note on the opening narrowing.** Act I is the one shot where the camera travels a long way, and
it is exactly the case `cameraCreep` and `strokeWeight` were written for: the marks must be the same
marks before and after, linework must thin as the camera pushes in, and travel must increase and then
stop rather than easing out early. If the narrowing re-draws the field instead of moving the camera
through it, the film has lost the claim that the network and the line are the same data.

---

## Act briefs

### Open
Headline: **WHERE SHOULD THE RECOVERY TIME SIT?**
Sub: A delay is not an event. It is a thing that travels, and the timetable decides how far.
Hero: every arrival on one day — 70,440 marks — dim and unlabelled. Wide on purpose: the reader should
feel the volume before meeting a single train.

### I — Settle on a line
The camera narrows from the network onto the north main line, Helsinki to Rovaniemi, 24 stops in order.
Same marks throughout; nothing re-draws. This is the film's one long camera move.

### II — One train
One illustrative run, stops in order. It leaves on time, picks up five minutes, and the reader watches
the next stop arrive. Marks are *made* in stop order (`arrival`), never faded up as a sheet.

### III — It carries
The delay is handed to the next stop. This is the beat where `leadLag` is carrying evidence rather
than staging: the lag is the recorded difference between two logged times, and the wave direction is
the direction of travel. Label the figure `observed`.

### IV — Every late train
Accumulate to every 5+ minute late arrival in the window. The survival curve emerges from the same
marks — 77% at the next stop, 57% four stops on, medians across 24 days. Show the day-to-day range as
a band, not a single line.

### V — Two services
Split commuter from long-distance. 24 of 24 days, no overlap. Same marks, two decays. This is the beat
that stops the reader thinking "trains are trains".

### VI — Where the slack is
Padding per leg along the line, against where delay actually survives — then the split that closes the
argument: long-distance holds a median 2.1 minutes of margin with 3% of legs negative, commuter holds
0.2 minutes with 19% negative. The service that cannot shed a delay is the service that was given
nowhere to shed it. `JK→SAU` is the image: 992 runs, not one of them early.

State the percentile-floor caveat on screen in this beat, and state its answer with it — negative legs
beat their schedule on 0% of runs, so the finding does not rest on the percentile.

### VII — Your line
The reader changes the line. The padding profile and the decay curve re-fit to it, from the same frozen
pack. Caption honestly: lines within a service type mostly do **not** separate, and the reader finding
their own line looks much like the last one is the correct outcome, not a bug. Do not imply a ranking
of lines the evidence does not support.

### VIII — Move the budget
Scrub a re-allocation of the *same total* minutes toward the legs where delay survives, and replay the
observed delays through it. Badge the whole beat `modelled`. Travel increases then stops; no rewind.

### IX — What it costs
Decision card: where the margin should sit, what punctuality it buys, what journey time it costs, and
what we could not see (cause attribution at 1%, the percentile floor, one country, no capacity or crew
model). Limitations panel required.

---

## Evidence pack

**Status:** not yet frozen. Target `data/figures/where-should-the-recovery-time-sit.v1.json`.

| Claim | Figure | Kind | Does *not* show |
|-------|--------|------|-----------------|
| Delay carries to the next stop | 77% median, 65–90% across 24 days | observed | That the cause is known |
| Decay over four stops | 77% → 68% → 61% → 57% (medians) | observed | Anything beyond ~4 stops reliably; samples thin |
| Commuter vs long-distance | 73–97% vs 57–77%, 24/24 days | observed | Why the services differ |
| Lateness baseline | 2.1%–5.9% of arrivals 5+ late | observed | A punctuality target or its breach |
| Padding per leg | median 0.9 min, range −1.4 to +15.5, 380 passenger legs | calculated | An engineering minimum run time |
| Legs with negative padding | 41 (11%) | calculated | That those legs are anyone's mistake |
| Padding by service type | long-distance 2.1 min / 3% negative vs commuter 0.2 min / 19% | calculated | Why the timetable was built that way |
| Negative legs never run early | 0 of 41 beat schedule on most runs | observed | That the schedule is infeasible, only that it has no slack |
| Per-leg persistence | 10 of 12 legs keep sign over 10 days; 4% of 265 flip sign between windows | calculated | Network-wide stability |
| Lines a reader can select | 7 within retention, 6 within a 60-day pack | calculated | That those lines differ from each other |
| Line-vs-line separation | coin flip within a service type (7/16, 6/11 days) | observed | A ranking of lines |
| Ring Rail non-decay | 87% at +1, still 71% at +12 | observed | That every loop behaves this way; n = 193 |
| Re-allocated budget | decay under a counterfactual profile | **modelled** | A plan, a proposal, or feasibility |
| Cause attribution | 1.0% of rows | observed | A breakdown of causes |

**Sources**

1. Fintraffic Digitraffic Railway `/api/v1/trains/{date}` — CC BY 4.0, attribution on Context
2. Station metadata `/api/v1/metadata/stations` (563 stations, 215 with passenger traffic)
3. Verification windows: 2026-09-14 → 09-25 (10 weekdays) and a 14-day spread 2025-10-14 → 2026-09-08.
   The frozen pack needs a **60-day** pull, which is not yet taken — every figure above is from the
   24 verification days and must be recomputed on the pack before it ships

**Limitations (must appear in story)**

Public operational feed read from outside the organisations that run it. Cause attribution covers ~1%
of rows. The technical minimum run time is a percentile proxy. Samples thin beyond about four stops.
Finland only. No capacity, rolling-stock, crew or cost model. The counterfactual is arithmetic on
observed delays, not an operational plan.

---

## Beat × visual-grammar map (Layer 2)

| Beat | Primary behavior | Craft note |
|------|------------------|------------|
| Open | `reveal` | Field unlabelled; the question lives in the copy. Densest hold in the film — per-mark life is mandatory here |
| Settle on a line | `zoom` + `annotate` | The long camera move: `cameraCreep` through it, `strokeWeight` thinning with zoom, same marks either side |
| One train | `trace` + `annotate` | `arrival` in stop order — marks made, not faded |
| It carries | `transform` | `leadLag` with a recorded lag; rank is position in the run |
| Every late train | `accumulate` | Same marks; the curve emerges from them |
| Two services | `split` | One population divides; do not introduce a second one |
| Where the slack is | `compare` + `trace` | Two profiles maximum |
| Your line | `filter` | Marks re-position, never re-fade; the picker must not look like a page change |
| Move the budget | `filter` | Travel increases then stops; ease the stop |
| What it costs | `highlight` | Decision card |

Every held beat declares itself in the cue table and gets camera creep plus per-mark life. A film
about things that move must not freeze while the reader reads — and here a frozen frame would be a
false statement, not merely a dull one. If the film ever draws a second canvas, holds are computed
**per surface** (`docs/ANIMATION_CRAFT.md`).

---

## Out of scope for v1

- Cause-code analysis as a headline (1% coverage cannot carry it)
- Any claim about a specific operator's performance
- Capacity, crew, rolling-stock or cost modelling
- Real-time or live-updating views — this is a frozen evidence pack
- Auto-publish or an agent-written manifest without the human gate
- Generalising beyond the lines the evidence pack covers
- Ranking lines against each other, or any picker caption implying they separate when they do not
- The Ring Rail non-decay as a headline — n = 193, and it contradicts the film's own curve

---

## Definition of done (this Spec)

- [ ] Human approves Question / Claim / Takeaway / limitations
- [x] Line or lines chosen for v1 — network-wide opening, north main line as the focus lane, reader-selectable among the six that fit a 60-day pack
- [x] Counterfactual method agreed — re-allocate the same total minutes in proportion to measured survival, whole beat badged `modelled`
- [ ] Picker captions agreed, given that lines within a service type do not reliably separate
- [ ] Evidence pack frozen with kind tags
- [ ] Beat list stable enough to draft narration and visual states
- [ ] Explicit non-goals respected (no speaking for the operator, no plan cosplay)
