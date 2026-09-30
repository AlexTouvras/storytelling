# STORYTELLING ENGINE — SPECIFICATION (v3)

## Preamble: What Changed From v2

This revision replaces AniDoodle as the primary illustration engine with **Rive** (`@rive-app/react-canvas`). Rive renders to canvas (compatible with the existing canvas-native architecture), has built-in state machines that map to all spec control modes, loads instantly (no baking), uses minimal memory (KB-size files), and has a visual editor workflow. AniDoodle is retained as an optional engine for scenes that specifically require its hand-drawn aesthetic or pure frame-by-frame deterministic scrubbing.

SVG + Framer Motion (already in the stack) serves as the supporting illustration layer for annotations, arrows, callouts, and simple diagrams.

This revision also integrates the strategic finding that the existing repo is already canvas-native — the existing film uses custom canvas drawing functions (`draw-field.ts`, `draw-apps.ts`, `frame.ts`), not D3/SVG. This eliminates the coordinate bridge problem entirely.

### Complexity eliminated

| v2 complexity | v3 status | Why |
|---|---|---|
| Two-mode AniDoodle integration (film + interactive) | Eliminated | Rive's state machine model is unified |
| Keep-alive pool (baking latency) | Eliminated | Rive loads instantly |
| Memory budgeting (35MB per piece) | Eliminated | Rive .riv files are KB-size; shared WebGL context |
| Log compaction (reverse navigation) | Eliminated | Rive state machines are reset-able |
| AniDoodle determinism gotchas (gradient rasterization, GPU→software) | Eliminated | Rive handles rendering internally |
| Full Visual Adapter contract | Simplified | Rive is a React component with hooks |
| Coordinate bridge (piece logical space → viewport) | Eliminated | All canvas; camera is CSS transform |
| Per-adapter camera mapping | Eliminated | One CSS transform on a container |

---

## 1. PRODUCT VISION

The target experience is closer to a high-end visual data documentary than an animated dashboard, a conventional scrollytelling article, a collection of animated charts, or a collection of illustrations.

The reader should feel that they are moving through an explanation.

The system should be capable of moving between representations such as:

```
DATA  →  GRAPH  →  DIAGRAM  →  ILLUSTRATION  →  DATA WORLD  →  back again
```

Each representation exists because it communicates something different.

### DATA / GRAPHS
Use for: quantitative evidence, distributions, comparisons, trends, magnitude, statistical relationships.
**Engine:** existing canvas drawing functions (`draw-field.ts`, `draw-apps.ts`, `frame.ts`, `cutoff-frame.ts`).

### DATA WORLDS / PARTICLES
Use for: populations, scale, segmentation, concentration, clustering, emergence, individual entities inside populations.
**Engine:** defer until a story requires it. The existing canvas visuals already render loan populations as dots — this may suffice for the first flagship story.

### DIAGRAMS
Use for: relationships, causality, flows, dependencies, systems.
**Engine:** SVG + Framer Motion (annotations, arrows, flow elements). Rive can also serve for illustrated diagrams.

### ILLUSTRATION
Use for: characters, people, objects, environments, illustrated mechanisms, visual metaphors, object interactions, character/object animation.
**Engine:** Rive (primary). AniDoodle (optional, for hand-drawn aesthetic only). SVG + Framer Motion (supporting elements).

### CAMERA
Use for: scale, attention, hierarchy, continuity, transitions between levels of abstraction.
**Engine:** CSS transform on a container holding all canvas layers.

### TEXT
Use for: narrative, interpretation, context, labels, evidence/source explanation.
**Engine:** existing story layout (react-scrollama, sticky scenes, threshold reveal).

The system does not need every representation in every story. The Visual Director chooses the appropriate representation for each narrative beat.

---

## 2. CRITICAL ILLUSTRATION BOUNDARY

The illustration engine is NOT the data visualization engine.

Never use illustrations (Rive, AniDoodle, or SVG) for:
- charts, axes, statistical distributions, quantitative plots, graphs
- data visualization

Use the existing canvas drawing functions for those tasks.

Illustrations should provide:
- characters, objects, environments, illustrated mechanisms, visual metaphors

The distinction:
- «Data visualization shows what happened.»
- «Illustration can show what the system/thing looks like and how a mechanism works.»

---

## 3. THE EXISTING STORY IS NOT THE QUALITY CEILING

Do NOT optimize the architecture around the current "When Rates Rise" story. Do NOT simply add illustrations to the current scenes, make existing charts more animated, reproduce the current story with different technology, increase the number of transitions, or decorate the existing page with illustrations.

The new system must enable things that the current story cannot express well.

At minimum, the new demonstration should prove:
1. multiple visual representations
2. meaningful representation transitions
3. cinematic camera movement
4. illustration used to explain a mechanism
5. identity continuity across representations
6. different control models for different visuals
7. data → illustration → data continuity
8. a new story whose structure is not derived from the current story

The existing story is retained as a regression test.

---

## 4. CORE ARCHITECTURE

The existing repository already has a 3-layer architecture and a canvas-native rendering pipeline. This spec extends it, not replaces it.

### Existing architecture (verified)

```
Layer 3  Decision Stories    when-rates-rise, where-should-the-cutoff-sit, …
Layer 2  Story Grammar        reveal / transform / compare / filter / trace / highlight / annotate / zoom / split
Layer 1  Story Engine         sticky + Scrollama + registry + validation + a11y
```

The runtime is manifest-driven:

```
manifests (JSON)  →  Zod schema  →  template registry  →  StoryLayout
                                                          ├─ ScrollSceneProvider + StoryScrollama (react-scrollama)
                                                          ├─ StoryStep / StorySection (step enter → section id)
                                                          ├─ StickyVisual (CSS sticky; same path all breakpoints)
                                                          └─ SceneRenderer (allow-listed visuals)
```

The film uses custom canvas drawing functions:
- `draw-field.ts`, `draw-apps.ts` — canvas drawing
- `frame.ts`, `cutoff-frame.ts` — frame rendering
- `cue-table.ts` — timeline/cue system for the film
- `craft.ts` — craft utilities

The existing visuals (`CashflowPressurePanel.tsx`, `RateRiskPanel.tsx`) are React components driving canvas.

The atmosphere system has 5 motif types with a registry.

### Extended architecture

