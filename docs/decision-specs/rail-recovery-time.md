# Decision Spec — Where should the recovery time sit?

> Third Interactive Decision Storytelling piece (Orbit flagship).
> Catalogue pick: `rata-delay-propagation` (Round E, `craft_sum` 28 — the catalogue's only *measured* craft score).
> **Status:** draft — awaiting human sign-off.
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
| **CLAIM** | A delay is not an event, it is a thing that travels. Where the padding sits decides whether it dies in two stops or survives eight — and the current budget is demonstrably in the wrong places |
| **MECHANISM** | Train is late at a stop → the next leg's scheduled run time either exceeds what the leg actually takes or it does not → the delay is absorbed or handed on → the same test repeats at every stop to the end of the run |
| **VISUAL OBJECT** | One field of arrival marks (a mark = one train at one stop), positioned by place in the run against minutes late. The camera follows a single run, then the whole day accumulates behind it. The same marks carry the decay curve and the padding profile |
| **EVIDENCE** | Observed scheduled and actual times at every stop; calculated carry-over, decay curve and per-leg padding; a clearly-labelled modelled counterfactual for re-allocated padding |
| **COUNTERPOINT** | The carry-over is not a constant. It rises when the network is stressed, so padding sized on a quiet day is padding sized for the wrong day |
| **UNCERTAINTY** | Cause attribution covers only ~1% of rows; sample thins beyond ~4 stops; the technical minimum run time is a percentile proxy, not an engineering fact |
| **TAKEAWAY** | Size the margin from where delay actually survives, not evenly along the line — and separate commuter from long-distance, because the same delay behaves differently on each |

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
| Windows | A 10-consecutive-weekday window (2026-09-14 → 09-25) for the mechanism, and a 14-day spread across a year including three consecutive January days for seasonality |
| Segmentation | **Commuter and long-distance are separated everywhere.** Not optional — see evidence |
| Padding per leg | Scheduled leg run time (next stop's scheduled arrival − this stop's scheduled departure) minus the **5th percentile of observed run times** on that leg. Legs need 60+ observations |
| Counterfactual | Re-allocate the same total padding minutes across legs in proportion to measured survival, then replay observed delays through the new schedule. **Modelled, and labelled as such on screen** |
| Excluded | Cargo, shunting, locomotive, on-track machines and test drives — no passenger decision attached |

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

### Padding is derivable, and 43 legs have none

Over 273 legs with 60+ observations, scheduled run time minus the 5th-percentile observed run time:

| | |
|---|---|
| Median padding | **0.5 min** |
| Range | **−2.4 to +13.3 min** |
| Legs with *negative* padding | **43** |

`YV→KOK` carries 13.3 minutes of slack on a 45-minute scheduled leg. `JK→SAU` is scheduled at 5.3
minutes against a 7.7-minute realistic floor — timetabled to be late. That contrast is the decision
in one image.

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
| **Percentile floor** | The "technical minimum" is a 5th percentile of observed runs, not an engineering figure. On thin legs it is noisy, and that is a stated limit |
| **What we do not claim** | That Fintraffic or VR endorse this; that the counterfactual is implementable; that capacity, rolling-stock or crew constraints are modelled; that one line generalises to the network |

---

## Narrative arc (beats × grammar)

Beats vary in length. Do not clone seven equal chapters.

| Act | Beat | Reader job | Grammar | Persistent object |
|-----|------|------------|---------|-------------------|
| **Open** | QUESTION | Feel that a delay travels | `reveal` | Dim field of the day's arrival marks |
| **I — One train** | ORIENT | Watch one run pick up a delay | `trace` + `annotate` | One run's stops, in order, left to right |
| **II — It carries** | TRANSFORM | The delay reaches the next stop before the train does its recovering | `transform` | Same marks; the delay is handed along the run |
| **III — Every late train** | ACCUMULATE | One run becomes a decay curve | `accumulate` + `zoom` | Marks fill; the survival curve emerges *from* them |
| **IV — Two services** | SPLIT | The same delay behaves differently on commuter and long-distance | `split` | One field divides; two decays, same marks |
| **V — Where the slack is** | COMPARE | Padding per leg against where delay survives | `compare` + `trace` | Padding profile along the line; the 43 negative legs |
| **VI — Move the budget** | FILTER | Re-allocate the same minutes and replay | `filter` | Scrubbed budget; the decay curve responds |
| **VII — What it costs** | SYNTHESIS | Punctuality bought, journey time paid | `highlight` | Decision card + limitations |

**Atmosphere:** an intro/outro motif only if it earns the mood. No new page architecture.
Directed-film path (one scrubbed shot plus an operable sleeve), consistent with stories 1 and 2.

**Next-story rule check.** No new `visualId` is proposed. The persistent mark field plus a
frontier-style chart already express every beat: Act V's padding profile and Act III's decay curve are
both the cut-off film's chart role, and Acts I–IV are the mark field under a moving camera. Register a
new visual only if implementation proves that false.

---

## Act briefs

### Open
Headline: **WHERE SHOULD THE RECOVERY TIME SIT?**
Sub: A delay is not an event. It is a thing that travels, and the timetable decides how far.
Hero: the day's arrival marks, dim, unlabelled.

### I — One train
One illustrative run, stops in order. It leaves on time, picks up five minutes, and the reader watches
the next stop arrive. Marks are *made* in stop order (`arrival`), never faded up as a sheet.

### II — It carries
The delay is handed to the next stop. This is the beat where `leadLag` is carrying evidence rather
than staging: the lag is the recorded difference between two logged times, and the wave direction is
the direction of travel. Label the figure `observed`.

### III — Every late train
Accumulate to every 5+ minute late arrival in the window. The survival curve emerges from the same
marks — 77% at the next stop, 57% four stops on, medians across 24 days. Show the day-to-day range as
a band, not a single line.

### IV — Two services
Split commuter from long-distance. 24 of 24 days, no overlap. Same marks, two decays. This is the beat
that stops the reader thinking "trains are trains".

### V — Where the slack is
Padding per leg along the line, against where delay actually survives. The 43 negative-padding legs
are the image: scheduled faster than the leg has ever realistically run. Name the percentile-floor
caveat on screen, in the beat, not in a footnote.

### VI — Move the budget
Scrub a re-allocation of the *same total* minutes toward the legs where delay survives, and replay the
observed delays through it. Badge the whole beat `modelled`. Travel increases then stops; no rewind.

### VII — What it costs
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
| Padding per leg | median 0.5 min, range −2.4 to +13.3, 273 legs | calculated | An engineering minimum run time |
| Legs with negative padding | 43 | calculated | That those legs are anyone's mistake |
| Per-leg persistence | 10 of 12 legs keep sign over 10 days | calculated | Network-wide stability |
| Re-allocated budget | decay under a counterfactual profile | **modelled** | A plan, a proposal, or feasibility |
| Cause attribution | 1.0% of rows | observed | A breakdown of causes |

**Sources**

1. Fintraffic Digitraffic Railway `/api/v1/trains/{date}` — CC BY 4.0, attribution on Context
2. Station metadata `/api/v1/metadata/stations` (563 stations, 215 with passenger traffic)
3. Verification windows: 2026-09-14 → 09-25 (10 weekdays) and a 14-day spread 2025-10-14 → 2026-09-08

**Limitations (must appear in story)**

Public operational feed read from outside the organisations that run it. Cause attribution covers ~1%
of rows. The technical minimum run time is a percentile proxy. Samples thin beyond about four stops.
Finland only. No capacity, rolling-stock, crew or cost model. The counterfactual is arithmetic on
observed delays, not an operational plan.

---

## Beat × visual-grammar map (Layer 2)

| Beat | Primary behavior | Craft note |
|------|------------------|------------|
| Open | `reveal` | Field unlabelled; the question lives in the copy |
| One train | `trace` + `annotate` | `arrival` in stop order — marks made, not faded |
| It carries | `transform` | `leadLag` with a recorded lag; rank is position in the run |
| Every late train | `accumulate` + `zoom` | Same marks; `strokeWeight` follows the camera |
| Two services | `split` | One population divides; do not introduce a second one |
| Where the slack is | `compare` + `trace` | Two profiles maximum |
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

---

## Definition of done (this Spec)

- [ ] Human approves Question / Claim / Takeaway / limitations
- [ ] Line or lines chosen for v1, and the evidence pack scoped to them
- [ ] Counterfactual method agreed before it is built, and its on-screen labelling agreed with it
- [ ] Evidence pack frozen with kind tags
- [ ] Beat list stable enough to draft narration and visual states
- [ ] Explicit non-goals respected (no speaking for the operator, no plan cosplay)
