# Story Grammar (Layer 2)

> Earned from `when-rates-rise` / `cashflow-pressure`. Do not invent five templates from this list — only reuse what a real story proved.

## Principle

The engine (Layer 1) stays a boring sticky stage. Grammar is **what the sticky graphic does** when a beat fires: same marks, changing emphasis — not a new chart type per act.

## Behaviors (verbs)

| Behavior | Job | Proven in |
|----------|-----|-----------|
| `reveal` | Establish the question / stub | Act 1 Dial |
| `trace` | Light the causal spine | Act 2 Transmission |
| `compare` | Same shock, divergent residual | Act 3 Heterogeneity |
| `zoom` / `accumulate` | Households → population field | Act 4 Book |
| `filter` / `highlight` | Dim non-sleeve marks; earn the number | Act 5 Intersection |
| `annotate` | Overlay epistemic badges on the field | Act 6 Reality Check |
| `split` | Part-to-whole portfolio cut | Act 7 The Cut |

Manifest `transition` strings should prefer these verbs (already used on `when-rates-rise`).

## Persistent objects

1. **TransmissionSpine** — five nodes (CB → market → loan → payment → buffer). Always mounted; `spineActive` changes.
2. **BufferMarkField** — vertical residual-capacity marks. Height = buffer; violet = thin; cyan = thick. Stable ids across zoom levels where possible.
3. **PressureSky / Atmosphere motifs** — cinematic atmosphere using allow-listed motifs (`docs/ATMOSPHERE_MOTIFS.md`). Chrome filled with domain vernacular, not empty decoration.
4. **EvidenceBadge** — MODELED / OBSERVED / HYPOTHETICAL / CALCULATED.
5. **DecisionCard** — durable end-frame (outro motif optional).

Code: `src/components/storytelling/grammar/`.

## Stage map (`cashflow-pressure`)

`stageConfig.ts` maps allow-listed `visualState` → `{ job, behavior, spineActive, field, caption, provenance }`.

Field modes: `stub` → `household` → `segments` → `population` → `sleeve` → `annotated` → `cut`.

## What is *not* grammar yet

- Progress-scrubbed timelines as a reusable verb (the film and the product landing are scrubbed shots; they are not templates)
- Generic chart library wrappers
- Schema field `visualBehavior` separate from `transition` (optional later; `transition` + `data-visual-behavior` already carry the verb)
- The landing flight as a `visualId` or a sixth atmosphere motif

## Craft earned from the landing flight

`LandingField` is product-index chrome. The constraints below are what survived contact with that shot. Apply them to the next scrubbed film, motif, or story visual. Do not copy the vortex.

1. **Same objects through the cut.** A transition is the marks you already have, changing state. A streak shortens onto its head; that head is the star; the brightest heads open into the larger bodies. A second population fading in at other positions reads as a different picture.
2. **One camera.** Overhead to side-on is a pitch onto one mark. The warp is a perspective divide from that same center (`screen = center + worldXY × focal / z`). Lanes stay parallel; “horizontal” is the camera’s up-vector.
3. **One neighbor thread.** One dot on each lane, stepped only to the next lane. Step size varies, and a step may repeat direction, so the line wanders and still reads as one thread.
4. **Commit, then leave.** Other marks fade first. The thread is gone once the view is inside the chosen mark. The entry has no hard rim. The next motion starts at that center.
5. **Travel only increases, then stops.** Ease the stop (flat derivative at the end). The brake is the destination. Rewinding positions to blend two scenes makes the stars jump.
6. **The picture stays unlabeled.** The metaphor has no caption and no stage name. The decision lives in the copy. The field is `aria-hidden`.
7. **Reduced motion holds the opening frame,** still and readable.
8. **Judge the bitmap.** Scrims and element screenshots composite the page on top of the canvas. Confirm the arriving marks sit on the departing ones in the pixels.

Rejected and not to be retried: a 2D scale around a point, a tube or orbit camera, a long screen-space lerp between two layouts, fanned lanes, a thread that jumps lanes or collapses into one diagonal, a bright ring on the entry, easing back to the diagram you left.

## Craft earned from animation doctrine

`docs/ANIMATION_CRAFT.md` holds the motion rules read from `alexgreensh/anidoodle` and tested against both films, with the hold audit that produced them and the list of its doctrine we declined. The code is `src/components/film/craft.ts` and `cue-table.ts`; the gate is `e2e/dead-air.spec.ts`. In short:

1. **A hold is not a freeze.** A scrubbed film is a pure function of scroll, so it stops when the reader stops — which is when they are reading. Held beats get camera creep and per-mark life. The cue table declares which spans are holds.
2. **Marks are made, not faded.** A population arrives in an order; a rule is drawn down the plot and its wash spreads back from it.
3. **One side leads,** by a fraction of the transition, never half a cycle and never in lockstep. The rank is data-anchored, then roughened so the wavefront is not ruled.
4. **Marks are sized relative to what they draw,** and line weight grows as `weight × zoom^0.35` under the camera.
5. **The cue table is checked at load,** against the channels the canvas actually reads — a channel that never reaches pixels cannot rescue a still frame.
6. **Dead air is measured, not asserted.** The gate scrubs to every declared hold and counts changed pixels; reduced motion must measure exactly zero.

## Craft earned from the grid film

Found by a reader on a phone and a laptop after the film shipped. None of these failed a test until a test was written for the frame.

1. **Show the limit before the fall.** When a mark falls towards a threshold, open the axis to the threshold first, then draw the fall. Rescaling after the pen has passed leaves the mark off screen for the moment the reader is told about it.
2. **Pull back on the subject.** A pullback from a subject that is not at the frame centre blends to `wideShotOn(subject)`, not `wideShot`. Blending focus and zoom separately towards the centre swings the subject past its place, off screen, while the zoom is still high.
3. **On a phone, the words and the picture take turns.** Do not shrink the picture to fit the narration: the reader then gets neither. Each beat's narration comes up on a solid card while the picture holds where the last beat left it; then the card lowers to a strip (kicker and label, so the evidence kind stays on screen) and the picture plays the beat at full size. The phone track is longer by the reading spans; the wide layout, where the words have their own column, is unchanged. `phoneMomentAt` in `src/lib/director/grid-film.ts`. (First tried: measuring the tallest beat and ending the picture above it. The reader rejected it: the graph lost too much to the text.)
4. **Cross-fade text in turn, not together.** Two labels in the same place fade one out, then the other in. Otherwise the middle frame shows both.

## Next story rule

Before adding a new visualId, ask: can an existing grammar object + stage config express the beat? Only register a new visual when the metaphor cannot share the spine/field. A new shot still gets its own decision spec; it inherits the craft rules above and does not inherit the landing’s metaphor.
