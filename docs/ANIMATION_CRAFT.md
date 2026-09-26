# Animation craft (Layer 2)

> Read from [`alexgreensh/anidoodle`](https://github.com/alexgreensh/anidoodle) (Apache-2.0, Alex
> Greenshpun / 10x Company) and tested against our two films. None of its code is vendored here.
> What follows is our own implementation of the rules of its craft bar that survived contact with
> a scrubbed data film, plus an honest list of the ones that did not apply.

anidoodle is a skill for hand-drawn films and interactive pieces made entirely in code. It is not a
data-storytelling project, so most of it — styles, characters, anatomy, music, its render
toolchain — is not ours to use. Its doctrine on **motion** is, and it is unusually specific,
because every rule in it was paid for on a film that had to be rebuilt.

## The audit that started this

anidoodle's hardest rule is **no dead air**: *something visibly changes in every second, from frame
0, and a hold means the camera creeps while the subject keeps living.*

Our films are pure functions of scroll position. Nothing else drives them, so the canvas is frozen
whenever the reader stops scrolling — which is precisely when they are reading the beat copy. The
cue tables make this measurable: a span where every channel the canvas reads is unchanged is dead
air, whatever the table says is happening in it.

`cue-table.ts` reports those spans. On the tables as they stood:

| Film | Held spans | Share of the film |
|---|---|---|
| When Rates Rise | beat 2 (34–42%), beat 3 (56–64%), beat 5 (84–100%) | **32%** |
| Where Should the Cut-Off Sit | beat 5 (56–100%) | **44%** |

Both films ended on a still frame, and the cut-off film's whole second half was one. Two of these
were invisible to a reading of the table: the cut-off table moves `frontier` from 0.35 to 0.25
across 56–70%, and moves `cut` after that, but `draw-apps.ts` reads neither — they drive the
horizon chart and the DOM. A channel that never reaches pixels cannot rescue a still canvas, which
is why the checker is told which channels are *rendered* rather than trusting the table's shape.

This is the same trap anidoodle records against itself: *a creeping camera changes every pixel and
satisfies the tool while the eye sees a still.* Ours was the inverse — a changing cue table
satisfying the reviewer while the canvas sat still.

## The rules we took

All five live in `src/components/film/craft.ts`, pure and seeded by mark id. `time` is handed in by
the render loop; nothing in the layer reads a clock, which keeps the draw functions testable and
matches anidoodle's contract that timing belongs to hosts.

### 1. A hold is not a freeze

`markLife` drifts each mark on two frequencies that never resynchronise, with a phase seeded from
its id, so the field breathes rather than pulsing. `cameraCreep` pans and pushes in, but only in
proportion to `frame.hold`, so it never fights the scroll while the film is moving.

Amplitude is a share of the mark's own radius with a pixel floor. anidoodle's rule is *size every
mark relative to the thing it is drawing, and check the look at the closest and the widest scale*;
without the floor the far field is technically moving and visibly still, and without the
proportionality a close-up turns a settled book into a swarm.

### 2. Marks are made, not faded

*Things fade or scale in* is on their list of tells; *marks are MADE, in the order a hand makes
them* is what passes. Our `population` channel used to raise the alpha of two thousand dots as one
sheet. `arrival` gives each mark a place in an order and writes the field on along it — the book
from its thin edge outward, the application sheet best-grade first. At 0 and 1 it is identical to
multiplying by the channel, so the cue table's poses are unchanged.

The same rule applies to the rules themselves: the 6%-of-income line and the PD gate are now drawn
down the plot, and their shaded side spreads back from where the line was struck, instead of the
whole apparatus rising in opacity.

### 3. One side leads

*Both sides do the same thing at once* is a tell; *one side leads, by a few frames, never half a
cycle* passes. The featured loan already repriced before the book — that lead was there. Inside the
book, every mark moved on the same frame. `leadLag` staggers a channel by a data-anchored rank so
the shock travels as a wave off the thin edge, and the rejection sweeps out from the gate.

The spread is capped under half a cycle, and there is a test for it: the moment the leading mark
lands, the trailing one must already be moving, or the field reads as two populations rather than
one. `rankJitter` roughens the wavefront so it is not a ruled line — anidoodle rejects *even
scatter* and stamped repetition in the same breath as it rejects lockstep.

### 4. Linework belongs to the camera

`strokeWeight(base, zoom)` is their `weight × zoom^0.35`: a six-fold close-up gets about 1.9× the
weight. Weight that scales with the camera reads as a slab; weight that ignores it reads as a
hairline laid over someone else's drawing. Our halo rings and rules were fixed at 1–1.5px through a
6× push-in.

### 5. The cue table is checked at load

*Every frame number in the film lives in ONE cue table, and a checker runs at module load.* Ours
now checks that the table opens the film, advances, does not skip a beat, and has no unexplained
NaN — and reports its holds, which is how the films know where to creep. It throws outside
production and reports in it: a malformed timeline is a bug our tests should catch, not a reason to
take a live page down.

### 6. A gate is a measurement, not an opinion

