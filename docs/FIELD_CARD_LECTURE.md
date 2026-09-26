# Field card lecture — feasibility

> Prototype: `/lab/lectures/agentic-ai`. Unlisted. Publishing is a human gate.
> Question asked: *can the storytelling engine render a field card as a class or a live briefing, instead of a printed sheet?*

**Answer: yes, and cheaply, because the engine already had the hard parts.** Nine beats of the
Agentic AI field card run as a scroll-scrubbed lecture, and the same manifest runs as a live talk
with a clock and speaker notes. What had to be built was the board and the copy. What did not have
to be built was the runtime, the motion craft, the dead-air gate, or the a11y path.

## What was built

| Piece | Where | New? |
|---|---|---|
| Frozen field card | `data/field-cards/agentic-ai.v2026.36.json` | New file, old pattern (an evidence pack by another name) |
| Lecture manifest | `src/lectures/manifests/agentic-ai.json` | New — cue table + beat copy + presenter notes |
| Schemas + loader | `src/lectures/schemas/*`, `src/lectures/load.ts` | New — validate before render, both halves |
| Timeline | `src/components/lecture/lecture-frame.ts` | Thin: reuses `cue-table.ts` and `craft.ts` unchanged |
| The board | `src/components/lecture/draw-stack.ts` | New drawing, existing craft layer |
| Runtime | `LectureFilm`, `LectureField`, `LecturePresenter` | Scroll driver copied from the films; clock driver new |
| Card reprint | `FieldCardSheet.tsx` | New, renders the frozen card |
| Validation | `npm run validate:lectures` | New, wired into `test:engine` |
| Gates | `e2e/lecture.spec.ts`, plus lecture rows in `dead-air.spec.ts` and `a11y.spec.ts` | Extended, not rewritten |

## The three things worth keeping

### 1. A film and a talk are the same artifact with a different driver

Our films are pure functions of a progress value, and until now that value only ever came from
scroll position. Nothing in the frame function cares where the number comes from. Driving it from a
clock instead took one `requestAnimationFrame` loop and gave a presentation mode: full-screen board,
copy at projection size, beat keys under the presenter's hand, and the cue table's own `at` values
as the running order. `presentSeconds` in the manifest is the only new authoring field.

That means a lecture is one artifact with three registers: read it, present it, or print the card
that is reprinted at the bottom of it. The presenter's notes live in the manifest beside the reader's
copy, so the two cannot drift into two different lectures.

The podium also carries an opt-in camera frame (`getUserMedia`, corner PiP), which makes the "me
presenting over live animation" shape literal rather than theoretical. It is off by default and
degrades to nothing where the browser refuses.

### 2. The card stays the source of truth, mechanically

Every beat declares `cardRefs` — paths into the frozen card, like `layers[2]` or `decisions[7]` or
`killSwitch`. `danglingCardRefs` resolves each one, the loader fails on a miss, and
`validate:lectures` fails the build. The lecture cannot teach a layer the card has dropped, and the
weekly content pass on the card repo cannot silently invalidate a beat.

This is the evidence-pack discipline moved sideways: a decision story never invents a figure at
render time, and a lecture never invents a claim. Thirty citations across nine beats, all resolving.

What is *not* mechanised is the pacing, the diagram and the notes. Those are editorial, and the
prototype says so on the page.

### 3. The craft layer transferred with no changes at all

`craft.ts` and `cue-table.ts` were written for two finance films and needed nothing added:

- Marks are made, not faded — the corpus writes on left to right, the citation curves draw up, the
  ring sweeps from PLAN, the spokes reach down one after another.
- One camera, and it only ever pulls back. The unit test asserts the cue table is monotone in both
  `spanY` and `cy`, because a lecture that zoomed back in would drop a layer the reader had just been
  shown.
- The checker reports one held span (the closing 11%), and `dead-air.spec.ts` now probes it like any
  other film: no identical consecutive frames, and exactly zero under reduced motion.
- Reduced motion snaps pose to pose and freezes every time-driven channel, so the board settles on
  the picture the beat arrived at.

## Two deliberate departures

**The picture is labelled.** Rule 6 of the landing-flight craft ("the picture stays unlabelled")
protects a metaphor from being captioned into a diagram. A field card *is* a named taxonomy, so here
the labels are the content: LLM, RAG, AGENT, MCP, A2A, PLAN/ACT/OBSERVE/STOP, APPROVE, the four
systems, the six rungs. The canvas is still `aria-hidden`, every label is also in the DOM, and the
live region speaks each beat.

**The camera may overrule the cue table horizontally.** The stack is taller than it is wide, so a
cue table written in vertical span crops on a phone. `requiredHalfWidth(frame)` reports how much
world width the beat's own objects need, and the camera pulls back until they fit. An earlier attempt
squeezed world x instead and turned the control loop into an ellipse every time the camera pushed
in; that is the wrong trade and is recorded here so it is not retried.

## Cost, honestly

- Roughly 1,500 lines, of which the board is 700 and the runtime 400. The remainder is schema,
  loader, validation and tests.
- The board is bespoke. `draw-stack.ts` teaches *this* card; a second card would need its own
  drawing, in the same way each decision story has its own field. The reusable part is everything
  around it, which is most of the work.
- A second lecture would show whether `AgenticStackCue` generalises into a set of teaching channels
  or stays one-per-topic. Do not generalise it on one example.
- Frame cost was not profiled, consistent with the standing decision on the craft layer.

## What this is not

- Not published. No link from the landing or the stories index, and `robots: noindex`.
- Not a replacement for the card. The dense sheet is still the thing to keep open during a design
  review, which is why it is reprinted from the same frozen file directly below the briefing.
- Not a claim that the other two field cards (Data Analytics, Technology Delivery) come for free.
  Agentic AI was picked because it is already a layered taxonomy with a loop and a gate in it — the
  most film-shaped of the three. Technology Delivery (INTENT / WINDOW / PROOF / CUTOVER) is the next
  most likely to work; a metrics card would need a different kind of board.
- Not an edit to the field card repos. Those stay as they are; the frozen JSON was read from the
  published card at a named commit.

## Verdict

Feasible, and the marginal cost of the *next* one is a board plus a manifest. The open question is
editorial, not technical: whether a briefing that takes four minutes earns its place next to a sheet
that takes forty seconds to scan. That is a human call, which is why this route is unlisted.