```
                         STORY SPEC (manifest JSON + Zod)
                            │
                            ▼
                     SCENE RUNTIME (existing StoryLayout + SceneRenderer)
                            │
                            ▼
                     VISUAL DIRECTOR (NEW — lightweight)
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
   ENTITY MAP          CAMERA              STORY TIMELINE
   (NEW — simple)    (NEW — CSS transform)  (extends cue-table.ts)
          │                 │                 │
          └──────────┬──────┴──────┬──────────┘
                     │             │
                     ▼             ▼
              VISUAL LAYERS     TEXT / EVENTS
                     │
          ┌──────────┼──────────┐
          │          │          │
          ▼          ▼          ▼
     CANVAS A    CANVAS B     SVG LAYER
   (data viz)  (Rive)      (Framer Motion
     existing   @rive-app    annotations,
     draw-*.ts  /react-canvas arrows, labels)
          │          │          │
          └──────────┼──────────┘
                     ▼
              VIEWPORT (CSS stacked)
              camera = CSS transform on container

  Optional: AniDoodle as Canvas C (hand-drawn scenes only)
```

### What is genuinely new

| System | Implementation | Complexity |
|---|---|---|
| Visual Director | Lightweight coordinator: decides which layers are active, drives transitions | Low |
| Camera | CSS transform on a container holding all canvas/SVG layers | Low |
| Entity Map | `Map<string, Entity>` with subscribe mechanism | Low |
| Story Timeline | Extends existing `cue-table.ts` with scroll-driven progress | Low |
| Rive integration | React component wrapping `useRive()` + `useStateMachineInput()` | Low |
| SVG layer | React components with Framer Motion | Low (already in stack) |
| AniDoodle (optional) | React component wrapping `mount()` / `destroy()` | Medium (only if needed) |

### What is NOT built

| v2 system | Why it's unnecessary |
|---|---|
| Visual Adapter contract (full interface) | Rive is a React component with hooks; no adapter needed |
| Compositor | CSS stacking (z-index) + canvas draw order |
| Per-adapter camera mapping | One CSS transform on a container; all layers share it |
| Coordinate bridge | All canvas; same coordinate space |
| Keep-alive pool | Rive loads instantly |
| Log compaction | Rive state machines are reset-able |
| Particle engine | Defer until a story needs it |
| Diagram engine | SVG + Framer Motion suffices |

Do not create redundant systems if the repository already contains equivalent abstractions. Extend the existing architecture where practical.

---

## 5. STORY TIMELINE

Scrolling is one possible input to the story timeline. It is NOT the animation API of every renderer.

The conceptual model:

```
scroll / interaction / navigation
             ↓
       STORY TIMELINE (extends cue-table.ts)
             ↓
       VISUAL DIRECTOR
             ↓
      scene-specific behaviour
```

### Existing timeline system

The repo already has `cue-table.ts` — a timeline/cue system that holds every frame number and runs a checker at load. The Story Timeline extends this to drive:
- Camera position (CSS transform interpolation)
- Data visual state (existing visual state transitions)
- Rive state machine inputs (number inputs for progress, triggers for events)
- SVG layer animations (Framer Motion controls)
- Text reveal (existing threshold reveal)

### Different visuals respond differently

| Visual | Response to timeline | How |
|---|---|---|
| Camera | Continuous | CSS transform interpolated from cue-table progress |
| Data visual (canvas) | Continuous or state-based | Existing draw functions called with interpolated parameters |
| Rive illustration (triggered) | Triggered | `input.fire()` at cue-table threshold |
| Rive illustration (continuous) | Continuous | `input.value = progress` driven by cue-table |
| Rive illustration (state) | State transition | `input.value = newState` at cue-table threshold |
| SVG annotation | Triggered or continuous | Framer Motion `useAnimation` controls |
| Text | Threshold reveal | Existing react-scrollama step enter |
| AniDoodle (optional) | Film mode or interactive | `renderFrame(frame, env)` or `mount()` + triggers |

Do not impose `scrollProgress → illustrationProgress` as a universal architecture. Different visuals are allowed to behave differently.

### Reverse navigation

When the user scrolls backward:
- Camera interpolates back (CSS transform is reversible)
- Data visual state reverses (existing draw functions are parameterized)
- Rive state machine: set number inputs to earlier values, or reset state machine via `rive.stop()` + `rive.play()`
- SVG animations: reverse via Framer Motion controls
- No accumulated state, no duplicated animations

---

## 6. VISUAL CONTROL MODES

The runtime supports these explicit control modes. Each maps to a specific Rive state machine pattern or existing behavior:

### CONTINUOUS
Visual state follows scene/timeline progress.
- Data visual: interpolate draw parameters
- Rive: set a number input: `progressInput.value = scrollProgress`
- Camera: `container.style.transform = interpolate(progress)`

### TRIGGER
An event occurs when the narrative reaches a threshold.
- Rive: `triggerInput.fire()` at the cue-table threshold
- Example: `enterScene` → character walks in

### TIMELINE
A local animation runs independently after being triggered.
- Rive: state machine transition (designer defines timed animation between states)
- `trigger("shock")` → state machine transitions to "shocked" state → animation plays on its own schedule

### STATE
The visual moves between meaningful discrete states.
- Rive: `stateInput.value = newStateIndex` or boolean input
- Example: `NORMAL → SHOCKED → CONSTRAINED`

### STATIC
Visual provides context without animation.
- Rive: single artboard, no state machine
- Data visual: render once

### INTERACTIVE
User directly controls the visual.
- Rive: pointer events + state machine inputs (Rive handles pointer natively)
- Data visual: hover, click (existing)

Do not implement unnecessary complexity. Different visuals are allowed to behave differently.

---

## 7. CAMERA

Different renderers share one rendering surface (canvas) or are stacked via CSS. The camera is a single CSS transform on a container element holding all layers.

### Canonical camera state

```ts
interface CameraState {
  x: number      // pan offset, CSS pixels
  y: number      // pan offset, CSS pixels
  zoom: number   // scale factor (1 = default)
}
```

Use only the dimensions actually required.

### Implementation

```ts
// One transform, applied to the container holding all visual layers
function applyCamera(container: HTMLElement, state: CameraState) {
  container.style.transform =
    `translate(${state.x}px, ${state.y}px) scale(${state.zoom})`;
}
```

All layers (canvas A for data, canvas B for Rive, SVG for annotations) are children of the container. They all move together. No per-adapter mapping needed.

### Camera actions

| Action | Intent | Implementation |
|---|---|---|
| FOCUS | Center on an entity | `CameraState { x: -anchor.x + viewportW/2, y: -anchor.y + viewportH/2, zoom: 2.5 }` |
| ZOOM | Change scale | Interpolate `zoom` |
| PAN | Move across | Interpolate `x`, `y` |
| TRACK | Follow a moving entity | Update `x`, `y` each frame from entity anchor |
| REVEAL | Show something hidden | Animate `zoom` from high to default |
| PULLBACK | Retreat to wider context | Animate `zoom` to 1, `x`/`y` to 0 |