The one piece of their tooling that transfers directly is the metric in `engine/tools/motion.mjs`:
decode frames, downscale, and count the fraction of pixels that changed by more than 4/255. We
cannot run it — we ship a live page, not a rendered file — so `e2e/dead-air.spec.ts` does the same
measurement in the browser. It scrubs to the middle of every hold the cue table declares, stops,
and samples thirty consecutive animation frames off the canvas. A film that freezes fails the
suite, and under `prefers-reduced-motion` the same probe must return exactly zero.

**The first version of this gate was wrong, and it is worth saying how.** It compared two reads a
second apart, and the first tuning of the craft layer sailed through it at 0.86% and 8.0%. Then a
recording of a held beat was measured frame by frame: a third of consecutive frames were
bit-identical and the worst half-second window changed 0.001% of pixels. A reviewer watching the
clip could not see any motion at all, and was right. The drift was real, measurable, and far too
slow for anyone to perceive — which is the exact trap anidoodle records against itself:

> a creeping camera changes every pixel and satisfies the tool while the eye sees a still

A one-second window is a generous enough measurement to hide a still picture inside. The gate now
measures per frame, and the binding rule is theirs and unambiguous: **no identical consecutive
frames.** The mean per-frame floor is a backstop set by the sparsest frame either film holds on.

Retuning followed the gate. Mark drift moved from a six-second cycle to roughly two, amplitudes and
the camera's creep periods came up with it, and the result was checked against a recording again
rather than against the number.

Measured on headless Chromium, 320×200 probe, thirty consecutive frames:

| Where | Before | First tuning | Shipped |
|---|---|---|---|
| Rate film, beat 2 hold (38%) — one loan on screen | 0 | — | 0.31% per frame, 0 identical |
| Cut-off film, beat 5 hold (78%) — full field | 0 | 38% of frames identical | 5.5% per frame, 0 identical |

The "before" column is not an estimate. Forcing `life: 0` in the two canvas hosts reproduces the old
behaviour exactly, and the gate then reports zero changed pixels at every hold — the films really
were frozen, not merely slow. anidoodle's `gate.mjs` carries a `--self-test` for the same reason:
*a green checkmark is a claim until you re-run it.*

## What we did not take

| Theirs | Why not |
|---|---|
| Texture by hand — seeded noise tiles, paper grain, wash granulation | Our fields are luminous marks on near-black. A paper tooth would fight the medium. Worth revisiting only if a story earns a printed or archival register; the evidence boards are the likeliest place. |
| No `ctx.filter`, ever | Already true of our canvases. Recorded as a standing rule rather than a change. |
| Character modules, anatomy, the detail pass | We draw no figures. The underlying rule — *every element has a one-line reason or it is not drawn* — is already the landing flight's rule 6. |
| Their render toolchain: `still.mjs`, `render.mjs`, `gate.mjs`, four backends | Built for producing a file. We produce a page that a reader drives. Only the dead-air metric crossed over. |
| Bit-exact determinism across renderers | Their frames are facts that must hash identically anywhere. Ours are a live reader's session. We keep the useful half — seeded, pure, no `Math.random` in the draw path — and drop the hashing. |
| Music, scores, the audio contract | Out of scope. |
| The one-look-still working method and three approval gates | This is a working practice, not code, and it already rhymes with our human-gate rule. Noted, not adopted as process. |

## Where we deliberately differ

**Reduced motion.** anidoodle says a scroll piece under reduced motion *shows its finished picture*:
a reader who cannot have the motion should still get the payoff, not the setup.

The films already satisfy this in substance. Under reduced motion they still track scroll, snapping
pose to pose instead of interpolating, so the reader reaches every beat including the decision — they
lose the tweening, not the story.

The landing is the exception, and it is a real one. `FlagshipLanding` drops the scroll listener
entirely under reduced motion, pins `progress` at 0 and removes the spacer blocks, so the hero canvas
holds the *first* frame of the flight permanently. A reduced-motion reader never sees the horizon the
flight is travelling towards. Left open for a decision rather than changed here, because the landing
is the product index and what its hero settles on is an editorial call, not a rendering one.

**Holds are legitimate here.** Their films hold rarely. Ours hold a third of the time on purpose,
because the reader is reading prose while the graphic waits. The rule we take is not *stop holding*,
it is *a hold must stay alive*.

## Honest limits

- The dead-air numbers come from the cue-table checker and the Playwright gate, both re-run after
  the self-test above.
- The tuning was judged first from native-resolution recordings, then signed off by a person, then
  validated on the live page (2026-09-26). The first tuning is the standing reminder that a
  measurement is not a viewing: it passed its gate and could not be seen. The amplitude and rate
  constants at the top of `craft.ts` are the first thing to move if a future change reads wrong.
- The rate film's beat-2 hold is a close-up with one loan and a rule on screen. It passes the hard
  rule with no identical frames, but it is carried almost entirely by the camera, so it is the first
  frame to check after any change to `cameraCreep`.
- Frame cost was not measured, on desktop or on a phone. The per-mark work added is a handful of
  `sin` calls across ~2,400 marks.
