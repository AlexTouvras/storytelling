# Decision Spec — Why don't delays die?

> *(The decision: where should the recovery time sit?)*

> Third Interactive Decision Storytelling piece (Orbit flagship).
> Catalogue pick: `rata-delay-propagation` (Round E, `craft_sum` 28 — the catalogue's only *measured* craft score).
> **Status:** **Spec closed, 2026-09-26.** Scope, counterfactual method, Claim, picker captions, the
> ten-act arc, and the Question / Takeaway / limitations wording are all signed off. **Evidence pack
> frozen on a full year** (2025-09-26 → 2026-09-25). Next work is narration and visual states, then the
> film.
> **Slug:** `where-should-the-recovery-time-sit` — the *decision*, not the title. Kept deliberately: the
> frozen pack ships under that filename, and a URL that names the decision outlives a headline.
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
| **QUESTION** (reader's, and the title) | Why don't delays die? |
| **DECISION** (the planner's, which the film resolves) | Where should the recovery time sit? — where to place a fixed budget of recovery margin along a line |
| **CLAIM** | A delay dies only where the timetable leaves room for it to die. **Margin decides survival** — and today margin is handed out by service type, so long-distance trains get room to recover and commuter trains get almost none |
| **MECHANISM** | Train is late at a stop → the next leg's scheduled run time either exceeds what the leg actually takes or it does not → the delay is absorbed or handed on → the same test repeats at every stop to the end of the run |
| **VISUAL OBJECT** | One field of arrival marks (a mark = one train at one stop), positioned by place in the run against minutes late. The film opens on the whole network, then settles onto **one line** the reader can change. The same marks carry the decay curve and the padding profile |
| **EVIDENCE** | Observed scheduled and actual times at every stop; calculated carry-over, decay curve and per-leg padding; a clearly-labelled modelled counterfactual for re-allocated padding |
| **COUNTERPOINT** | The carry-over is not a constant. It rises when the network is stressed, so padding sized on a quiet day is padding sized for the wrong day |
| **UNCERTAINTY** | Cause attribution covers only ~1% of rows; sample thins beyond ~4 stops; the technical minimum run time is a percentile proxy, not an engineering fact. Individual **lines within one service type do not reliably differ** — the separation is between service types |
| **TAKEAWAY** | Margin decides whether a delay dies. Put it where delay actually survives — long-distance already has the minutes and only needs to move them; commuter does not have enough to move |

> ### How the Claim got here
>
> The first Claim was "the current budget is demonstrably in the wrong places" — rhetoric the data could
> not carry. The second was a statement about *who got the margin*, which was measured and true but
> described a symptom.
>
> The frozen year established the mechanism behind the symptom: **recovery margin predicts delay survival
> directly**, within each service type separately (Spearman −0.86 across the seven lines, −0.79 across 119
> legs, −0.66 commuter-only, −0.69 long-distance-only) and in all three timetable periods the year
> contains. Legs with negative margin carry a delay across at **97%**; legs with 4+ minutes of margin
> carry it at **49%**.
>
> That is what earned the current wording, **signed off 2026-09-26**. It matters because a planner
> controls margin directly and does not control service type, so the claim now names a lever rather than a
> grievance.

> ### Why the title is a question the film does not open by answering
>
> **Signed off 2026-09-26:** the film is titled *Why don't delays die?* while the decision it resolves
> stays *where should the recovery time sit?* Those are deliberately different sentences. The reader
> arrives with the first one — it is the thing anyone standing on a platform actually wonders — and
> leaves with the second, which is the only one a planner can act on. Open on the reader's question,
> close on the planner's decision.
>
> **This costs something and the cost is managed, not ignored.** A *why* title promises causation, and
> this pack cannot attribute a single delay to a cause: the feed's cause codes cover ~1% of rows. So the
> film answers the title **structurally** — a delay dies where the next leg is scheduled longer than it
> takes, and does not where it is not — and that answer rests on an association across legs (ρ −0.79,
> holding within each service type and every timetable period), never on an experiment.
>
> Two prohibitions follow, and they are not optional. No beat may answer the title with a cause of
> delays (weather, works, rolling stock, crew) — the film explains what happens to a delay that already
> exists, not what created it. And the title must never appear beside a cause breakdown, because putting
> them together implies the 1% can carry the question. If the film cannot hold that line, the title goes
> back to being the decision.

**Epistemic rule.** Teaching beats may follow one illustrative train. Any figure that looks like a
network fact carries `observed` | `calculated` | `illustrative` | `hypothetical`. We are reading a
public operational feed, not speaking for Fintraffic or VR: no beat may imply either endorses this
analysis, and no beat may present the counterfactual as a plan.

**Attribution and non-affiliation** live on the context/close panel only (signed off 2026-09-26): the
CC BY 4.0 credit to Fintraffic plus an explicit "not affiliated with, and not endorsed by, Fintraffic or
any operator". Not repeated per beat — but the Act VII and Act IX caveats stay in their beats, because
those qualify a number the reader is looking at while they read it.

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
| Windows | **365 days** for the frozen pack, 2025-09-26 → 2026-09-25. Survival, seasonality and day bands use the whole year; **margin uses the current timetable period only** (2026-06-26 → 2026-09-25, 92 days), because the timetable is re-cut during the year and pooling it describes no operated schedule |
| Segmentation | **Commuter and long-distance are separated everywhere.** Not optional — see evidence |
| Line definition | A line is a **modal route signature**: the actual ordered stop sequence operated between two endpoints, with expresses absorbed into the longest signature they are a subsequence of. Never an average of stop positions — see the trap below |
| Padding per leg | Median scheduled leg run time (next stop's scheduled arrival − this stop's scheduled departure) minus the **5th percentile of observed run times**, on **passenger services only**, within **one timetable period**, and per **service type** — Helsinki–Pasila is run by both commuter and long-distance trains at different scheduled times, so the unit is (from, to, category). Legs need 60+ observations. Reported beside a percentile-free check: the share of runs that beat the scheduled time |
| Counterfactual | Re-allocate the same total padding minutes across legs in proportion to measured survival, then replay observed delays through the new schedule. **Modelled, and labelled as such on screen** |
| Excluded | Cargo, shunting, locomotive, on-track machines and test drives — no passenger decision attached, **and including them corrupts padding** (see below) |
| Engine cost | The pack is 185 KB. It holds 425 legs, seven lines with their own curves and legs, a year of per-day baseline, twelve months of seasonality and five counterfactual strengths per line — no raw runs, and nothing the engine has to recompute |

Freeze path: pull → aggregate → `data/figures/where-should-the-recovery-time-sit.v1.json`. The engine
never queries the API at render time.

---

## What the frozen pack measures

Figures below are **from the frozen pack** — `data/figures/where-should-the-recovery-time-sit.v1.json`,
built by `scripts/freeze-rail-recovery.py` over **a full year**, 2025-09-26 → 2026-09-25: 395,094
passenger runs, 5,272,722 timetable rows.

### Coverage

| | |
|---|---|
| Timetable rows (365 days, passenger) | **5,272,722** across 395,094 runs |
| Rows with an actual time | **91.3%** |
| Rows with delay minutes | **92.5%** |
| Rows carrying a cause | **~1%** |

### The timetable is re-cut during the year, so padding is period-scoped

A year cannot be pooled. Comparing each day with the same weekday a week earlier, an ordinary week moves
**1.3%** of legs by half a minute or more — but **2025-12-14 moves 18.8%**, the annual re-cut, and
2026-06-06 moves 13.8%. A single median scheduled run time across twelve months describes no timetable
that was ever operated, and a leg's margin can shift by up to 8.5 minutes across a boundary.

The pack therefore detects periods (threshold = max(10%, 3× the weekly baseline)) and scopes every
padding figure inside one:

| Period | days |
|---|--:|
| 2025-09-26 → 2025-12-30 | 96 |
| 2025-12-31 → 2026-06-25 | 177 |
| **2026-06-26 → 2026-09-25** (padding period) | **92** |

Survival, seasonality and the day bands use the whole year; margin uses the current period, because a
planner acts on the timetable in force.

### A delay carries

Share of 5+ minute late arrivals still 5+ minutes late N stops later, with the day-to-day band across
365 days:

| stops on | +1 | +2 | +3 | +4 |
|---|--:|--:|--:|--:|
| median | **81%** | 72% | 67% | 63% |
| band across 365 days | 56–94% | 37–90% | 23–88% | 16–87% |

Always a majority at the next stop. The band is far wider than a 60-day window suggested (67–90%),
which is the honest cost of a year: single quiet or wrecked days reach further in both directions.

### Commuter and long-distance are different services

Carry-over to the next stop:

| | median | band across 365 days |
|---|--:|---|
| Commuter | **89%** | 69–97% |
| Long-distance | **72%** | 47–94% |

Commuter is higher on **359 of 363 comparable days** — measured into the pack as
`category_head_to_head`, not asserted. Over four stops the gap widens from 89% vs 72% to 80% vs 41%. A
film that pooled them would be averaging two different mechanisms.

### Seasonality: the volume swings, the mechanism does not

This is what the year bought, and it settles the question directly.

| month | arrivals 5+ late | carry-over at +1 | commuter | long-distance |
|---|--:|--:|--:|--:|
| 2025-10 | 3.2% | 82% | 90% | 72% |
| 2025-11 | 3.1% | 81% | 88% | 70% |
| 2025-12 | 2.7% | 81% | 91% | 71% |
| 2026-01 | 4.2% | **85%** | 93% | 72% |
| 2026-02 | 4.4% | **85%** | 92% | 76% |
| 2026-03 | 2.8% | 78% | 88% | 70% |
| 2026-04 | 2.8% | 79% | 85% | 77% |
| 2026-05 | 4.0% | 81% | 89% | 72% |
| 2026-06 | **7.2%** | 82% | 87% | 73% |
| 2026-07 | 6.1% | **75%** | 84% | 70% |
| 2026-08 | 5.2% | 81% | 88% | 72% |
| 2026-09 | 3.7% | 80% | 88% | 72% |

**Lateness volume swings by a factor of 2.7 across months (2.7% → 7.2%) and by a factor of 40 across
individual days (0.4% → 15.4%). Carry-over stays inside 75–85% all year.** How many trains run late is
seasonal; what happens to a delay once it exists is close to a constant of the timetable.

Two details worth a beat. Carry-over is *highest* in January and February (85%), so winter both makes
more delays and makes them stickier. And the busiest months for lateness are June and July — summer
engineering works, not weather — with July showing the year's lowest carry-over, because a thinner
summer timetable leaves more room to recover.

### The mechanism is margin, not service type

The strongest finding in the pack, and the reason the claim upgrade above is proposed. Delay survival
across a leg falls as that leg's recovery margin rises. Margin and survival are read from the **same
timetable period**, since comparing a leg's padding under one timetable against its delays under another
would measure nothing:

| padding on the leg | legs | delay carries across | late events |
|---|--:|--:|--:|
| negative | 12 | **97%** | 2,366 |
| 0 – 0.5 min | 39 | 93% | 10,543 |
| 0.5 – 1 min | 16 | 74% | 3,863 |
| 1 – 2 min | 19 | 82% | 8,203 |
| 2 – 4 min | 19 | 70% | 4,688 |
| 4+ min | 14 | **49%** | 2,557 |

| Rank correlation of margin against survival | |
|---|--:|
| Across the seven lines | **−0.86** |
| Across 119 legs with 100+ late arrivals | **−0.79** |
| Commuter legs only | **−0.66** |
| Long-distance legs only | **−0.69** |

It holds *within* each service type, so the category split is not doing the work — service type is
merely how margin happens to be distributed today. Read the correlation and the end points: the trend is
strong but not monotonic bucket to bucket, and the pack says so in `mechanism.note`.

**And it holds in every timetable period,** which is the check that matters most. A relationship
appearing in only one period would be a property of one timetable rather than of margin:

| period | legs | all | commuter | long-distance |
|---|--:|--:|--:|--:|
| 2025-09-26 → 2025-12-30 | 409 | −0.85 | −0.87 | −0.59 |
| 2025-12-31 → 2026-06-25 | 434 | −0.79 | −0.78 | −0.50 |
| 2026-06-26 → 2026-09-25 | 425 | −0.79 | −0.66 | −0.69 |

Negative in all three periods and both service types, across two annual re-cuts.

### Padding is derivable, and 47 legs have none

Over **425 passenger legs** with 60+ observations in the current timetable period, median scheduled run
time minus the 5th-percentile observed run time:

| | |
|---|---|
| Median padding | **0.9 min** |
| Range | **−1.4 to +23.1 min** |
| Legs with *negative* padding | **47** (11%) |
| Negative legs that beat their schedule on most runs | **0 of 47** |

`HL→TPE` is scheduled at 49 minutes against a 33.7-minute floor and beats its schedule on 88% of 223
runs. `JK→SAU` is scheduled at 6.1 minutes against a 7.5-minute floor and was not early once in **3,652
runs** — timetabled to be late. That contrast is the decision in one image.

The +23.1 min top of the range is `KV→HNN`, a 60-minute Kouvola–Henna leg operated as a commuter service
with only 66 observations. Real, but a thin outlier on a leg unlike the rest of the commuter network;
quote the median and the named legs, not the maximum.

> **Correction.** An earlier pass reported 273 legs, median 0.5 min, range −2.4 to +13.3. That pass
> filtered service category when measuring delay survival but *not* when measuring padding, so cargo,
> shunting and locomotive movements entered the scheduled-run-time median. Freight is timetabled far
> slower over the same rails, which inflates apparent slack — `YV→KOK` read 13.0 min with freight and
> **5.4 min** without, an overstatement of 7.6 minutes. The figures above are passenger-only. Legs the
> Spec names individually must be quoted from the corrected set.

### The margin is not spread evenly — it is spread by service type

Same 425 legs, split:

| | legs | median padding | range | negative |
|---|--:|--:|--:|--:|
| **Long-distance** | 233 | **2.27 min** | −1.3 to +15.3 | **9 (4%)** |
| **Commuter** | 192 | **0.24 min** | −1.4 to +23.1 | **38 (20%)** |

Long-distance trains get roughly nine times the recovery margin and are almost never timetabled below
their realistic floor. Commuter trains get almost none, and a fifth of their legs are scheduled faster
than the leg has ever actually run.

**This closes the mechanism.** Commuter delays survive at 89% and long-distance at 72% — and the
schedule gives commuter trains nowhere to recover. Two independent measurements, one on outcomes and one
on the timetable, point the same way, and the margin-versus-survival correlation above explains *why*.
That is the story's spine, and the reason the claim moved from "the budget is in the wrong places" to
something the data can carry.

### Moving the margin works, and where it stops working is the second decision

The counterfactual is frozen in the pack at five strengths per line. It redistributes each line's total
padding toward the legs where delay survives, **conserving that line's total scheduled run time exactly**
(the pack records `journey_time_change_min` as 0.00 for every variant), then replays the observed delay
deltas through the new schedule.

On the focus line, carry-over at the next stop falls from **75% to 56%** at full strength — 22 legs made
tighter, 37 made slacker, largest single shift 11.9 minutes, and not one minute of journey time bought.
Most of the gain arrives by quarter strength (75% → 66%), which is worth knowing for the scrub: the beat
should not need to be dragged to the end to show its point.

Per line, at full strength:

| Line | Service | carry at +1, now → redistributed | gain |
|---|---|---|--:|
| Helsinki–Rovaniemi north main | Long-distance | 75% → **56%** | 19 pts |
| Helsinki–Oulu | Long-distance | 75% → **56%** | 19 pts |
| Helsinki–Joensuu | Long-distance | 77% → 65% | 12 pts |
| Ring Rail loop | Commuter | 94% → 84% | 10 pts |
| Helsinki–Siuntio coastal | Commuter | 89% → 79% | 10 pts |
| Helsinki–Riihimäki trunk | Commuter | 89% → 82% | 7 pts |
| Helsinki–Tampere | Commuter | 82% → 78% | 4 pts |

**The decision frame, stated precisely.** Redistribution helps every line, and roughly twice as much on
long-distance as on commuter. But the number that matters is not the gain, it is the floor:

> Even optimally redistributed, every commuter line still carries a delay to the next stop **78–84%** of
> the time — worse than long-distance lines manage **today**, at 75–77%.

So redistribution answers the long-distance question and cannot answer the commuter one. Commuter lines
do not have enough margin for rearranging it to close the gap. That is a *second* decision, and the film
should carry it as such: for commuter services the question becomes whether to **buy** margin, which
costs journey time on every train every day, and which this counterfactual deliberately does not model.
Saying so is more useful than implying one lever fixes both.

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

All seven lines clear it comfortably in the frozen year. Ordered by carry-over, and set against their
margin in the current timetable period:

| Line | Service | stops | legs | carry at +1 | band | median padding | negative legs |
|------|---------|--:|--:|--:|---|--:|--:|
| Ring Rail loop | Commuter | 26 | 48 | 93% | 67–100% | 0.13 min | 10 |
| Helsinki–Siuntio coastal | Commuter | 19 | 40 | 90% | 67–100% | 0.31 min | 6 |
| Helsinki–Riihimäki trunk | Commuter | 21 | 40 | 89% | 63–99% | 0.09 min | 8 |
| Helsinki–Tampere | Commuter | 19 | 36 | 82% | 56–100% | 0.58 min | 2 |
| Helsinki–Joensuu | Long-distance | 13 | 29 | 78% | 54–96% | 2.15 min | 0 |
| Helsinki–Oulu | Long-distance | 22 | 44 | 77% | 44–93% | 2.67 min | 0 |
| **Helsinki–Rovaniemi north main** | Long-distance | 24 | 59 | 74% | 43–97% | 2.52 min | 1 |

**That table is the story.** The lines fall in near-exact margin order across both service types, which
is where the −0.86 correlation comes from. The north main line is the focus lane: most legs (59), a full
24-stop run, and the widest margin spread to show.

**Lines separate when their margin differs, and not otherwise.** The pairs that separate are the ones
with the biggest margin gap; the pairs that do not are the ones with similar margin. Nothing here is
about line identity, which is why the picker must not be captioned as a ranking.

> **Revision, twice over.** The 24-day verification read this as "lines never separate — head-to-head is
> a coin flip". On 60 days two pairs separated and the unifying explanation appeared: separation tracks
> margin. On the full year the correlation is steadier but slightly weaker (−0.86 against −0.96), because
> a year includes days no 60-day window contains. Both revisions are the same lesson — a sample that
> fits a conclusion is not a sample that tests it — and both are in the open rather than quietly
> restated.

**Design consequence.** The picker stays a recognition control, but it has something true to teach:
lines that look alike have alike margin, and the one that stands out stands out because its timetable is
different. Never rank lines by quality. Where a pair separates, put the day count on screen.

### The Ring is the mechanism's limiting case

The Ring Rail Line returns to where it started, so a delay can come round — and it does. Highest
carry-over of any line (93%), lowest margin (0.13 min median, 10 negative legs), and even at full
redistribution it still carries a delay 84% of the time, worse than any long-distance line manages today.
Not a curiosity after all: it is what the bottom of the margin scale looks like, and the clearest case of
the second decision. Still not the opening, since a loop asks the reader to hold a harder mental model
than a line, but it belongs in the picker and beside the counterfactual's limits.

### Legs behave consistently

Taking late trains only and legs with 40+ observations, **10 of 12** examined keep the same sign on
all ten weekdays: `KEM→OL` adds a mean +6.0 min (range +2.8 to +12.3), `KV→LH` absorbs −4.8 min
(range −5.7 to −4.2), `OL→YV` absorbs −8.1 min. The two that flip sit within a rounding of zero.

---

## Uncertainty & scenarios

| Lens | What the reader should feel |
|------|-----------------------------|
| **Threshold** | 5 minutes is a choice. At 3 the carry-over rises, at 10 it falls; the *shape* of the decay is what survives the choice |
| **Stress scenario** | On the worst days carry-over reaches 94%, and it is highest in January and February. Margin sized on a median day is undersized exactly when it matters |
| **Season** | Volume is seasonal and the mechanism is not: monthly late share swings 2.7–7.2% while carry-over stays inside 75–85% all year. Winter makes both more delays and stickier ones |
| **Segment scenario** | Move the same minutes within commuter vs within long-distance — the two need different profiles, not one line |
| **Budget counterfactual** | Re-allocate the same total minutes toward the legs where delay survives: the focus line goes 75% → 56% with journey time untouched, most of it by quarter strength |
| **The limit of redistribution** | Optimally redistributed, commuter lines still carry 78–84% — worse than long-distance manages today. For them the honest question is whether to *buy* margin, which costs journey time and is not modelled here |
| **Thin attribution** | Only 1% of rows carry a cause. We can say a delay survived a leg; we mostly cannot say why. The story must not imply we can |
| **Percentile floor** | The "technical minimum" is a 5th percentile of observed runs, not an engineering figure. Resampling shows it stable from n=40 upward and 4% of legs flip sign between windows, so the limit is interpretive rather than statistical — a leg with no slack is not necessarily a leg that *should* have slack |
| **Line identity** | Lines separate only when their margin differs. The picker is for recognition; any beat implying line A is worse than line B needs the day count on screen |
| **Association, not experiment** | Margin predicting survival is measured across legs, not manipulated. Legs with more margin may differ in other ways — length, track, traffic — and nothing here rules that out |
| **Timetable period** | Margin describes the timetable in force (2026-06-26 → 2026-09-25). The timetable is re-cut roughly annually and a leg's margin can move by minutes across a boundary, so no margin figure is a permanent fact about a leg |
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
| **VI — A year of it** | WIDEN | Volume is a season; the mechanism is not — and winter is worst at both | `compare` | Twelve months against the same curve; a seasonal band |
| **VII — Where the slack is** | COMPARE | Margin per leg against where delay survives, and the mechanism behind it | `compare` + `trace` | Padding profile along the line; the negative legs |
| **VIII — Your line** | FILTER | Change the line and see whether your line behaves differently | `filter` | Line picker; the same profile and curve re-fit |
| **IX — Move the budget** | FILTER | Re-allocate the same minutes and replay | `filter` | Scrubbed budget; the decay curve responds |
| **X — What it costs** | SYNTHESIS | What the move buys, and the decision it does not settle | `highlight` | Decision card + limitations |

**Atmosphere:** an intro/outro motif only if it earns the mood. No new page architecture.
Directed-film path (one scrubbed shot plus an operable sleeve), consistent with stories 1 and 2.

**Next-story rule check.** No new `visualId` is proposed. The persistent mark field plus a
frontier-style chart already express every beat: Act VII's margin profile and Act IV's decay curve are
both the cut-off film's chart role, and Acts I–V are the mark field under a moving camera. The Act VIII
line picker is a `filter` over the same marks, not a new surface, and Act VI's seasonal band is the same
chart with a band instead of a line. Register a new visual only if implementation proves that false.

**On length.** Ten acts is more than the film wants to carry at equal weight, so Act VI is the shortest
in the film — one image, two sentences, no interaction. It exists because the year found the most
counterintuitive thing in the pack, not because the structure needed another chapter. If it cannot be
made to land in one screen, it goes back to being the counterpoint line on Act X's decision card.

**Craft note on the opening narrowing.** Act I is the one shot where the camera travels a long way, and
it is exactly the case `cameraCreep` and `strokeWeight` were written for: the marks must be the same
marks before and after, linework must thin as the camera pushes in, and travel must increase and then
stop rather than easing out early. If the narrowing re-draws the field instead of moving the camera
through it, the film has lost the claim that the network and the line are the same data.

---

## Act briefs

### Open
Headline: **WHY DON'T DELAYS DIE?**
Sub: A delay is not an event. It is a thing that travels, and the timetable decides how far.

The headline is the reader's question, not the planner's. It is asked here and answered structurally in
Act VII; the planner's decision — where the recovery time should sit — is not put to the reader until
Act X. Do not answer the headline in the opening copy, and do not let it sit near anything that looks
like a cause breakdown.
Hero: a day's arrivals, dim and unlabelled. Wide on purpose: the reader should feel the volume before
meeting a single train. The pack holds a year, so the opening can also state the scale honestly —
5.3 million arrivals, 395,094 runs.

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
Accumulate to every 5+ minute late arrival in the year. The survival curve emerges from the same marks —
81% at the next stop, 63% four stops on. Show the day-to-day range as a band, not a single line, and let
it be as wide as it is (56–94% at the next stop): a year of days is wider than a tidy window and the
honesty is part of the point.

### V — Two services
Split commuter from long-distance: 89% against 72%, commuter higher on 359 of 363 days. Same marks, two
decays. This is the beat that stops the reader thinking "trains are trains".

### VI — A year of it
The shortest beat in the film. One image: twelve months, the monthly share of arrivals running late
against the monthly carry-over.

The lateness volume swings from **2.7% to 7.2%** by month and **0.4% to 15.4%** by day. The carry-over
line barely moves — **75% to 85%, every month of the year**. Volume is weather and engineering works;
survival is the timetable.

Then the turn that earns the beat: carry-over is **highest in January and February (85%)**. Winter
delivers more delays *and* stickier ones, at the same time. So a margin budget sized on a median day is
undersized exactly when it is needed most — which is the counterpoint the decision frame promises, and it
is better shown here than asserted later.

**Say whose winter it is.** Split by service type the rise is not symmetric: commuter carry-over peaks
cleanly in Jan–Feb (**93% / 92%** against a 84% July floor), while long-distance peaks in **February
(76%) and April (77%)** and sits near its own average in January. So the aggregate winter peak is mostly
a commuter effect, and the beat must say so rather than letting the reader generalise it to the network.
That is not a weakening — it points at the same lever, because commuter is the service with no margin to
spend when the weather takes some.

No interaction. Do not let the reader scrub the year; they are being told something, not asked to explore
it. And do not imply a cause for the winter rise — the pack cannot say why, only that it happens. In
particular do not call it weather: the pack has no weather data, and the April long-distance peak is a
standing reminder that something else is also moving.

### VII — Where the slack is
Padding per leg along the line, against where delay actually survives — then the split that closes the
argument: long-distance holds a median 2.27 minutes of margin with 4% of legs negative, commuter holds
0.24 minutes with 20% negative. The service that cannot shed a delay is the service that was given
nowhere to shed it. `JK→SAU` is the image: **3,652 runs, not one of them early.**

This is also where the margin-versus-survival relationship belongs, because it is what turns the split
from a coincidence into a mechanism — 97% carry-over on legs with no margin, 49% on legs with four
minutes or more, and the same relationship inside each service type and in all three timetable periods.

State the percentile-floor caveat on screen in this beat, and state its answer with it — negative legs
beat their schedule on 0% of runs, so the finding does not rest on the percentile.

### VIII — Your line
The reader changes the line. The padding profile and the decay curve re-fit to it, from the same frozen
pack.

**The sameness is the beat, not a caveat.** The reader arrives looking for their own line and finds it
behaves like the last one — measured, lines within a service type do not separate (7 of 16 days, 6 of
11). That is the finding: this is a property of how the timetable allocates margin by service type, not
one badly-run line. A reader who leaves thinking "my line is the bad one" has been misled by the
control. Copy should invite the comparison and then name the result, so discovering the sameness feels
like the point being made rather than the interface failing.

Do not rank lines. Where two genuinely do sit apart, put the day count on screen beside the claim.

### IX — Move the budget
Scrub a re-allocation of the *same total* minutes toward the legs where delay survives, and replay the
observed delays through it: the focus line goes 75% → 56% at the next stop with journey time untouched.
Badge the whole beat `modelled`. Travel increases then stops; no rewind. Note for the scrub's easing:
most of the gain lands by quarter strength, so the curve should visibly respond early rather than
rewarding only the end of the drag.

### X — What it costs, and the decision it does not settle
Two turns, not one — and the act where the film finally states the planner's question out loud.

The title asked why delays don't die and Act VII answered it: because the timetable left them nowhere
to. This act turns that into the decision — **so where should the recovery time sit?** — and it must be
put as a question the reader can now answer themselves, not as a conclusion handed down. The whole film
has been building the one fact needed to answer it.

Takeaway line, as signed off: *margin decides whether a delay dies. Put it where delay actually
survives — long-distance already has the minutes and only needs to move them; commuter does not have
enough to move.*

First, for long-distance the question is answered: move the minutes you already have and delay survival
falls by roughly 19 points for free.

Then the turn. Redistribute commuter margin optimally and those lines **still** carry a delay 78–84% of
the time — worse than long-distance lines manage today. There is not enough margin on a commuter line for
rearranging it to close the gap, so the reader is left with a second, harder decision: buy margin, which
costs journey time on every train every day, or accept that a commuter delay mostly does not die. The
film should not pretend one lever settles both, and it must not price the second one — that needs
capacity, rolling-stock and crew assumptions this evidence cannot supply.

Decision card: where the margin should sit, what that buys, what it leaves unsolved, and what we could
not see (cause attribution at 1%, the percentile floor, one timetable period for margin, one country, no
capacity or crew model). Limitations panel required, and this is the **only** place the full list
appears — badges carry the rest of the film, and the reader should not be asked to read caveats they
cannot yet interpret. Context/attribution sits on the same panel: CC BY 4.0 credit to Fintraffic, and
not affiliated with or endorsed by Fintraffic or any operator.

The counterpoint belongs here too, in one line: carry-over is worst in the months with the most delays,
so margin sized on a median day is sized for the wrong day.

---

## Evidence pack

**Status:** **frozen on a full year.** `data/figures/where-should-the-recovery-time-sit.v1.json` (185 KB),
built by `scripts/freeze-rail-recovery.py` from the 6.5 GB day cache pulled by
`scripts/fetch-rail-days.py`. Window 2025-09-26 → 2026-09-25 (365 days). Every block carries a `kind`.

| Claim | Figure | Kind | Does *not* show |
|-------|--------|------|-----------------|
| Delay carries to the next stop | 81% median, 56–94% across 365 days | observed | That the cause is known |
| Decay over four stops | 81% → 72% → 67% → 63% (medians) | observed | Anything beyond ~4 stops reliably; samples thin |
| Commuter vs long-distance | 89% vs 72%, commuter higher on 359 of 363 days | observed | Why the services differ |
| **Margin predicts survival** | **ρ = −0.86 across lines, −0.79 across legs, −0.66 / −0.69 within category** | calculated | Causation; it is an association across legs, not an experiment |
| Mechanism holds every period | −0.85 / −0.79 / −0.79 across three timetable periods | calculated | That it would hold under a timetable unlike these three |
| Survival by margin band | 97% at negative margin → 49% at 4+ min | calculated | A monotonic step-by-step relationship |
| Seasonality of the mechanism | carry-over 75–85% every month, highest in Jan–Feb | observed | A cause for the winter rise |
| Whose winter it is | commuter peaks Jan–Feb (93% / 92%); long-distance peaks Feb and **April** (76% / 77%) | observed | That the winter rise is a network-wide effect, or that weather is the driver |
| Seasonality of the volume | monthly late share 2.7–7.2%; daily 0.4–15.4% | observed | A punctuality target or its breach |
| Timetable is re-cut in-year | 18.8% of legs moved on 2025-12-14 against a 1.3% weekly baseline | observed | Which re-cut was deliberate policy |
| Padding per leg | median 0.9 min, range −1.4 to +23.1, 425 legs, current period | calculated | An engineering minimum run time |
| Legs with negative padding | 47 (11%) | calculated | That those legs are anyone's mistake |
| Padding by service type | long-distance 2.27 min / 4% negative vs commuter 0.24 min / 20% | calculated | Why the timetable was built that way |
| Negative legs never run early | 0 of 47 beat schedule on most runs; `JK→SAU` 0 of 3,652 | observed | That the schedule is infeasible, only that it has no slack |
| Percentile-floor stability | 4% of 265 legs flip sign between windows; floor flat from n=40 | calculated | That the floor is an engineering minimum |
| Lines a reader can select | 7, each with its own year-long curve | calculated | That those lines differ in quality |
| Line-vs-line separation | pairs separate only where margin differs | observed | A ranking of lines |
| Ring Rail as limiting case | highest carry (93%), lowest margin (0.13 min) | observed | That every loop behaves this way |
| Re-allocated budget | focus line 75% → 56% at +1, journey time conserved exactly | **modelled** | A plan, a proposal, or feasibility |
| **Redistribution's floor** | every commuter line still carries 78–84% when optimally redistributed — worse than long-distance today | **modelled** | That commuter cannot be improved, only that moving margin will not do it |
| Cause attribution | ~1% of rows | observed | A breakdown of causes |

**Sources**

1. Fintraffic Digitraffic Railway `/api/v1/trains/{date}` — CC BY 4.0, attribution on Context
2. Station metadata `/api/v1/metadata/stations` (563 stations, 215 with passenger traffic)
3. Pack window 2025-09-26 → 2026-09-25, **365 consecutive days** — a full annual cycle, so the film can
   speak about winter from the pack itself rather than from a side sample. Margin is scoped to the
   current timetable period within it (2026-06-26 → 2026-09-25)

**Limitations (must appear in story)**

Public operational feed read from outside the organisations that run it. Cause attribution covers ~1%
of rows. The technical minimum run time is a percentile proxy. Samples thin beyond about four stops.
Finland only. No capacity, rolling-stock, crew or cost model. The counterfactual is arithmetic on
observed delays, not an operational plan.

**Placement, signed off 2026-09-26:** the full list appears **once**, on the required panel at the close
(Act X), alongside the CC BY 4.0 attribution and the non-affiliation line. The rest of the film carries
its honesty through per-beat `observed` / `calculated` / `modelled` badges plus two caveats that stay in
their own beats because they qualify a figure the reader is looking at as they read it — the
percentile-floor note in Act VII and the `modelled` badge on the whole of Act IX. No standing caveat in
the chrome and no limitations beat of its own: a reader cannot interpret these caveats before the film
has taught the measurement, so front-loading them would cost trust rather than earn it. The cause-code
limitation carries extra weight here because the title asks *why* — see the sign-off note above.

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
| A year of it | `compare` | One image, no interaction; the band is the day-to-day range, not a confidence interval |
| Where the slack is | `compare` + `trace` | Two profiles maximum |
| Your line | `filter` | Marks re-position, never re-fade; the picker must not look like a page change |
| Move the budget | `filter` | Travel increases then stops; ease the stop |
| What it costs | `highlight` | Decision card; the commuter turn needs its own held beat, not a footnote |

Every held beat declares itself in the cue table and gets camera creep plus per-mark life. A film
about things that move must not freeze while the reader reads — and here a frozen frame would be a
false statement, not merely a dull one. If the film ever draws a second canvas, holds are computed
**per surface** (`docs/ANIMATION_CRAFT.md`).

---

## Out of scope for v1

- Cause-code analysis as a headline (1% coverage cannot carry it) — and, now that the title asks *why*, any beat that answers it with a cause of delays rather than the structure that keeps them alive
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
- [x] **Claim upgraded to the margin statement** (signed off 2026-09-26) — a planner controls margin, not service type
- [x] **Question wording** (signed off 2026-09-26) — titled *Why don't delays die?*, with the planner's decision held back to Act X and the causal promise fenced by two prohibitions
- [x] **Takeaway wording** (signed off 2026-09-26) — mechanism first: margin decides whether a delay dies
- [x] **Limitations placement** (signed off 2026-09-26) — full list once on the closing panel with attribution and non-affiliation; badges plus two in-beat caveats elsewhere
- [x] Line or lines chosen for v1 — network-wide opening, north main line as the focus lane, all seven lines selectable
- [x] Counterfactual method agreed — re-allocate the same total minutes in proportion to measured survival, whole beat badged `modelled`
- [x] Picker captions agreed — recognition control, no ranking; revised so it also teaches that alike lines have alike margin
- [x] Evidence pack frozen with kind tags — **365 days**, 185 KB, every block tagged, margin scoped to the current timetable period
- [x] Act briefs rewritten against the margin finding, and Act X carries the commuter turn as a second decision
- [x] Seasonality given its own beat (Act VI), shortest in the film, no interaction
- [x] Beat list confirmed — ten acts, no new `visualId`
- [ ] Narration and visual states drafted against the confirmed beats
- [ ] Explicit non-goals respected (no speaking for the operator, no plan cosplay)