Camera movement should communicate hierarchy and scale. Avoid decorative motion.

---

## 8. ENTITY PROTOCOL

Representation continuity requires semantic identity.

```ts
interface Entity {
  id: string                    // e.g., "borrower_1734"
  semanticType: string          // e.g., "borrower", "household", "segment"
  dataReference: string         // path/pointer into the evidence data
  representation: Representation  // current representation type
  state: Record<string, unknown> // discrete state
}

type Representation =
  | "data-point"      // canvas data visual element
  | "illustration"    // Rive artboard entity
  | "diagram-node"   // SVG element
  | "highlighted"     // focused version of any above
```

### Implementation

```ts
// Simple Map with subscribe — not a full registry system
class EntityMap {
  private entities = new Map<string, Entity>();
  private listeners = new Set<() => void>();

  register(entity: Entity): void { /* ... */ }
  get(id: string): Entity | undefined { /* ... */ }
  update(id: string, patch: Partial<Entity>): void { /* ... */ }
  subscribe(fn: () => void): () => void { /* ... */ }
}
```

**«The Entity Map owns semantic identity.»**
**«The renderer owns authoritative geometry.»**

The Entity Map knows that `borrower_1734` exists and what it represents. It does NOT store pixel positions. Positions come from anchor lookup.

`borrower_1734` may exist simultaneously as:
- a data point in a canvas visual
- an illustrated household in a Rive artboard
- a highlighted element in either

The identity remains the same. Only the representation changes.

---

## 9. ANCHOR PROTOCOL

Renderers that support entity positioning expose an anchor lookup.

### Canonical anchor space

All anchors are in **viewport-space CSS pixels** — the position of the entity relative to the story viewport's top-left corner.

```ts
interface Anchor {
  x: number       // viewport CSS pixels from left
  y: number       // viewport CSS pixels from top
  width: number   // bounding box width
  height: number  // bounding box height
}
```

### Per-layer anchor retrieval

| Layer | How anchors are retrieved |
|---|---|
| Canvas A (data viz) | Track entity positions in the draw function. After drawing, expose a `Map<string, Anchor>` populated during the draw call. Convert canvas coordinates to viewport space via `canvas.getBoundingClientRect()`. |
| Canvas B (Rive) | Rive artboards have known dimensions. Entity positions within the artboard are defined by the designer. Expose them via a number input that reports position, or compute from artboard layout. Convert to viewport space via `canvas.getBoundingClientRect()`. |
| SVG layer | `element.getBoundingClientRect()` directly gives viewport-space coordinates. |

### Transition flow

```
DATA
 ↓
find borrower_1734 in Entity Map
 ↓
getAnchor("borrower_1734") → { x: 420, y: 180, width: 60, height: 80 }
 ↓
camera focus → CameraState { x: -(420 - viewportW/2), y: -(180 - viewportH/2), zoom: 2.5 }
 ↓
fade in Rive illustration layer (Canvas B)
 ↓
fire trigger input → mechanism animation plays
 ↓
camera pullback → CameraState { zoom: 1, x: 0, y: 0 }
 ↓
fade out Rive layer, fade in data layer
 ↓
borrower_1734 still in Entity Map, still highlighted in data visual
```

The goal is continuity, not arbitrary positioning. The viewer understands: «this illustration represents the same thing that was previously shown in the data.»

---

## 10. VISUAL LAYERS

Each representation type is a visual layer — a React component that renders to canvas or SVG. There is no full adapter contract; each layer is a component with a consistent interface.

### Layer interface

```ts
interface VisualLayerProps {
  // Common
  active: boolean                          // is this layer currently visible?
  cameraState: CameraState                 // applied via parent container CSS transform
  reducedMotion: boolean                   // prefers-reduced-motion
  entityMap: EntityMap                     // shared entity registry

  // Data layer (Canvas A)
  drawFn?: (ctx, params) => void           // existing draw-field.ts etc.
  drawParams?: Record<string, unknown>     // interpolated parameters
  anchors?: Map<string, Anchor>            // populated during draw

  // Rive layer (Canvas B)
  riveSrc?: string                         // .riv file path
  stateMachine?: string                    // state machine name
  riveInputs?: Record<string, number | boolean>  // input values to set
  riveTriggers?: string[]                  // triggers to fire

  // SVG layer
  svgContent?: React.ReactNode             // annotations, arrows, labels
  framerControls?: AnimationControls       // Framer Motion animation controls

  // AniDoodle (optional)
  anidoodlePiece?: string                  // piece name (only for hand-drawn scenes)
  anidoodleMode?: "film" | "interactive"   // integration mode
  anidoodleProgress?: number              // for film mode: frame progress
}
```

### Canvas A — Data visualization layer

Wraps the existing canvas drawing functions (`draw-field.ts`, `draw-apps.ts`, etc.). The component:
1. Creates a `<canvas>` element
2. On each frame (driven by cue-table progress), calls the draw function with interpolated parameters
3. Populates an anchor map during draw for entity positions
4. Exposes the anchor map to the Visual Director

### Canvas B — Rive illustration layer

```tsx
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";

function RiveLayer({ riveSrc, stateMachine, riveInputs, riveTriggers, active }) {
  const { rive, RiveComponent } = useRive({
    src: riveSrc,
    stateMachine,
    autoplay: true,
  });

  // Set continuous inputs (number/boolean)
  useEffect(() => {
    if (!rive) return;
    for (const [name, value] of Object.entries(riveInputs ?? {})) {
      rive.setNumberStateAtPath(name, value, stateMachine);
    }
  }, [rive, riveInputs]);

  // Fire triggers
  useEffect(() => {
    if (!rive) return;
    for (const trigger of riveTriggers ?? []) {
      rive.fireStateAtPath(trigger, stateMachine);
    }
  }, [rive, riveTriggers]);

  if (!active) return null;
  return <RiveComponent style={{ width: "100%", height: "100%" }} />;
}
```

No adapter. No lifecycle management. No memory budgeting. Just hooks.

### SVG layer — Annotations and supporting illustrations

React components rendering SVG elements, animated with Framer Motion. Used for:
- Labels and callouts
- Arrows showing causality or flow
- Simple diagram elements
- Anything that needs DOM accessibility (screen readers, tooltips)

### Canvas C — AniDoodle (optional, only for hand-drawn scenes)

