# Why the pictures stay charts

The US-101 film is the proof. The opened vehicles were three rounded rectangles, one wheel and a glass box (`src/illustrations/cars.ts`, the committed `cars.riv` was under 2 KB). The road under them is a scatter plot. That is the ceiling, and it is structural. A prettier palette on the same picture will not clear it.

## The road is not a picture of a road

The canvas maps **lane index** across and **feet** along. On a laptop those two axes are not the same scale: a 12-foot lane is drawn on the order of twenty times wider than 12 feet of roadway. A vehicle footprint in that projection is a pancake. A dot is the honest mark, and it is also why the film reads as a graph. Giving the dot a "car shape" without changing the projection makes a worse chart, not a vehicle.

The camera cannot rescue it. It is one CSS scale on a bitmap of the whole stretch. At the close-up (about 2.7×) a 15-foot car is still about ten pixels. A push tight enough to see a body (about 14×, a few hundred feet in frame) allocates a backing store of tens of megapixels, because the bitmap is the entire freeway, zoomed. Map engines do not do this. They redraw the visible window at screen resolution.

## The opened beat was the same vocabulary, larger

Spec v3 says illustration is a different representation from the chart: the thing, not the measurement. The cars file was the chart's vocabulary again — `rect`, `ellipse`, one spoke. The writer already knew cubic contours, gradients and bones; `robot.ts` uses them. `cars.ts` did not. The result was "SVG that happens to move," which is the complaint that prompted the writer, repeated on the one beat that was supposed to be a picture of cars.

Motion craft was taken and depiction was declined. `docs/ANIMATION_CRAFT.md` adopts anidoodle's timing rules and writes down its drawing rules as out of scope. Holds breathe. Nothing in the frame becomes a more specific object. The backlog already calls this an expectation gap. The vehicles are that gap, on a published film.

## Two different things are both called data storytelling

