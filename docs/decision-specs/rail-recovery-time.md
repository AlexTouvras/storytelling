# Decision Spec — Where should the recovery time sit?

> Third Interactive Decision Storytelling piece (Orbit flagship).
> Catalogue pick: `rata-delay-propagation` (Round E, `craft_sum` 28 — the catalogue's only *measured* craft score).
> **Status:** draft. Scope, counterfactual method, Claim and picker captions signed off; Question /
> Takeaway / limitations wording still open. Evidence pack not yet frozen.
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

> ### Proposed claim upgrade — needs sign-off
>
> The approved Claim above is a statement about *who got the margin*. Freezing the 60-day pack
> established something stronger and more useful: **recovery margin predicts delay survival directly**,
> and it does so within each service type separately (Spearman −0.96 across the seven lines, −0.85
> across 68 legs, −0.78 commuter-only, −0.75 long-distance-only). Legs with negative margin carry a
> delay across at **99%**; legs with 4+ minutes of margin carry it at **48%**.
>
> That matters because a timetable planner controls margin directly and does not control service type.
> The proposed wording keeps the approved observation and adds the mechanism behind it:
>
> *"A delay dies only where the timetable leaves room for it to die. Margin decides survival — and
> today margin is handed out by service type, so long-distance trains get room to recover and commuter
> trains get almost none."*
>
> Recommended, because the current Claim describes a symptom the data now explains. Not adopted without
> a decision, since it is a strictly stronger statement than the one signed off.

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

## What the frozen pack measures

Figures below are **from the frozen pack** — `data/figures/where-should-the-recovery-time-sit.v1.json`,
built by `scripts/freeze-rail-recovery.py` over 60 consecutive days (2026-07-28 → 2026-09-25), 65,373
passenger runs, 839,038 timetable rows. Seasonality figures come from the separate 24-day spread across
a year used during verification, and are marked as such.

### Coverage

| | |
|---|---|
| Timetable rows (60 days, passenger) | **839,038** across 65,373 runs |
| Rows with an actual time | **90.8%** |
| Rows with delay minutes | **92.2%** |
| Rows carrying a cause | **~1%** |
| Runs by category | Commuter 53,169 · Long-distance 12,204 |

### A delay carries

Share of 5+ minute late arrivals still 5+ minutes late N stops later, with the day-to-day band across
60 days:

| stops on | +1 | +2 | +3 | +4 | +6 |
|---|--:|--:|--:|--:|--:|
| median | **81%** | 72% | 66% | 62% | 56% |
| band across 60 days | 67–90% | 54–86% | 46–84% | 42–82% | 33–83% |
| late events | 31,419 | 26,931 | 22,310 | 18,329 | 11,865 |

Always a majority at the next stop and never below 67% on any day. *(Seasonality, from the 24-day
year-spread: the median sits at 77% with the same 65–90% band, so the shape is not an artefact of a
late-summer window.)*

### Commuter and long-distance are different services

Carry-over to the next stop:

| | median | band across 60 days |
|---|--:|---|
| Commuter | **87%** | 77–95% |
| Long-distance | **72%** | 60–82% |

Commuter is higher on **60 of 60 days** — measured into the pack as `category_head_to_head`, not
asserted. Over four stops the gap widens from 87% vs 72% to 76% vs 41%. A film that pooled them would
be averaging two different mechanisms.

### The mechanism is margin, not service type

The strongest finding in the pack, and the reason the claim upgrade above is proposed. Delay survival
across a leg falls as that leg's recovery margin rises:

| padding on the leg | legs | delay carries across | late events |
|---|--:|--:|--:|
| negative | 9 | **99%** | 1,401 |
| 0 – 0.5 min | 21 | 96% | 6,013 |
| 0.5 – 1 min | 10 | 71% | 2,372 |
| 1 – 2 min | 11 | 81% | 5,629 |
| 2 – 4 min | 8 | 69% | 1,594 |
| 4+ min | 9 | **48%** | 1,324 |

| Rank correlation of margin against survival | |
|---|--:|
| Across the seven lines | **−0.96** |
| Across 68 legs with 100+ late arrivals | **−0.85** |
| Commuter legs only | **−0.78** |
| Long-distance legs only | **−0.75** |

It holds *within* each service type, so the category split is not doing the work — service type is
merely how margin happens to be distributed today. Read the correlation and the end points: the trend is
strong but not monotonic bucket to bucket, and the pack says so in `mechanism.note`.

### The baseline moves more than the mechanism

The share of arrivals 5+ minutes late has a median of **4.4%** and ranges **1.9%–11.4%** across the 60
days. How *many* trains run late swings nearly sixfold; what happens to a delay once it exists is
comparatively stable. Worth a beat on its own — and the days with the most lateness also have the
highest carry-over, which is the counterpoint above.

### Padding is derivable, and 52 legs have none

Over **403 passenger legs** with 60+ observations in the frozen 60-day pack, median scheduled run time
minus the 5th-percentile observed run time:

| | |
|---|---|
| Median padding | **0.9 min** |
| Range | **−2.3 to +15.3 min** |
| Legs with *negative* padding | **52** (13%) |
| Negative legs that beat their schedule on most runs | **0 of 52** |

`HL→TPE` is scheduled at 49 minutes against a 33.5-minute floor and beats its schedule on 88% of runs.
`JK→SAU` is scheduled at 5.3 minutes against a 6.1-minute floor and was not early once in 992 runs —
timetabled to be late. That contrast is the decision in one image.

> **Correction.** An earlier pass reported 273 legs, median 0.5 min, range −2.4 to +13.3. That pass
> filtered service category when measuring delay survival but *not* when measuring padding, so cargo,
> shunting and locomotive movements entered the scheduled-run-time median. Freight is timetabled far
> slower over the same rails, which inflates apparent slack — `YV→KOK` read 13.0 min with freight and
> **5.4 min** without, an overstatement of 7.6 minutes. The figures above are passenger-only. Legs the
> Spec names individually must be quoted from the corrected set.

### The margin is not spread evenly — it is spread by service type

Same 403 legs, split:

| | legs | median padding | range | negative |
|---|--:|--:|--:|--:|
| **Long-distance** | 226 | **2.2 min** | −1.4 to +15.3 | **9 (4%)** |
| **Commuter** | 177 | **0.2 min** | −2.3 to +2.1 | **43 (24%)** |

Long-distance trains get roughly twelve times the recovery margin and are almost never timetabled below
their realistic floor. Commuter trains get almost none, and a quarter of their legs are scheduled faster
than the leg has ever actually run.

**This closes the mechanism.** Commuter delays survive at 87% and long-distance at 72% — and the
schedule gives commuter trains nowhere to recover. Two independent measurements, one on outcomes and one
on the timetable, point the same way, and the margin-versus-survival correlation above explains *why*.
That is the story's spine, and the reason the claim moved from "the budget is in the wrong places" to
something the data can carry.

### Moving the margin works — but only where there is margin to move

The counterfactual is frozen in the pack at five strengths per line. It redistributes each line's total
padding toward the legs where delay survives, **conserving that line's total scheduled run time exactly**
(the pack records `journey_time_change_min` as 0.00 for every variant), then replays the observed delay
deltas through the new schedule.

On the focus line, carry-over at the next stop falls from **77% to 50%** at full strength — 21 legs made
tighter, 34 made slacker, largest single shift 11.4 minutes, and not one minute of journey time bought.

Per line, at full strength:

| Line | carry at +1, now → redistributed |
|---|---|
| Helsinki–Oulu | 79% → **47%** |
| Helsinki–Rovaniemi north main | 77% → **50%** |
| Helsinki–Joensuu | 80% → 61% |
| Helsinki–Siuntio coastal | 89% → 79% |
| Ring Rail loop | 93% → 86% |
| Helsinki–Riihimäki trunk | 91% → 86% |
| Helsinki–Tampere | 83% → 80% |

**This is the decision frame, and it is sharper than the Spec first assumed.** Long-distance lines can
halve delay survival by moving minutes they already have. Commuter lines cannot: they have almost nothing
to move, so redistribution buys them a handful of points. For commuter services the question is therefore
not *where* the recovery time should sit but *whether to buy any at all* — which does cost journey time,
and which this counterfactual deliberately does not model.

The replay holds each train's running behaviour fixed. Taking slack off a leg cannot make that leg
generate fresh delay in this arithmetic, though it would in the world. The pack states that in
`counterfactual.assumes` and the beat must state it on screen.

### The percentile floor holds up better than assumed

The floor was the weakest number in the first draft, so it was attacked directly:

| Test | Result |
|---|---|
| Resample one leg at n = 40 / 80 / 160 / 320 / 640 vs full | Floor identical to 0.1 min at every size, up to n = 13,671 |
| Same legs, 10-day vs 24-day window | Sign flips on **11 of 265 legs (4%)**; median shift +0.00 min |
| Percentile-free check: does the leg ever beat its schedule? | Negative-padding legs beat schedule on **0%** of runs (median); positive-padding legs **70%** |
| Negative-padding legs that still beat schedule most of the time | **0 of 52** in the frozen pack |

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

All seven lines clear it in the frozen 60-day pack, comfortably — the thinnest carries 2,731 late
arrivals at the next stop, the fattest 9,200. Ordered by carry-over, and set against their margin:

| Line | Service | stops | legs | carry at +1 | band | median padding | negative legs |
|------|---------|--:|--:|--:|---|--:|--:|
| Ring Rail loop | Commuter | 26 | 48 | 93% | 77–99% | 0.13 min | 11 |
| Helsinki–Riihimäki trunk | Commuter | 21 | 40 | 91% | 74–98% | 0.07 min | 12 |
| Helsinki–Siuntio coastal | Commuter | 19 | 40 | 87% | 75–98% | 0.31 min | 6 |
| Helsinki–Tampere | Commuter | 19 | 36 | 82% | 67–94% | 0.55 min | 5 |
| Helsinki–Joensuu | Long-distance | 13 | 29 | 76% | 62–93% | 2.18 min | 1 |
| **Helsinki–Rovaniemi north main** | Long-distance | 24 | 56 | 74% | 56–87% | 2.55 min | 1 |
| Helsinki–Oulu | Long-distance | 22 | 44 | 73% | 52–89% | 2.71 min | 0 |

**That table is the story.** The lines fall in almost exact margin order, across both service types —
which is where the −0.96 correlation comes from. The north main line is the focus lane: most legs (56),
a full 24-stop run, and the widest margin spread to show.

**Lines separate when their margin differs, and not otherwise.** On 60 days, 2 of 9 same-category pairs
separate robustly and 7 do not:

| | | |
|---|---|---|
| Helsinki–Riihimäki vs Helsinki–Tampere | 57 of 60 days | **separates** |
| Helsinki–Tampere vs Ring Rail | 2 of 59 days | **separates** |
| Helsinki–Joensuu vs Helsinki–Oulu | 42 of 57 | no |
| Helsinki–Oulu vs north main | 32 of 58 | no |
| Ring Rail vs coastal | 12 of 59 | no |
| …four more | | no |

The pairs that separate are the ones with the biggest margin gap (0.07 vs 0.55 min; 0.55 vs 0.13). The
pairs that do not are the ones with similar margin. Nothing here is about line identity.

> **Revision.** The 24-day verification read this as "lines do not separate at all — head-to-head is a
> coin flip". On 60 days two pairs do separate, and the unifying explanation appeared: separation tracks
> margin. The earlier reading was the same finding seen through too small a sample, which is exactly why
> the Spec required recomputation on the pack before shipping.

**Design consequence.** The picker stays a recognition control, but it now has something true to teach:
lines that look alike have alike margin, and the one that stands out stands out because its timetable is
different. Never rank lines by quality. Where a pair separates, put the day count on screen.

### The Ring is the mechanism's limiting case

The Ring Rail Line returns to where it started, so a delay can come round — and it does. Highest
carry-over of any line (93%), lowest margin (0.13 min median, 11 negative legs), and redistribution
barely helps it (93% → 86% even at full strength) because there is nothing to redistribute. Not a
curiosity after all: it is what the bottom of the margin scale looks like. Still not the opening, since
a loop asks the reader to hold a harder mental model than a line, but it belongs in the picker and it
earns a mention beside the counterfactual's limits.

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
| **Budget counterfactual** | Re-allocate the same total minutes toward the legs where delay survives: the focus line goes 77% → 50% with journey time untouched |
| **The limit of redistribution** | Commuter lines gain only a handful of points because they have nothing to move. For them the honest question is whether to *buy* margin, which costs journey time and is not modelled here |
| **Thin attribution** | Only 1% of rows carry a cause. We can say a delay survived a leg; we mostly cannot say why. The story must not imply we can |
| **Percentile floor** | The "technical minimum" is a 5th percentile of observed runs, not an engineering figure. Resampling shows it stable from n=40 upward and 4% of legs flip sign between windows, so the limit is interpretive rather than statistical — a leg with no slack is not necessarily a leg that *should* have slack |
| **Line identity** | Lines separate only when their margin differs. The picker is for recognition; any beat implying line A is worse than line B needs the day count on screen |
| **Association, not experiment** | Margin predicting survival is measured across legs, not manipulated. Legs with more margin may differ in other ways — length, track, traffic — and nothing here rules that out |
| **Season** | The pack is 60 late-summer and early-autumn days. Winter evidence comes from the separate year-spread sample, and the two must not be quoted as one |
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
pack.

**The sameness is the beat, not a caveat.** The reader arrives looking for their own line and finds it
behaves like the last one — measured, lines within a service type do not separate (7 of 16 days, 6 of
11). That is the finding: this is a property of how the timetable allocates margin by service type, not
one badly-run line. A reader who leaves thinking "my line is the bad one" has been misled by the
control. Copy should invite the comparison and then name the result, so discovering the sameness feels
like the point being made rather than the interface failing.

Do not rank lines. Where two genuinely do sit apart, put the day count on screen beside the claim.

### VIII — Move the budget
Scrub a re-allocation of the *same total* minutes toward the legs where delay survives, and replay the
observed delays through it. Badge the whole beat `modelled`. Travel increases then stops; no rewind.

### IX — What it costs
Decision card: where the margin should sit, what punctuality it buys, what journey time it costs, and
what we could not see (cause attribution at 1%, the percentile floor, one country, no capacity or crew
model). Limitations panel required.

---

## Evidence pack

**Status:** **frozen.** `data/figures/where-should-the-recovery-time-sit.v1.json` (160 KB), built by
`scripts/freeze-rail-recovery.py` from the day cache pulled by `scripts/fetch-rail-days.py`. Window
2026-07-28 → 2026-09-25 (60 days). Every block carries a `kind`.

| Claim | Figure | Kind | Does *not* show |
|-------|--------|------|-----------------|
| Delay carries to the next stop | 81% median, 67–90% across 60 days | observed | That the cause is known |
| Decay over four stops | 81% → 72% → 66% → 62% (medians) | observed | Anything beyond ~4 stops reliably; samples thin |
| Commuter vs long-distance | 87% vs 72%, commuter higher 60/60 days | observed | Why the services differ |
| **Margin predicts survival** | **ρ = −0.96 across lines, −0.85 across legs, −0.78 / −0.75 within category** | calculated | Causation; it is an association across legs, not an experiment |
| Survival by margin band | 99% at negative margin → 48% at 4+ min | calculated | A monotonic step-by-step relationship |
| Lateness baseline | median 4.4%, range 1.9–11.4% of arrivals | observed | A punctuality target or its breach |
| Padding per leg | median 0.9 min, range −2.3 to +15.3, 403 passenger legs | calculated | An engineering minimum run time |
| Legs with negative padding | 52 (13%) | calculated | That those legs are anyone's mistake |
| Padding by service type | long-distance 2.2 min / 4% negative vs commuter 0.2 min / 24% | calculated | Why the timetable was built that way |
| Negative legs never run early | 0 of 52 beat schedule on most runs | observed | That the schedule is infeasible, only that it has no slack |
| Percentile-floor stability | 4% of 265 legs flip sign between windows; floor flat from n=40 | calculated | That the floor is an engineering minimum |
| Lines a reader can select | 7, each with 2,731–9,200 late arrivals at +1 | calculated | That those lines differ in quality |
| Line-vs-line separation | 2 of 9 same-category pairs separate; both are the biggest margin gaps | observed | A ranking of lines |
| Ring Rail as limiting case | highest carry (93%), lowest margin (0.13 min), least to gain | observed | That every loop behaves this way |
| Re-allocated budget | focus line 77% → 50% at +1, journey time conserved exactly | **modelled** | A plan, a proposal, or feasibility |
| Commuter has no margin to move | 93% → 86% at full strength | **modelled** | That commuter cannot be improved — only that redistribution will not do it |
| Cause attribution | ~1% of rows | observed | A breakdown of causes |

**Sources**

1. Fintraffic Digitraffic Railway `/api/v1/trains/{date}` — CC BY 4.0, attribution on Context
2. Station metadata `/api/v1/metadata/stations` (563 stations, 215 with passenger traffic)
3. Pack window 2026-07-28 → 2026-09-25 (60 consecutive days). Verification windows retained for
   seasonality only: 2026-09-14 → 09-25 (10 weekdays) and a 14-day spread 2025-10-14 → 2026-09-08.
   The pack window is late summer into early autumn, so **it is not a winter sample** — the seasonality
   band is what speaks to winter, and the film must not present the pack band as a year-round figure

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

- [x] Claim approved — "long-distance trains are given room to recover; commuter trains are given almost none"
- [ ] **Decide the proposed claim upgrade** (margin, not service type) — the pack now supports the stronger statement
- [ ] Human approves Question / Takeaway / limitations wording
- [x] Line or lines chosen for v1 — network-wide opening, north main line as the focus lane, all seven lines selectable
- [x] Counterfactual method agreed — re-allocate the same total minutes in proportion to measured survival, whole beat badged `modelled`
- [x] Picker captions agreed — recognition control, no ranking; revised so it also teaches that alike lines have alike margin
- [x] Evidence pack frozen with kind tags — 60 days, 160 KB, every block tagged
- [ ] Beat list stable enough to draft narration and visual states — Act VI and VIII briefs need rewriting against the margin finding
- [ ] Explicit non-goals respected (no speaking for the operator, no plan cosplay)