Only mounted when a story scene specifically requires the hand-drawn aesthetic. Uses AniDoodle's `mount()` / `destroy()` API. Film mode for scrubbed scenes, interactive mode for triggered scenes. Keep-alive strategy only if baking latency becomes an issue (unlikely, since AniDoodle scenes are rare).

### Layer stacking

```tsx
function Viewport({ cameraState, layers }) {
  return (
    <div
      className="story-viewport"
      style={{
        transform: `translate(${cameraState.x}px, ${cameraState.y}px) scale(${cameraState.zoom})`,
        position: "relative",
      }}
    >
      <canvas ref={canvasARef} style={{ position: "absolute", zIndex: 1 }} />
      <RiveLayer style={{ position: "absolute", zIndex: 2 }} />
      <svg style={{ position: "absolute", zIndex: 3 }}>
        {/* annotations */}
      </svg>
      {/* AniDoodle canvas (optional, zIndex: 2 or 4) */}
    </div>
  );
}
```

---

## 11. TEMPORAL DETERMINISM

Scrubbable visuals must be deterministic.

### Data visuals (canvas)

The existing draw functions are parameterized — given the same parameters, they produce the same output. The cue-table drives parameters deterministically.

### Rive

Rive state machines advance by wall-clock time, not by frame number. For deterministic scrubbing:
- CONTINUOUS scenes: drive a number input with cue-table progress. The state machine interpolates from the current state to the target. Given the same progress value, the visual state is predictable.
- TRIGGERED scenes: the state machine handles its own timing after a trigger fires. `rive.stop()` + `rive.play()` resets to the entry state. This is deterministic — the same trigger always produces the same animation.
- Reverse navigation: set number inputs to earlier values, or `rive.stop()` + `rive.play()` to reset.

Rapid forward/backward navigation must not produce duplicated animations or accumulated state. The Visual Director manages this by:
- Only firing triggers when crossing a threshold forward (not backward)
- Setting number inputs to the target value directly (not incrementally)
- Calling `rive.stop()` + `rive.play()` when reversing past a trigger point

### SVG + Framer Motion

Framer Motion's `useAnimation` controls support scrubbing via `animation.set(progress)`. Fully deterministic.

### AniDoodle (optional)

Film mode (`renderFrame(frame, env)`) is a pure function — fully deterministic and scrubbable. Interactive mode uses the input log model with the determinism guarantees described in v2.

---

## 12. FIRST GATE — REAL RIVE RENDERING

Before building the flagship story:

1. Install `@rive-app/react-canvas`
2. Create a test illustration in the Rive editor (free, browser-based at [rive.app](https://rive.app)) — a simple mechanism with 2-3 states and a trigger input
3. Mount it inside the Next.js app alongside existing canvas visuals
4. Verify it renders, responds to state machine inputs, and cleans up on unmount

### Gate 1 acceptance criteria

- A Rive `.riv` file is loaded and rendered on a `<canvas>` inside the Next.js app
- A state machine input (boolean, number, or trigger) is successfully set/fired from React
- The illustration is visible and animating
- `cleanup()` is called on unmount (no console errors, no leaked WebGL contexts)
- The Rive canvas coexists visually with an existing data visual canvas

If this does not work: STOP. Do not proceed.

---

## 13. SECOND GATE — THE HARDEST TRANSITION

Build ONE scene that proves the core novelty: data → illustration → data continuity.

```
DATA ENTITY (canvas A)
     ↓
ENTITY ANCHOR (getAnchor → viewport-space CSS pixels)
     ↓
CAMERA FOCUS (CSS transform on container)
     ↓
RIVE ILLUSTRATION (Canvas B fades in, positioned at same viewport location)
     ↓
MECHANISM (trigger input fires → state machine animation plays)
     ↓
CAMERA PULLBACK (CSS transform animates back to default)
     ↓
DATA ENTITY (Canvas A fades back in, same entity still highlighted)
```

This gate also demonstrates multi-engine choreography:
- Continuous camera movement (CSS transform interpolation)
- Continuous data visualization (existing canvas draw functions)
- Triggered Rive animation (state machine trigger)
- Text/event synchronization (existing threshold reveal)

### Gate 2 acceptance criteria

- An entity visible in a canvas data visual has an anchor in viewport-space CSS pixels
- The camera focuses on that anchor (entity is centered/zoomed)
- A Rive illustration fades in and occupies the same viewport location (continuity)
- A trigger fires and the mechanism animation plays
- The camera pulls back to default
- The data visual returns with the same entity still highlighted
- Scrolling backward reverses the state (illustration fades out, camera pulls back, data visual restored)
- No duplicated animations or accumulated state on rapid forward/backward
- The viewer understands: «this illustration represents the same thing that was previously shown in the data»

If this is visually broken, do not move to the flagship story.

---

## 14. CINEMATIC PRIMITIVES

Implement only primitives needed by the first stories. These are convenience methods on the Visual Director that compose layer operations. They do NOT add a new architectural layer.

| Primitive | Intent | Implementation |
|---|---|---|
| FOCUS | Camera targets an entity anchor | `getAnchor(id)` → `applyCamera(container, focusState)` |
| SPLIT | Show two representations side by side | Two canvas layers, CSS positioned |
| FILTER | Isolate a subset of the population | Draw function parameter |
| TRACE | Follow an entity through a transition | `FOCUS` + layer swap + camera tracking |
| MORPH | Transition one representation into another | Crossfade between layers + camera move |
| TRANSFORM | Change an entity's state | Rive state machine input or draw parameter |
| CAMERA | Move the camera | `applyCamera` with interpolated state |
| ANNOTATE | Add a label or annotation | SVG layer element with Framer Motion |
| RECONNECT | Return from illustration to data | Fade out illustration layer, fade in data layer, camera pullback |

These represent narrative intent rather than low-level animation instructions.

`TRACE borrower_1734` is preferable to the story directly manipulating `translateX(...)`, `scale(...)`, `opacity(...)`.

The runtime decides how the visual layers execute the intent.

---

## 15. CAMERA PRIMITIVES

Support meaningful camera actions:

| Action | Intent |
|---|---|
| FOCUS | Center on an entity |
| ZOOM | Change scale to communicate hierarchy |
| PAN | Move across a space |
| TRACK | Follow a moving entity |
| REVEAL | Show something previously hidden |
| PULLBACK | Retreat to a wider context |

Example movement:

```
portfolio → population → segment → entity → mechanism
```

and:

```
mechanism → entity → segment → population → portfolio
```

Camera movement should communicate hierarchy and scale. Avoid decorative motion.

---

## 16. NEW FLAGSHIP STORY

Do NOT make the existing "When Rates Rise" story the first creative target.

After the technical gates work, create a new flagship story.

### Selection criteria

The story should be selected around a question where:

«a chart alone is insufficient to explain the important idea.»

It should have:
- a strong question
- credible evidence
- a clear mechanism
- multiple levels of scale
- a reason to move between data and illustration
- at least one meaningful camera transition
- at least one illustration that materially improves understanding

The story should demonstrate the new medium. Do not derive its scene structure from "When Rates Rise".

### Domain guidance

Consider domains where the data → illustration → data loop is natural and the mechanism is genuinely better illustrated than charted. The existing repo already has decision stories about rates, cutoffs, and recovery times. The flagship should be in a different domain but aligned with the product's "decision storytelling" positioning.

Strong candidates (given the user's background in software building, data analytics, and AI):

- **Incident response cascades**: An alert fires → on-call engineer triages → escalation chain → resolution. Data: MTTR distributions, escalation rates. Mechanism: how a small delay at one step cascades into a major outage. Illustration: the escalation chain as a visual system with Rive.
- **Model deployment risk**: A model ships → traffic shifts → drift detected → rollback. Data: deployment success rates, drift metrics. Mechanism: how a small distribution shift cascades into production failure. Illustration: the deployment pipeline as a visual mechanism.
- **Technical debt accumulation**: New feature → shortcut taken → debt logged → interest compounds → velocity drops. Data: cycle time trends, defect rates. Mechanism: how technical debt compounds over time. Illustration: the debt as a growing visual weight on a system.

These all have: quantitative evidence, a mechanism that's better illustrated than charted, multiple scales (individual → system), and a natural reason to move between data and illustration.

### Story design pipeline

```
QUESTION
   ↓
EVIDENCE
   ↓
INSIGHT
   ↓
MECHANISM
   ↓
VISUAL METAPHOR
   ↓
REPRESENTATION
   ↓
SCENE
   ↓
CHOREOGRAPHY
   ↓
IMPLEMENTATION
```

For every major insight ask: «What does the reader need to understand?» Then: «Which representation communicates that most clearly?» Only then choose: graph, illustration, diagram, camera, text, or combination.

---

## 17. WHEN RATES RISE — REGRESSION FIXTURE

Keep the existing story working. It should be used to verify that the new architecture does not break existing functionality.

Only after the new engine exists may you optionally create a substantially improved version.

---

## 18. REDUCED MOTION

Reduced motion must preserve information. Do not simply disable animation.

Instead transform:

| Original | Reduced motion |
|---|---|
| Continuous camera movement | Focal cut (camera jumps to final position) |
| Continuous morph | State A → State B (no interpolation) |
| Data visual animation | Static final state |
| Rive character animation | Set state machine to final state (set number input to 1.0, or boolean to final value) |
| SVG annotation animation | Show without animation |

The narrative sequence remains understandable. Text and evidence remain synchronized with the story state.

Rive state machines can be designed with reduced-motion states. The Visual Director sets inputs to their final values instead of animating them.

---

## 19. PERFORMANCE

Prioritize correctness first. Then optimize.

### Performance characteristics

| Layer | Characteristic | Notes |
|---|---|---|
| Canvas A (data viz) | Existing performance | Already optimized in the repo |
| Canvas B (Rive) | Instant load, small files | .riv files are KB-size; shared WebGL context for multiple instances |
| SVG layer | Minimal | SVG elements are lightweight; Framer Motion is already in the stack |
| Camera | CSS transform | GPU-accelerated by the browser |
| AniDoodle (optional) | ~2s baking, ~35MB per piece | Only used for rare hand-drawn scenes; keep-alive if needed |

### Optimization priorities

1. **Scroll handling** — coalesce scroll events, throttle to RAF
2. **React renders** — layers should use refs and direct DOM manipulation for canvas/SVG updates. React only manages mount/unmount and prop changes.
3. **Rive instance management** — Rive loads instantly, so mount/unmount per scene is acceptable. If multiple Rive instances are needed, use the offscreen WebGL renderer (default) which shares one WebGL context.
4. **Canvas/WebGL resources** — call `cleanup()` on Rive unmount. Use `useRiveFile` to share a parsed .riv file across components.
5. **Scene mounting/unmounting** — use CSS `display: none` / `visibility: hidden` for layers that need to persist across scenes
6. **Responsive behaviour** — one scroll path across all breakpoints (existing). Rive handles resize via its runtime (`resizeDrawingSurfaceToCanvas()`).
7. **Mobile performance** — Rive is lightweight; no special mobile optimization needed beyond standard practices.

Do not introduce unnecessary infrastructure.

---

## 20. TESTING

Preserve all existing tests.

### Existing tests (do not break)

| Test | Command | Coverage |
|---|---|---|
| Manifest validation | `npm run validate:stories` | Zod schema + allowlist/grammar parity |
| Unit tests | `npm run test:unit` | Sim, `resolveScene`, schema |
| E2E + accessibility | `npm run test:e2e` | Playwright + axe, port 3100 |
| Full engine | `npm run test:engine` | Validation + unit + build + e2e |
| Lint | `npm run lint` | ESLint |

### New tests

| Test | What it verifies |
|---|---|
| Rive rendering | `.riv` file loads, state machine plays, canvas is visible |
| Rive state machine inputs | Number/boolean inputs set correctly; triggers fire |
| Rive cleanup | `cleanup()` called on unmount; no leaked WebGL contexts |
| Camera state | CSS transform applied to container; interpolates smoothly |
| Entity identity | Same `entityId` resolves across layers |
| Anchor retrieval | `getAnchor()` returns viewport-space CSS pixels from each layer |
| Deterministic progress | Same cue-table progress produces same visual state |
| Trigger/reset | Trigger fires once; reset returns to known state; no accumulated state |
| Representation transitions | Data → Rive → Data preserves entity identity |
| Reduced motion | Rive shows final state; camera uses focal cut; text synchronized |
| Cleanup | Unmount frees all resources; no orphaned canvases or RAF loops |
| Existing story compatibility | "When Rates Rise" and other stories still render correctly |
| Rapid navigation | Forward/backward scroll produces no duplicated animations or desync |

Run the repository's existing: `validate`, `unit tests`, `build`, `E2E`, `lint` commands as appropriate. Do not declare success if the existing application has regressed.

---

## 21. IMPLEMENTATION ORDER

### PHASE 0 — RECONNAISSANCE (DONE)

Inspected:
- existing repository architecture — 3-layer, manifest-driven, canvas-native
- current story engine — sticky scenes, react-scrollama, allow-listed visuals
- visual registry — 2 visuals: `rate-risk-mechanism`, `cashflow-pressure`
- scene schema — manifest JSON → Zod → template registry → StoryLayout
- scroll runtime — react-scrollama, sticky scenes, `onStepEnter` → section ID
- data renderers — custom canvas drawing functions (`draw-field.ts`, `draw-apps.ts`, `frame.ts`, `cutoff-frame.ts`)
- current "When Rates Rise" — single-canvas scroll-scrubbed film
- tests — Vitest, Playwright + axe, Zod validation
- cue-table.ts — existing timeline/cue system
- Story Grammar — reveal, transform, compare, filter, accumulate, trace, highlight, annotate, zoom, split
- atmosphere system — 5 motif types with registry
- 4 stories total — when-rates-rise, where-should-the-cutoff-sit, where-should-the-recovery-time-sit, rates-and-defaults (the rail story was withdrawn 2026-09-30)

### PHASE 1 — REAL RIVE RENDERING (1-2 days)

1. `npm install @rive-app/react-canvas`
2. Create a test illustration in the [Rive editor](https://rive.app) — a simple mechanism with 2-3 states and a trigger input
3. Export as `.riv` file, place in `public/illustrations/`
4. Create a React component using `useRive()` + `useStateMachineInput()`
5. Mount it inside a Next.js page route alongside an existing canvas visual

**STOP AT GATE 1.** The browser must visibly render a real Rive illustration through the application, coexisting with existing canvas visuals.

### PHASE 2 — THE HARDEST TRANSITION (3-5 days)

Build ONE scene that proves the core novelty. This combines the v2 Gates 2 and 3 into a single proof:

1. Add a camera container with CSS transform support
2. Add an Entity Map (simple `Map<string, Entity>`)
3. Add anchor retrieval from the existing canvas data visual (track entity positions during draw)
4. Add anchor retrieval from the Rive illustration (artboard entity positions)
5. Build the transition: data entity → camera focus → Rive illustration → mechanism → camera pullback → data entity

**STOP AT GATE 2.** The viewer must understand that the illustration represents the same entity previously shown in the data.

### PHASE 3 — FLAGSHIP STORY (1-2 weeks)

Design and build the new flagship story (Section 16). Use the existing manifest system, cue-table, grammar primitives, and atmosphere motifs. Add infrastructure only as the story demands:
- Need a new grammar primitive? Add it to the grammar layer.
- Need camera movement? Extend the cue-table to drive CSS transforms.
- Need entity tracking? Add entries to the Entity Map.
- Need a second Rive illustration? Mount another `useRive()` instance.
- Need supporting annotations? Add SVG elements with Framer Motion.
- Need the hand-drawn aesthetic for one scene? Add AniDoodle as an optional layer.

**STOP AND REVIEW THE STORY EXPERIENCE.**

### PHASE 4 — REGRESSION (2-3 days)

Verify:
- Existing routes (`/stories`, `/stories/when-rates-rise/film`, `/stories/where-should-the-cutoff-sit/film`, `/stories/how-much-fast-reserve/film`)
- Existing stories render correctly through the new architecture
- Data correctness (sim output matches frozen evidence)
- `npm run validate:stories`
- `npm run test:unit`
- `npm run build`
- `npm run test:e2e`
- `npm run lint`

Do not declare success if the existing application has regressed.

### PHASE 5 — POLISH (2-3 days)

Only now optimize:
- Performance (scroll handling, React renders, Rive instance management)
- Responsive behaviour (one path across breakpoints, Rive resize handling)
- Reduced motion (focal cuts, final states, synchronized text)
- Transitions (smoothness, timing, easing)
- Visual consistency (color tokens, typography, Rive artboard matching)
- Loading (Rive loads instantly; ensure data visuals don't block)

### PHASE 6 — DOCUMENTATION (1 day)

Only after the implementation works:
- Update ARCHITECTURE.md with new layers (Visual Director, Camera, Entity Map, Rive integration)
- Update README
- Document story authoring (how to add a story with Rive illustrations)
- Document visual primitives
- Document Rive integration (how to create .riv files, how to wire state machine inputs)
- Document AniDoodle as optional (when to use it, how to integrate)

Documentation is the final phase, not the first.

---

## 22. HARD NON-GOALS

Do NOT:
- Use illustrations (Rive, AniDoodle, SVG) for quantitative visualization
- Replace existing canvas drawing functions with illustrations
- Force illustration animation to follow scroll universally
- Assume every visual is scrubbed
- Build a giant animation abstraction before proving one scene
- Rewrite the repository unnecessarily
- Build the autonomous AI story generator
- Optimize around the existing story's scene structure
- Create decorative animation without narrative purpose
- Spend the implementation primarily editing skills/documentation
- Claim integration based on documentation alone
- Build the particle engine before the first story needs it
- Build a diagram engine before the first story needs it
- Build a full Visual Adapter contract (Rive is a React component, not an adapter)
- Build a Compositor system (CSS stacking suffices)
- Build a Camera System with per-adapter mapping (one CSS transform suffices)
- Mount/unmount Rive instances with a keep-alive pool (Rive loads instantly)
- Use AniDoodle where Rive would suffice (AniDoodle is optional, for hand-drawn aesthetic only)
- Use AniDoodle for quantitative visualization
- Replace existing data renderers

---

## 23. FAILURE SIGNALS

Stop and reassess if the agent starts doing any of the following before the technical gates are complete:

- "Let's update the storytelling skills."
- "Let's document the architecture."
- "Let's create an AniDoodle-inspired component."
- "Let's recreate this character using SVG."
- "Let's make scrollProgress control everything."
- "Let's rewrite the entire scene architecture."
- "Let's build the particle engine."
- "Let's build the diagram engine."
- "Let's build a full Visual Adapter contract."
- "Let's build a Compositor system."
- "Let's build a Camera System with per-adapter mapping."
- "Let's use AniDoodle for this scene" (unless the hand-drawn aesthetic is specifically required)
- "Let's build infrastructure before proving the transition."
- "Let's store entity pixel positions in the Entity Map." (Entity Map owns identity, renderer owns geometry)

These are signs that the implementation is drifting away from the objective.

---

## 24. CREATIVE QUALITY BAR

The final system should make possible stories that feel:
- cinematic
- intelligent
- visually coherent
- evidence-driven
- surprising
- restrained
- explanatory
- memorable

The objective is not maximum animation. The objective is maximum understanding per visual transition.

A spectacular animation that does not improve understanding is unnecessary.

A simple illustration that suddenly makes a mechanism obvious is extremely valuable.

---

## 25. FINAL DEFINITION OF SUCCESS

Success is NOT: «Rive has been integrated.»

Success is: «The storytelling runtime can move a reader through different representations of an idea while preserving identity, spatial continuity, narrative meaning and evidence.»

A successful story may look conceptually like:

```
                     STORY QUESTION
                           │
                           ▼
                      DATA WORLD
                           │
                           ▼
                    QUANTITATIVE VIEW
                           │
                           ▼
                      FOCUS ENTITY
                           │
                           ▼
                     CAMERA MOVE
                           │
                           ▼
                    RIVE ILLUSTRATION
                           │
                     mechanism
                           │
                           ▼
                    CAMERA PULLBACK
                           │
                           ▼
                      DATA WORLD
                           │
                           ▼
                   QUANTITATIVE EVIDENCE
                           │
                           ▼
                         INSIGHT
```

But the exact sequence should emerge from the story.

---

## 26. THE CENTRAL PRINCIPLE

Build the medium, not the page.

The runtime should understand:

| Concept | What it means |
|---|---|
| IDENTITY | Entity Map — semantic identity across representations |
| STATE | Visual control modes — Rive state machines, data visual parameters, SVG animation controls |
| TIME | Story Timeline — extends cue-table.ts; scroll is one navigation input |
| SPACE | Camera + anchors — CSS transform on container, viewport-space anchors |
| CAMERA | CSS transform — connects scales, communicates hierarchy |
| REPRESENTATION | Visual layers — canvas data viz, Rive illustrations, SVG annotations, optional AniDoodle |
| EVENTS | Rive triggers, Framer Motion controls, cue-table thresholds |

Scroll is one way of navigating time.

Rive is one way of representing things.

Canvas drawing functions are one way of representing quantitative evidence.

SVG is one way of representing annotations and diagrams.

AniDoodle is one way of representing hand-drawn illustrations (optional, rare).

The Visual Director coordinates them.

The camera connects scales.

The entity protocol preserves continuity.

The story gives everything meaning.

Do not build a collection of visual effects.

Build a system capable of telling better stories.

---

## APPENDIX A: RIVE API REFERENCE (VERIFIED)

### Installation

```bash
npm install @rive-app/react-canvas
```

### React hooks

```tsx
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";
```

### Mount a Rive animation

```tsx
const { rive, RiveComponent } = useRive({
  src: "/illustrations/mechanism.riv",  // .riv file path or URL
  stateMachine: "Main",                 // state machine name
  autoplay: true,                       // auto-play on load
});

return <RiveComponent style={{ width: "100%", height: "100%" }} />;
```

### Control state machine inputs

```tsx
// Get a reference to an input
const progressInput = useStateMachineInput(rive, "Main", "progress");

// Set number input (continuous)
useEffect(() => {
  if (progressInput) progressInput.value = scrollProgress;
}, [progressInput, scrollProgress]);

// Set boolean input (state)
const shockedInput = useStateMachineInput(rive, "Main", "shocked");
useEffect(() => {
  if (shockedInput) shockedInput.value = isShocked;
}, [shockedInput, isShocked]);

// Fire trigger (event)
const enterInput = useStateMachineInput(rive, "Main", "enter");
useEffect(() => {
  if (shouldEnter && enterInput) enterInput.fire();
}, [shouldEnter, enterInput]);
```

### Nested component inputs

```tsx
// Set number input on a nested component
rive?.setNumberStateAtPath("volume", 80.0, "Volume Component");

// Set boolean input on a nested component
rive?.setBooleanStateAtPath("active", true, "Mechanism/Valve");

// Fire trigger on a nested component
rive?.fireStateAtPath("open", "Mechanism/Valve");
```

### Playback control

```tsx
rive?.play();    // resume from pause
rive?.pause();   // pause, last frame visible
rive?.stop();    // stop, restart from entry state on next play
```

### Lifecycle

```tsx
const { rive, RiveComponent } = useRive({
  src: "/illustrations/mechanism.riv",
  stateMachine: "Main",
  autoplay: true,
  onRiveReady: (riveInstance) => {
    // Called once the .riv file is loaded and initialized
    // Use for pre-render data binding
  },
});

// Cleanup is automatic on unmount via the React runtime
// For manual cleanup when using the Web JS runtime:
// rive.cleanup();
```

### Rendering

- Default: WebGL via canvas (`@rive-app/react-canvas`)
- Multiple instances share one offscreen WebGL context (default `useOffscreenRenderer: true`)
- Canvas element is managed by the React runtime
- DPR-aware: `useDevicePixelRatio` defaults to `true`
- Resize: `resizeDrawingSurfaceToCanvas()` called automatically by `RiveComponent`

### File format

- `.riv` — binary, compressed, KB-size
- Created in the [Rive editor](https://rive.app) (free, browser-based)
- Contains artboards, animations, state machines, inputs
- Can be fetched from URL or imported as a local file

### Performance

- Load: instant (no baking, no pre-processing)
- Memory: small (KB-size file; shared WebGL context for multiple instances)
- Frame rate: 60fps (state machine advances per frame)
- Settling: state machine stops advancing when idle (no active transitions or animations)
- `useRiveFile`: reuse a parsed `.riv` file across components to avoid redundant fetch/parse

### RiveComponent props

```ts
interface RiveProps {
  src: string;                          // .riv file URL or path
  artboard?: string;                    // artboard name
  stateMachine?: string;               // state machine name
  layout?: Layout;                      // fit behavior
  useOffscreenRenderer?: boolean;       // share WebGL context (default: true)
  shouldDisableRiveListeners?: boolean; // disable pointer event listeners
  shouldResizeCanvasToContainer?: boolean;
  enableGPUCanvas?: boolean;            // experimental: 3D and shaders
}
```

---

## APPENDIX B: EXISTING REPO ARCHITECTURE REFERENCE

### Technology stack

- Next.js 16, React 19, TypeScript, Tailwind CSS 3
- Orbit-parity OKLCH tokens
- `framer-motion` (non-essential transitions — now also used for SVG layer)
- `react-scrollama` (step enter)
- Zod (manifest validation)
- Vitest (unit tests), Playwright + axe (E2E)
- `@rive-app/react-canvas` (NEW — illustration engine)

### Key paths

| Path | Role |
|---|---|
| `src/stories/manifests/` | Decision story content and scene configuration |
| `src/stories/schemas/` | Zod schema and per-visual state allowlist |
| `src/stories/templates/` | Template ID → layout configuration |
| `src/lib/sim/` | Deterministic models feeding stories |
| `src/lib/loadStory.ts` | Parse and registry check |
| `src/lib/resolveScene.ts` | Scene resolution logic |
| `src/lib/prefers-reduced-motion.ts` | Reduced motion detection |
| `src/components/storytelling/` | Reusable scene components |
| `src/components/storytelling/visuals/` | Existing visual panels (canvas-based) |
| `src/components/storytelling/grammar/` | Story grammar (spine, mark field, stage map) |
| `src/components/storytelling/atmosphere/` | Ambient motifs (5 types with registry) |
| `src/components/film/` | Film implementation (canvas drawing functions) |
| `src/components/film/draw-*.ts` | Canvas drawing functions |
| `src/components/film/frame.ts` | Frame rendering |
| `src/components/film/cue-table.ts` | Timeline/cue system |
| `data/figures/*.json` | Frozen evidence packs |

### Existing stories

| Story | Route | Status |
|---|---|---|
| When Rates Rise | `/stories/when-rates-rise/film` | Reference |
| Where Should the Cut-Off Sit | `/stories/where-should-the-cutoff-sit/film` | Active |
| Rates and Defaults | (manifest only) | Active |

### Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Local server |
| `npm run build` | Production build |
| `npm run validate:stories` | Zod validate + allowlist/grammar parity |
| `npm run test:unit` | Vitest (sim, resolveScene, schema) |
| `npm run test:e2e` | Playwright + axe, port 3100 |
| `npm run test:engine` | Validation + unit + build + e2e |
| `npm run lint` | ESLint |
| `npm run freeze:evidence` | Write evidence JSON |

### Existing Story Grammar primitives

`reveal`, `transform`, `compare`, `filter`, `accumulate`, `trace`, `highlight`, `annotate`, `zoom`, `split`

These overlap with the spec's cinematic primitives (Section 14). Extend these, don't create parallel systems.

---

## APPENDIX C: ANIDOODLE AS OPTIONAL ENGINE

AniDoodle is retained as an optional illustration engine for scenes that specifically require:
- The hand-drawn, organic aesthetic (31 built-in styles)
- Pure frame-by-frame deterministic scrubbing (`renderFrame(frame, env)`)
- Code-drawn reproducibility (source code IS the illustration)

### When to use AniDoodle

- A specific story scene calls for a hand-drawn illustration style that Rive cannot achieve
- A scene requires reverse-scrubbing animation frame-by-frame (Rive's state machine can't do this)
- The "no external assets, source-code-only" philosophy is important for a specific piece

### When NOT to use AniDoodle

- For most illustrated mechanisms (Rive's state machines are better suited)
- For characters or objects that need multiple states and transitions (Rive's state machines are purpose-built for this)
- For any scene where baking latency (~2s) or memory (~35MB) would be a problem
- For any scene where the hand-drawn aesthetic is not specifically required

### Integration (if needed)

If AniDoodle is needed for a specific scene, integrate it as an optional canvas layer:

```tsx
// AniDoodle layer — only mounted when a scene requires it
function AniDoodleLayer({ pieceName, mode, progress, triggers }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    // Import AniDoodle engine and mount
    import("@anidoodle/engine").then(({ mount, pieces }) => {
      const piece = pieces[pieceName];
      instanceRef.current = mount(canvasRef.current, piece, {});
    });
    return () => instanceRef.current?.destroy();
  }, [pieceName]);

  // For film mode: call renderFrame with progress
  // For interactive mode: use triggers via setState
  // See v2 spec Section 10 for full AniDoodle adapter details

  return <canvas ref={canvasRef} style={{ position: "absolute", zIndex: 4 }} />;
}
```

### AniDoodle limitations (if used)

- Baking: ~2 seconds at DPR 2 before canvas appears
- Memory: ~35MB per piece at scale 1.5 (budget 2-3 simultaneous)
- Two modes: film (`renderFrame`) for scrubbed, interactive (`mount()`) for triggered
- Log compaction needed for reverse navigation in interactive mode
- Determinism constraints: no gradients on shared surfaces, CPU rasterization for hashing

These complexities are acceptable for rare, specific hand-drawn scenes. They are not acceptable as the primary illustration engine.

---

## APPENDIX D: CHANGELOG FROM v2

| Section | Change | Reason |
|---|---|---|
| Preamble | Complete rewrite; Rive replaces AniDoodle as primary engine | Rive renders to canvas (compatible), has state machines (maps to control modes), loads instantly (no baking), uses minimal memory, has visual editor workflow |
| 1. Product Vision | Updated engine assignments: Rive for illustrations, SVG+Framer Motion for diagrams/annotations, AniDoodle optional | Matches actual technology choices |
| 4. Core Architecture | Simplified: no Compositor, no per-adapter camera mapping, no full adapter contract; layers are React components | Rive is a React component with hooks; CSS stacking suffices |
| 5. Story Timeline | Extends existing cue-table.ts; Rive driven by number inputs and triggers | Existing timeline system already exists |
| 6. Visual Control Modes | Maps to Rive state machine patterns instead of AniDoodle modes | Rive's unified model covers all modes |
| 7. Camera | CSS transform on container; no per-adapter mapping | All canvas layers share one container |
| 8. Entity Protocol | Simplified to Entity Map (not full Registry) | Simple Map suffices for first stories |
| 9. Anchor Protocol | Canvas-space coordinates (all canvas); no coordinate bridge | Existing visuals and Rive both render to canvas |
| 10. Visual Layers (was Visual Adapter) | Replaced full adapter contract with React components per layer | Rive is hooks-based; no adapter needed |
| 11. Temporal Determinism | Rive state machine reset for reverse navigation; no log compaction | Rive state machines are reset-able |
| 12-13. Gates | Merged Gates 2+3 into single "hardest transition" proof; Gate 1 is now Rive rendering | Faster, proves core novelty first |
| 14. Cinematic Primitives | Notes that these extend existing Story Grammar, not parallel system | Existing grammar already has zoom, trace, split, etc. |
| 19. Performance | Updated: Rive loads instantly, small files, shared WebGL context | No baking latency, no memory budgeting |
| 20. Testing | Updated: Rive-specific tests replace AniDoodle-specific tests | Different engine, different test concerns |
| 21. Implementation Order | Reduced from 10 phases to 6; story-first approach | Eliminates infrastructure phases; story drives infrastructure |
| 22. Hard Non-Goals | Added: no full adapter contract, no Compositor, no per-adapter camera, no keep-alive pool | These are unnecessary with Rive |
| 23. Failure Signals | Added: no AniDoodle where Rive suffices, no infrastructure before transition proof | Prevents drift |
| Appendices | A: Rive API reference; B: existing repo reference; C: AniDoodle as optional; D: changelog | Implementation-ready reference material |