The skill at [mcpmarket](https://mcpmarket.com/tools/skills/data-storytelling-1) teaches executive decks: problem-solution, a one-page dashboard, a line then an overlay then a breakdown. Installing that as the cinematic layer would make the chart fallback a method. It overlaps the decision frame this repo already takes seriously: one claim, the number that supports it, the limitation.

The examples worth copying are the public ones, mostly data journalism:

- [Juice Analytics, 20 best storytelling examples](https://www.juiceanalytics.com/writing/20-best-data-storytelling-examples)
- [Five excellent data storytelling examples](https://www.effectivedatastorytelling.com/post/five-excellent-data-storytelling-examples-and-what-makes-them-work) (Rosling, Halloran, two Vox pieces, The Pudding's pockets)

What those pieces do, and what a film here has to do too:

| Piece | The move | What it requires of a film |
|---|---|---|
| **The Pudding, Women's Pockets** | The measurement is whether a hand, a phone, a wallet fits. The reader can try their own object. The method sits at the end. | The object in the frame is the thing the claim is about. A gap is a gap a driver can see. A speed is a colour on a body, after the body exists. |
| **Periscopic, US Gun Deaths** | One unit — a stolen year — is defined, then allowed to accumulate until the scale is felt. | Name the unit before the magnitude. This film's unit is one brake, then the walk. The 9 mph figure arrives after the walk is visible. |
| **Neil Halloran, The Fallen of World War II** | The Soviet bar is given the time it takes. Sound and grouping change; the underlying count does not. | A scrub that finishes the propagation in a moment wastes the mechanism. The pocket has to travel. |
| **Hans Rosling, 200 Countries** | One field, two centuries, a guide pointing at the turn. The chart is continuous. The person is the guide. | One camera on one set of marks. The narration points. It does not answer the beat before the picture has asked it. |
| **Vox, South Korean height** | The first chart is admitted to show nothing. The axis is then changed, and the outlier appears. Curiosity does the rest of the work. | Beat 0 can show the stretch. It should withhold the sentence that explains it. |
| **Vox, the vaccine divide** | A phone covers the chart. The clip plays. Then the chart is uncovered and the bar is the point. | Build to the reveal. The featured number is a payoff, not a caption on the first frame. |
| **NYT calculators** (rent, minimum wage, carbon) | The reader operates the decision and finds the answer by using it. | The decision frame is something the reader can move. A paragraph that states the hold is the essay version of that. |
| **Washington Post, redistricting as mini golf** | The mechanism is a thing you do. Very little data is on screen. | A counterfactual the reader can run beats a modelled sentence. Only if the pack already contains the variant. |
| **Fragapane, The Stories Behind a Line; Guardian, Bussed Out** | One line is one person's journey. The system is made of those journeys. | Car 928 is a subject. Opening it into three generic cars is only the mechanism if the three cars are still that driver's gap. |

Giorgia Lupi's vignettes and We Feel Fine are the other pole: the data is drawn as a world. That is the depiction pass, not a new chart type.

## Systems that already do the missing part

These are in production for this kind of subject. None of them is a new chart library.

| System | What it is for | What we take |
|---|---|---|
| **Uber vis.gl / AVS** ([Khronos note on ScenegraphLayer + glTF](https://www.khronos.org/blog/ubers-vis.gl-brings-gltf-to-geospatial-data-visualization)) | A table of real-world objects, each row one instance of a model. Measurements (paths, predictions) stay abstract and are drawn on top. | The split. The vehicle is a model. Speed is a colour on it. The morning bands stay a table. We do not need deck.gl for five lanes of one freeway; we need the rule. |
| **A uniform-scale window, redrawn** (deck.gl, every slippy map, Apple's scroll-scrubbed product shots) | The camera shows the feet you are looking at, at screen resolution. | The next road shot. A few hundred feet, bodies at one scale, the pocket walking upstream. Not a CSS zoom of the 2,200-foot chart. |
| **NZZ scrollytelling vocabulary** ([data.europa.eu guide](https://data.europa.eu/apps/data-visualisation-guide/scrollytelling-introduction), from Oesch, Roth, Renner) | Five techniques: graphic sequence, animated transition, pan and zoom, moviescroller, show-and-play. | We have pan/zoom and a trigger. We do not have a moviescroller or a show-and-play of the thing itself. The opened beat was a graphic sequence of rectangles. |
| **The depiction pass already in this repo** (`robot.ts`, the Rive writer) | Cubic shells, gradients for volume, a part that can be keyed. | Used, now, for the three cars. anidoodle's character and detail rules stay declined as a house style; the requirement that a depicted object actually be that object does not. |

## Two spines, and the fence between them

A critique of the live US-101 film (the shared note titled Traffic Story Critique) separates two failures that look alike on screen.

The picture is a chart, for the projection reasons above. The film is also ordered as **data → picture → explanation → decision**. The number arrives before the reader has a question. The featured minute, the lane, and the 15 mph / 45 mph split are doing the work a scene should do. The data is the protagonist. In the pieces above, the data arrives as the explanation of something the reader has already watched.

The engine currently builds one pipeline: research, evidence pack, method, figures, model, film. That pipeline makes a defensible story. A film whose truth shows up through data needs a second pass that is allowed to finish before the dataset is allowed to speak:

```text
HOOK
→ MYSTERY          (the question is felt, not answered)
→ OBJECT           (a car, a gap, a hand — the thing)
→ EVENT            (one brake)
→ PROPAGATION      (the next driver, then the next)
→ REVEAL           (the first number, from the pack)
→ SYSTEM           (the morning, the window)
→ DECISION         (the signed question)
→ ENDING IMAGE
```

The evidence spine stays what the spec already is: claim, source, observation, calculation, model, limitation. The visual director lays one on the other. The cinematic spine chooses the order and the object. It does not choose the figures.

The fence, which the critique leaves open and this repo does not: an illustrative scene is labeled `illustrative`, and a sentence on screen is a figure the pack already froze. "The storytelling may expand past the observation" is how a film invents a 20-minute jam the morning did not record. The signed question stays the question until a person reopens it. A stronger hook is a change of order, not a new claim.

For this film, that order is: you are stopped and the road ahead is not; one car brakes; the next lamp is later and the gap closes; only then does the slow colour walk upstream and the pack's walk speed appear; then the morning, and the decision of where to hold the speed. The side-view cars are the object. They are not the whole spine.

## What this pass changes, and what it refuses

The side view is rebuilt as cars: a shell, a cabin, two wheels, a tail lamp and its glow, the nose dipping as the gap closes. Legend anchors come from `carsGeometry()`, so a later redraw cannot leave the labels on the old rectangles.

The road marks stay marks. Drawing vehicle sprites into the lane-index chart would claim a picture the axes do not support. Two things have to happen before another story ships a diagram and calls it the mechanism. The picture of the propagation has to be one scale: a short window of the freeway, vehicles as bodies, lamps at the tail, the measured speed painted on the body. And the film has to be ordered as the spine above, so the pack's walk speed is the reveal rather than the opening caption. The decision table keeps the bands. The signed question stays put.
