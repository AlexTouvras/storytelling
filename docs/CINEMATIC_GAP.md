# Why the pictures stay charts

The US-101 film is the proof. The opened vehicles were three rounded rectangles, one wheel and a glass box (`src/illustrations/cars.ts`, the committed `cars.riv` was under 2 KB). The road under them is a scatter plot. That is the ceiling, and it is structural. A prettier palette on the same picture will not clear it.

## The road is not a picture of a road

The canvas maps **lane index** across and **feet** along. On a laptop those two axes are not the same scale: a 12-foot lane is drawn on the order of twenty times wider than 12 feet of roadway. A vehicle footprint in that projection is a pancake. A dot is the honest mark, and it is also why the film reads as a graph. Giving the dot a "car shape" without changing the projection makes a worse chart, not a vehicle.

The camera cannot rescue it. It is one CSS scale on a bitmap of the whole stretch. At the close-up (about 2.7×) a 15-foot car is still about ten pixels. A push tight enough to see a body (about 14×, a few hundred feet in frame) allocates a backing store of tens of megapixels, because the bitmap is the entire freeway, zoomed. Map engines do not do this. They redraw the visible window at screen resolution.

## The opened beat was the same vocabulary, larger

Spec v3 says illustration is a different representation from the chart: the thing, not the measurement. The cars file was the chart's vocabulary again — `rect`, `ellipse`, one spoke. The writer already knew cubic contours, gradients and bones; `robot.ts` uses them. `cars.ts` did not. The result was "SVG that happens to move," which is the complaint that prompted the writer, repeated on the one beat that was supposed to be a picture of cars.

Motion craft was taken and depiction was declined. `docs/ANIMATION_CRAFT.md` adopts anidoodle's timing rules and writes down its drawing rules as out of scope. Holds breathe. Nothing in the frame becomes a more specific object. The backlog already calls this an expectation gap. The vehicles are that gap, on a published film.

## The data-storytelling skill is the wrong tool

[Data Storytelling](https://mcpmarket.com/tools/skills/data-storytelling-1) (the business-analytics skill published by drgaciw, mirrored widely from the same `SKILL.md`) teaches executive narratives: problem-solution, comparison, a one-page dashboard. Its visual pillar is **charts, diagrams, and highlights**. Progressive reveal, in that skill, means a line, then an overlay, then a segment breakdown. That is the behaviour this engine already falls back to. Installing it as the cinematic layer would make the fallback a method.

What it is good for, and already overlaps with work this repo does seriously, is the **decision frame**: one claim, the number that supports it, the limitation. Not the picture of the mechanism.

## Systems that already do the missing part

These are in production for this kind of subject. None of them is a new chart library.

| System | What it is for | What we take |
|---|---|---|
| **Uber vis.gl / AVS** ([Khronos note on ScenegraphLayer + glTF](https://www.khronos.org/blog/ubers-vis.gl-brings-gltf-to-geospatial-data-visualization)) | A table of real-world objects, each row one instance of a model. Measurements (paths, predictions) stay abstract and are drawn on top. | The split. The vehicle is a model. Speed is a colour on it. The morning bands stay a table. We do not need deck.gl for five lanes of one freeway; we need the rule. |
| **A uniform-scale window, redrawn** (deck.gl, every slippy map, Apple's scroll-scrubbed product shots) | The camera shows the feet you are looking at, at screen resolution. | The next road shot. A few hundred feet, bodies at one scale, the pocket walking upstream. Not a CSS zoom of the 2,200-foot chart. |
| **NZZ scrollytelling vocabulary** ([data.europa.eu guide](https://data.europa.eu/apps/data-visualisation-guide/scrollytelling-introduction), from Oesch, Roth, Renner) | Five techniques: graphic sequence, animated transition, pan and zoom, moviescroller, show-and-play. | We have pan/zoom and a trigger. We do not have a moviescroller or a show-and-play of the thing itself. The opened beat was a graphic sequence of rectangles. |
| **The depiction pass already in this repo** (`robot.ts`, the Rive writer) | Cubic shells, gradients for volume, a part that can be keyed. | Used, now, for the three cars. anidoodle's character and detail rules stay declined as a house style; the requirement that a depicted object actually be that object does not. |

## What this pass changes, and what it refuses

The side view is rebuilt as cars: a shell, a cabin, two wheels, a tail lamp and its glow, the nose dipping as the gap closes. Legend anchors come from `carsGeometry()`, so a later redraw cannot leave the labels on the old rectangles.

The road marks stay marks. Drawing vehicle sprites into the lane-index chart would claim a picture the axes do not support. The next cinematic step is a new shot, not a new mark: one scale, a short window of the freeway, vehicles as bodies, lamps at the tail, the measured speed painted on the body. The decision table keeps the bands. That shot is the thing the current stage cannot reach, and it is the one to build before another story ships a diagram and calls it the mechanism.
