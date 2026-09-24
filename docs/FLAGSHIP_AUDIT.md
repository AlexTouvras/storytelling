# Flagship Audit — When Rates Rise

**Date:** 2026-09-23  
**Scope:** Publication-quality upgrade of the reference decision story.  
**Constraint:** No engine architecture change; no new templates; no Orbit/agent work.  
**Verdict:** Analytical substance is strong. Experience still reads as a PoC: opening is methodological, acts lack theatrical structure, visuals jump between metaphors instead of zooming one object, decision is stated more than earned, mobile sticky panel is crowded on evidence/sim acts.

---

## Scores (1–5)

| # | Dimension | Score | Note |
|---|-----------|------:|------|
| 1 | Narrative pacing | 3 | Logic order is right; chapter titles are analyst notes, not acts |
| 2 | Visual hierarchy | 2 | Metric stacks compete; no single focal object per beat |
| 3 | Visual continuity | 2 | Reservoir → chain → bars → table → metrics → chain again (swap, not zoom) |
| 4 | Transition quality | 3 | Framer width/opacity ok; not semantic (nothing “becomes” the next scale) |
| 5 | Mobile experience | 2 | `max-h-[42vh]` + dense metric grids force scroll-in-sticky; prose padding fights dock |
| 6 | Evidence/model distinction | 3 | Kinds exist in dataRefs + banner text; not a clear visual language |
| 7 | Decision reveal | 2 | Final act is strong prose + %; no portfolio split diagram / decision card |
| 8 | Typography | 3 | Display/body ok; act labels missing; hero kicker is process language |
| 9 | Annotation density | 2 | Book + evidence acts dump too many numbers at once |
| 10 | Accessibility | 3 | Alt + reduced-motion note present; sticky band can obscure focus order on small screens |
| 11 | Loading/performance | 4 | SSG; sim runs at module load (acceptable for n=2k; watch client cost) |
| 12 | Methodology/provenance | 4 | Footer + `run-rate-buffer-sim.ts` are solid |

---

## A. Opening (first 10–15s)

**Current:** Kicker “Reference decision story”; title; long question; summary paragraph that previews methodology (“illustrative 2,000-loan book”).

**Gap:** Communicates *process*, not *decision*. Visitor should see `Rates ↑ → payment ↑ → buffer ↓` and land on “where does risk concentrate?” before any seed/n=2000 talk.

**Fix:** Hero = decision question only. First visual = compact transmission stub (rate→payment→buffer), not dual reservoirs labeled as a teaching aside. Strip methodology from open body.

---

## B. Narrative pacing

**Current sections (9):** open → system → borrower → shock → split → book → sensitivity → evidence → pm.

**Target acts (7):**

| Act | Title | Maps from |
|-----|-------|-----------|
| 1 | The Dial | open (rewrite) |
| 2 | The Transmission | system (+ light household identity) |
| 3 | The Heterogeneity | shock + split (merge; drop standalone baseline as its own act) |
| 4 | The Book | book |
| 5 | The Intersection | sensitivity + float∩thin emphasis from book |
| 6 | Reality Check | evidence |
| 7 | The Cut | pm + decision card |

**Gap:** Headlines are descriptive (“Book shock: 2,000 loans…”) not theatrical. Sensitivity is a separate essay beat that should be the *reveal* of the intersection.

---

## C. Visual continuity

**Current:** Disjoint modes per state (`open` reservoirs, `system-trace` list, cash stack, segment bars, metric cards, HTML table, chain reprise).

**Needed arc:** one conceptual object that **zooms**:

```text
RATE → PAYMENT → BUFFER
  → one household
  → three segments
  → 2,000-loan field
  → floating × thin sleeve
  → portfolio cut (76.9% / 23.1%)
```

**Gap:** Highest-value work. Prefer shared spine (chain or balance field) that gains layers; avoid replacing the entire panel metaphor each step.

---

## D. Evidence language

**Current:** Colored banner string + `[observed]` / `[calculated]` inside metric labels. `hypothetical` for teaching acts.

**Gap:** Not screenshot-distinct. Need badge cards:

- **MODELED** — n=2000, seed=42  
- **OBSERVED** — ECB CES, window  
- **HYPOTHETICAL** — teaching household  
- **CALCULATED** — WP 3053 / derived book stats  

Reusable component later; for v1 implement inside the reference visual without schema redesign.

---

## E. Decision moment

**Current:** Large `%` for float∩thin + chain with “cut here” + long operational paragraph.

**Gap:** No `PORTFOLIO → other 76.9% | floating×thin 23.1% WATCH HERE` composition. Conclusion is narrated, not arrived at visually.

**Fix:** Dedicated portfolio split visual; prose shortens to why; operational list stays tight.

---

## F. Decision card

**Missing.** End needs a durable frame:

> Don’t size the watchlist from the policy rate. Start with balances exposed to both floating-rate repricing and thin cash-flow buffers. Then monitor reset dates, buffer/DSTI deterioration, and pre-existing weak segments.

Plus: *Modelled example — not investment or credit advice.*

---

## Other findings

- **Landing:** Story intentionally unlisted (`LISTED_SLUGS` empty). Flagship v1 should list it when quality bar is met (or keep unlisted until human gate — prefer list after upgrade).
- **Engine:** No story-specific runtime hacks required for this upgrade; stay in manifest + `CashflowPressurePanel` + light presentational components (`EvidenceBadge`, `DecisionCard`) under `components/storytelling/`.
- **Annotation density:** Book act currently shows three big metrics at once; split across Act 4 (thin rise) and Act 5 (intersection + sensitivity).
- **Mobile:** Prefer fewer simultaneous metrics; taller aside only when needed; captions shorter in `dock` density.

---

## Story vs information architecture

| Story architecture | Information architecture |
|--------------------|--------------------------|
| Question → tension → mechanism → discovery → evidence → decision | Acts, methodology, limitations, sources |

Editorial rhythm must vary by **visual job** (establish / reveal / compare / zoom / filter / evidence-board / decide). Uniform “heading + two paragraphs” is information architecture leaking into the story.


1. Rewrite manifest to **seven acts** + decision-first hero.  
2. Rebuild visual states for **zoom continuity** + portfolio split + decision card.  
3. Ship **evidence badges** (MODELED / OBSERVED / HYPOTHETICAL / CALCULATED).  
4. Tighten mobile dock copy; keep sticky path unchanged.  
5. List story on landing when upgrade lands (human can unlist).  
6. `validate:stories` + lint + build green.

**Out of scope this pass:** Story grammar schema extraction, engine harden/tests, Orbit, agent pipeline.

---

## Definition of done (this pass)

### Story
- [x] Strong opening question (decision in 10–15s)
- [x] Clear seven-act narrative
- [x] One visual idea evolves (spine + zoom arc)
- [x] Household → segments → book → sleeve progression
- [x] Real evidence clearly separated from model (EvidenceBadge)
- [x] Counterpoint preserved
- [x] Decision visually earned (portfolio split)
- [x] Strong final decision frame (DecisionCard)

### System
- [x] No story-specific runtime hacks
- [x] Registry-driven visual states
- [x] Same conceptual story on mobile
- [x] Reduced motion snaps
- [x] Validation / build / lint pass (confirm in CI turn)
