/**
 * The AI field card's character: a small hovering robot, as a Rive file.
 *
 * Unlike the household and the grid it carries no evidence. It is chrome for a
 * field card, so nothing here is modelled, and nothing is read off it.
 *
 * It is also the first illustration written against the view model instead of
 * state-machine inputs, and the one that uses the writer's newer grammar:
 *   - curved, morphing contours: the eyes change shape between moods, and the
 *     state machine's mix blends the vertices, so a mood change is a morph;
 *   - gradients for volume and glow (the canvas runtime ignores feathering);
 *   - a 1D blend by `energy`, and by `lookX` / `lookY`, so a number moves it
 *     continuously rather than flipping it between two poses;
 *   - listeners, so it reacts to a pointer with no host code: hover perks it
 *     up and the eyes follow the pointer, a press makes it hop and wave;
 *   - state actions that write back what it is doing (`showing`, `reacting`),
 *     which replace the runtime's deprecated state-change events;
 *   - a speech bubble, a text run bound to a string, in a subset of Inter;
 *   - a two-bone arm, so the wave bends at the elbow. The rest of the body
 *     stays rigid groups.
 *
 * It arrives with the bubble, and a tap tucks it into the lower right; a
 * second tap brings it back. The bubble font is a subset of Inter
 * (src/illustrations/fonts, SIL OFL): ASCII plus a few punctuation marks.
 * Anything else has no glyph.
 */

import { ArtboardBuilder, type AnimationBuilder, type Key, type ShapeHandles } from "@/lib/rive/artboard-builder";
import { mapContour, parsePath, roundedRect, translateContour, type Contour } from "@/lib/rive/path-data";
import { argb } from "@/lib/rive/riv-writer";

export const ROBOT_MODES = ["idle", "thinking", "speaking", "happy"] as const;
export type RobotMode = (typeof ROBOT_MODES)[number];

export const ROBOT = {
  name: "Robot",
  stateMachine: "Robot",
  viewModel: "Robot",
  width: 400,
  height: 400,
  props: {
    /** Enum, one of `ROBOT_MODES`. The eyes, the chest and the speaker change with it. */
    mode: "mode",
    /** Number 0–100: how brightly it glows. Blended, so any value in between works. */
    energy: "energy",
    /** Numbers −1…1: where it looks, for a director pointing it at something on the page. */
    lookX: "lookX",
    lookY: "lookY",
    /** Boolean. The file's own pointer listeners set it; a host may too. */
    hover: "hover",
    /** Trigger: a hop and a wave. A press on the robot fires it. */
    poke: "poke",
    /** Colour of the eyes, the chest light and the speaker, so a field card can tint it. */
    accent: "accent",
    /** Written by the machine: the mode whose state is playing. */
    showing: "showing",
    /** Written by the machine: true while the hop plays. */
    reacting: "reacting",
    /** String. Replaces the first bubble line. The rest of the rotation is baked in. */
    line: "line",
    /** Written by the machine, and not one of `reports`: arriving, present, tucking, parked, returning. */
    presence: "presence",
    /** Trigger. Skips the arrival, for reduced motion. A held boolean would cancel a later tuck. */
    settle: "settle",
  },
  /** Enums the machine writes, for a host to read back as states. `presence` is read on its own. */
  reports: ["showing"],
  defaults: {
    mode: "idle" as RobotMode,
    energy: 60,
    line: "This card is when to hand a step to AI, and when to keep it.",
  },
} as const;

/**
 * What the bubble says, in order, while the robot is out. Each line is a
 * judgement about handing work to AI, not a measured result. The first one is
 * also the `line` default, so a card can replace the opener.
 */
export const ROBOT_LINES = [
  ROBOT.defaults.line,
  "Hand it over when you do it often and a miss is easy to catch.",
  "Keep the step when you cannot tell a good answer from a bad one.",
  "A model can be wrong. Leave a person on the check.",
  "One prompt should not run the whole job. Split it into steps.",
  "Tap me and I'll wait in the corner.",
] as const;

/**
 * Homepage field-card colours, sRGB from the site's neon tokens. The accent
 * starts as the AI card's cyan; the antenna keeps the site violet.
 */
export const ROBOT_ACCENTS = [
  { id: "ai", label: "AI", rgb: [0, 210, 211] },
  { id: "delivery", label: "Delivery", rgb: [157, 91, 244] },
  { id: "analytics", label: "Analytics", rgb: [57, 134, 228] },
  { id: "credit", label: "Credit risk", rgb: [240, 166, 70] },
] as const;

const CYAN = ROBOT_ACCENTS[0].rgb;
const VIOLET = ROBOT_ACCENTS[1].rgb;
const cyan = (a = 1) => argb(...CYAN, a);
const violet = (a = 1) => argb(...VIOLET, a);
const white = (a = 1) => argb(255, 255, 255, a);
const ink = (r: number, g: number, b: number, a = 1) => argb(r, g, b, a);

/* Geometry, artboard units. Pivots sit where the part would hinge. */
const CX = 200;
const FEET_Y = 318;
const BODY_Y = -58;
const NECK_Y = -106;
const HEAD_Y = -62;
const EYE_X = 30;
const EYE_Y = -4;
const BAR_X = [-24, -12, 0, 12, 24];
const BAR_Y = 27;

/* Eye poses. Every pose has eight cubic vertices, so any two morph into each other. */
const EYE = {
  open: roundedRect(22, 34, 11),
  speaking: roundedRect(22, 28, 11),
  thinking: translateContour(roundedRect(20, 20, 10), 0, -3),
  /** A shallow ∩: the rounded bar bent down at its ends. */
  happy: mapContour(roundedRect(28, 7, 3.5), (x, y) => [x, y + 0.075 * x * x - 5]),
} satisfies Record<string, Contour>;

export function robotEyePose(mode: RobotMode): Contour {
  return mode === "idle" ? EYE.open : EYE[mode];
}

/** A deterministic flicker: the same file every build. */
function flicker(seed: number, frames: number, step: number, lo: number, hi: number): Key[] {
  const keys: Key[] = [];
  for (let f = 0; f <= frames; f += step) {
    const n = Math.sin((f + 1) * 12.9898 + seed * 78.233) * 43758.5453;
    const r = n - Math.floor(n);
    keys.push([f, Math.round((lo + (hi - lo) * r) * 1000) / 1000]);
  }
  keys[keys.length - 1] = [frames, keys[0][1]];
  return keys;
}

export function buildRobot(font: Uint8Array): Uint8Array {
  const ab = new ArtboardBuilder(ROBOT.name, ROBOT.width, ROBOT.height);
  ab.addFont("Inter", font);
  const vm = ab.viewModel(ROBOT.viewModel);
  const P = ROBOT.props;
  const mode = vm.enum(P.mode, ROBOT_MODES, ROBOT.defaults.mode);
  const energy = vm.number(P.energy, ROBOT.defaults.energy);
  const lookX = vm.number(P.lookX, 0);
  const lookY = vm.number(P.lookY, 0);
  const hover = vm.boolean(P.hover, false);
  const poke = vm.trigger(P.poke);
  const accent = vm.color(P.accent, cyan());
  const showing = vm.enum(P.showing, ROBOT_MODES, ROBOT.defaults.mode);
  const reacting = vm.boolean(P.reacting, false);
  const line = vm.string(P.line, ROBOT.defaults.line);
  const presence = vm.enum(P.presence, ["arriving", "present", "tucking", "parked", "returning"], "arriving");
  const settle = vm.trigger(P.settle);

  const ease = ab.cubic(0.42, 0, 0.58, 1);
  const out = ab.cubic(0.16, 1, 0.3, 1);
  const inQuad = ab.cubic(0.5, 0, 0.9, 0.5);
  const spring = ab.elastic("out", 1, 0.35);

  /* ---- rig ---------------------------------------------------------- */
  const gazeOrigin = ab.group({ name: "gaze origin", x: CX, y: FEET_Y + NECK_Y + HEAD_Y });
  const gazeTarget = ab.group({ name: "gaze target", x: 0, y: 0, parent: gazeOrigin });
  const float = ab.group({ name: "float", x: CX, y: 0 });
  const hop = ab.group({ name: "hop", x: 0, y: FEET_Y, parent: float });
  const body = ab.group({ name: "body", x: 0, y: BODY_Y, parent: hop });
  const shoulderL = ab.group({ name: "shoulder L", x: -56, y: -30, parent: body });
  const shoulderR = ab.group({ name: "shoulder R", x: 56, y: -30, parent: body });
  // +x is the bone axis. π/2 points the right arm down; the wave keys these rotations.
  const DOWN = Math.PI / 2;
  const upperR = ab.rootBone({ name: "upper arm R", x: 0, y: 0, parent: shoulderR, length: 42, rotation: DOWN });
  const foreR = ab.bone({ name: "forearm R", parent: upperR, length: 18 });
  const neck = ab.group({ name: "neck", x: 0, y: NECK_Y, parent: hop });
  const head = ab.group({ name: "head", x: 0, y: HEAD_Y, parent: neck });
  const antenna = ab.group({ name: "antenna", x: 0, y: -64, parent: head });
  const bulb = ab.group({ name: "bulb", x: 0, y: -30, parent: antenna });
  const sheen = ab.group({ name: "sheen", x: -150, y: 0, parent: head });
  const gaze = ab.group({ name: "gaze", x: 0, y: 0, parent: head });
  const eyes = [-1, 1].map((side) => {
    const place = ab.group({ name: `eye ${side < 0 ? "L" : "R"}`, x: side * EYE_X, y: EYE_Y, parent: gaze });
    const pop = ab.group({ name: `eye ${side < 0 ? "L" : "R"} pop`, x: 0, y: 0, parent: place });
    const lid = ab.group({ name: `eye ${side < 0 ? "L" : "R"} lid`, x: 0, y: 0, parent: pop });
    return { place, pop, lid };
  });

  /* ---- drawing, back to front -------------------------------------- */
  const shadow = ab.ellipse({
    name: "shadow",
    x: 0,
    y: 358,
    parent: float,
    width: 170,
    height: 26,
    fill: { kind: "radial", from: [0, 0], to: [85, 0], stops: [[0, ink(0, 0, 0, 0.6)], [1, ink(0, 0, 0, 0)]] },
  });
  const thrust = ab.ellipse({
    name: "thrust",
    x: 0,
    y: 18,
    parent: hop,
    width: 64,
    height: 54,
    blend: "screen",
    fill: { kind: "radial", from: [0, -8], to: [0, 24], stops: [[0, cyan(0.9)], [0.45, cyan(0.35)], [1, cyan(0)]] },
  });

  const armPaint = {
    fill: { kind: "linear" as const, from: [0, -4] as [number, number], to: [0, 44] as [number, number], stops: [[0, ink(52, 62, 96)], [1, ink(18, 22, 40)]] as Array<[number, number]> },
    stroke: { color: white(0.28), thickness: 1.5 },
  };
  const handPaint = {
    width: 20,
    height: 20,
    fill: { kind: "radial" as const, from: [-3, -4] as [number, number], to: [8, 6] as [number, number], stops: [[0, ink(74, 86, 128)], [1, ink(20, 24, 44)]] as Array<[number, number]> },
    stroke: { color: violet(0.55), thickness: 1.5 },
  };
  ab.path({
    name: "arm L",
    x: 0,
    y: 0,
    parent: shoulderL,
    contours: parsePath("M 7 -4 C 9 14 8 30 4 40 L -10 40 C -12 28 -10 12 -8 -4 Z"),
    ...armPaint,
  });
  // The right cuff is the upper bone (length 42) plus the hand 16 along the forearm.
  // This piece is that same forearm, mirrored, so the two hands hang level.
  ab.path({
    name: "forearm L",
    x: 0,
    y: 0,
    parent: shoulderL,
    contours: parsePath("M -6 42 C -7 46 -6 54 -4 58 L 4 58 C 6 54 7 46 6 42 Z"),
    fill: { kind: "linear", from: [0, 42], to: [0, 58], stops: [[0, ink(48, 58, 92)], [1, ink(16, 20, 38)]] },
    stroke: armPaint.stroke,
  });
  ab.ellipse({ name: "hand L", x: 0, y: 58, parent: shoulderL, ...handPaint });
  // The right arm is drawn along the bone's +x, which rotation π/2 aims downward.
  ab.path({
    name: "arm R",
    x: 0,
    y: 0,
    parent: upperR,
    contours: parsePath("M -4 7 C 14 9 30 8 40 4 L 40 -10 C 28 -12 12 -10 -4 -8 Z"),
    fill: { kind: "linear", from: [0, 0], to: [42, 0], stops: [[0, ink(52, 62, 96)], [1, ink(18, 22, 40)]] },
    stroke: armPaint.stroke,
  });
  ab.path({
    name: "forearm R",
    x: 0,
    y: 0,
    parent: foreR,
    contours: parsePath("M 0 -6 C 4 -7 12 -6 16 -4 L 16 4 C 12 6 4 7 0 6 Z"),
    fill: { kind: "linear", from: [0, 0], to: [16, 0], stops: [[0, ink(48, 58, 92)], [1, ink(16, 20, 38)]] },
    stroke: armPaint.stroke,
  });
  ab.ellipse({ name: "hand R", x: 16, y: 0, parent: foreR, ...handPaint });

  ab.polyline({
    name: "nozzle",
    x: 0,
    y: 0,
    parent: hop,
    points: [[-20, -12], [20, -12], [13, 0], [-13, 0]],
    closed: true,
    fill: ink(14, 18, 34),
    stroke: { color: white(0.25), thickness: 1.5 },
  });

  ab.path({
    name: "torso",
    x: 0,
    y: 0,
    parent: body,
    contours: parsePath("M -54 -40 C -54 -50 -46 -54 -36 -54 L 36 -54 C 46 -54 54 -50 54 -40 L 46 28 C 44 40 36 46 24 46 L -24 46 C -36 46 -44 40 -46 28 Z"),
    fill: { kind: "linear", from: [0, -54], to: [0, 46], stops: [[0, ink(58, 70, 108)], [0.55, ink(30, 36, 62)], [1, ink(14, 17, 32)]] },
    stroke: {
      color: { kind: "linear", from: [-54, -54], to: [54, 46], stops: [[0, white(0.55)], [0.6, white(0.15)], [1, violet(0.6)]] },
      thickness: 2,
    },
  });
  ab.path({
    name: "torso rim",
    x: 0,
    y: 0,
    parent: body,
    contours: parsePath("M -40 -47 C -20 -50 20 -50 40 -47"),
    stroke: { color: white(0.28), thickness: 3 },
  });
  for (const [i, y] of [30, 36].entries()) {
    ab.polyline({ name: `vent ${i}`, x: 0, y: 0, parent: body, points: [[-16, y], [16, y]], stroke: { color: white(0.12), thickness: 2 } });
  }

  const coreGlow = ab.ellipse({
    name: "core glow",
    x: 0,
    y: -10,
    parent: body,
    width: 84,
    height: 84,
    blend: "screen",
    fill: { kind: "radial", from: [0, 0], to: [42, 0], stops: [[0, cyan(0.75)], [1, cyan(0)]] },
  });
  ab.ellipse({ name: "core ring", x: 0, y: -10, parent: body, width: 38, height: 38, fill: ink(6, 9, 20), stroke: { color: cyan(0.22), thickness: 3 } });
  const orbit = ab.ellipse({
    name: "core orbit",
    x: 0,
    y: -10,
    parent: body,
    width: 38,
    height: 38,
    stroke: { color: cyan(), thickness: 3, trim: { start: 0, end: 0.16, offset: 0 } },
  });
  const core = ab.ellipse({
    name: "core",
    x: 0,
    y: -10,
    parent: body,
    width: 16,
    height: 16,
    fill: { kind: "radial", from: [0, 0], to: [8, 0], stops: [[0, white()], [0.5, cyan()], [1, cyan(0.2)]] },
  });

  ab.rect({
    name: "neck",
    x: 0,
    y: 0,
    parent: neck,
    width: 30,
    height: 16,
    cornerRadius: 5,
    fill: { kind: "linear", from: [0, -8], to: [0, 8], stops: [[0, ink(20, 24, 44)], [1, ink(40, 48, 78)]] },
  });

  for (const side of [-1, 1] as const) {
    ab.ellipse({
      name: `ear ${side < 0 ? "L" : "R"}`,
      x: side * 92,
      y: 6,
      parent: head,
      width: 20,
      height: 44,
      fill: { kind: "linear", from: [0, -22], to: [0, 22], stops: [[0, ink(54, 64, 100)], [1, ink(18, 22, 40)]] },
      stroke: { color: violet(0.7), thickness: 2 },
    });
    ab.ellipse({ name: `ear light ${side < 0 ? "L" : "R"}`, x: side * 94, y: 6, parent: head, width: 5, height: 16, fill: violet(0.9) });
  }

  ab.polyline({ name: "antenna stem", x: 0, y: 0, parent: antenna, points: [[0, 0], [0, -26]], stroke: { color: white(0.55), thickness: 3 } });
  const bulbGlow = ab.ellipse({
    name: "bulb glow",
    x: 0,
    y: 0,
    parent: bulb,
    width: 46,
    height: 46,
    blend: "screen",
    fill: { kind: "radial", from: [0, 0], to: [23, 0], stops: [[0, violet(0.85)], [1, violet(0)]] },
  });
  const bulbCore = ab.ellipse({
    name: "bulb",
    x: 0,
    y: 0,
    parent: bulb,
    width: 13,
    height: 13,
    fill: { kind: "radial", from: [-2, -2], to: [6, 6], stops: [[0, white()], [1, violet()]] },
  });
  const ping = ab.ellipse({ name: "bulb ping", x: 0, y: 0, parent: bulb, width: 16, height: 16, opacity: 0, stroke: { color: violet(0.9), thickness: 2 } });

  ab.path({
    name: "head shell",
    x: 0,
    y: 0,
    parent: head,
    contours: [roundedRect(176, 128, 48)],
    fill: { kind: "linear", from: [0, -64], to: [0, 64], stops: [[0, ink(66, 78, 120)], [0.5, ink(34, 40, 70)], [1, ink(18, 21, 40)]] },
    stroke: {
      color: { kind: "linear", from: [-88, -64], to: [88, 64], stops: [[0, white(0.65)], [0.55, white(0.18)], [1, violet(0.65)]] },
      thickness: 2,
    },
  });
  ab.ellipse({
    name: "head specular",
    x: -34,
    y: -46,
    parent: head,
    width: 84,
    height: 22,
    fill: { kind: "radial", from: [0, 0], to: [42, 0], stops: [[0, white(0.2)], [1, white(0)]] },
  });

  const visor = ab.path({
    name: "visor",
    x: 0,
    y: 4,
    parent: head,
    contours: [roundedRect(142, 82, 34)],
    fill: { kind: "linear", from: [0, -41], to: [0, 41], stops: [[0, ink(2, 4, 12)], [1, ink(12, 18, 40)]] },
    stroke: { color: cyan(0.3), thickness: 1.5 },
  });
  ab.polyline({
    name: "sheen band",
    x: 0,
    y: 0,
    parent: sheen,
    points: [[-10, -50], [18, -50], [-2, 50], [-30, 50]],
    closed: true,
    fill: { kind: "linear", from: [-30, 0], to: [18, 0], stops: [[0, white(0)], [0.5, white(0.16)], [1, white(0)]] },
  });
  ab.clip(sheen, visor);
  ab.path({
    name: "visor glint",
    x: 0,
    y: 4,
    parent: head,
    contours: parsePath("M -52 -30 C -40 -36 -24 -38 -10 -38"),
    stroke: { color: white(0.14), thickness: 3 },
  });

  const eyeGlows: ShapeHandles[] = [];
  const eyeShapes: ShapeHandles[] = [];
  eyes.forEach((e, i) => {
    eyeGlows.push(
      ab.ellipse({
        name: `eye glow ${i}`,
        x: 0,
        y: 0,
        parent: e.lid,
        width: 70,
        height: 70,
        blend: "screen",
        fill: { kind: "radial", from: [0, 0], to: [35, 0], stops: [[0, cyan()], [1, cyan(0)]] },
        opacity: 0.5,
      }),
    );
    eyeShapes.push(ab.path({ name: `eye ${i}`, x: 0, y: 0, parent: e.lid, contours: [EYE.open], cubic: true, fill: cyan() }));
  });

  const bars = BAR_X.map((x, i) =>
    ab.rect({ name: `bar ${i}`, x, y: BAR_Y, parent: head, width: 6, height: 4, cornerRadius: 3, fill: cyan(), opacity: 0.3 }),
  );

  // Beside the head, clear of the antenna and the eyes. It rides `float`, so the tuck takes it along.
  const bubble = ab.group({ name: "bubble", x: -108, y: 68, parent: float, opacity: 0 });
  ab.rect({
    name: "bubble panel",
    x: 0,
    y: 0,
    parent: bubble,
    width: 168,
    height: 84,
    cornerRadius: 16,
    fill: ink(8, 14, 28, 0.94),
    stroke: { color: cyan(0.9), thickness: 1.5 },
  });
  const said = ROBOT_LINES.map((words, i) =>
    ab.text({
      name: `bubble line ${i}`,
      x: -76,
      y: -32,
      parent: bubble,
      width: 152,
      text: words,
      fontSize: 13,
      color: argb(227, 232, 242),
      align: "center",
      opacity: i === 0 ? 1 : 0,
    }),
  );
  ab.bind(said[0].run, "text", line);

  // Invisible, and parented to the rig so a tap still lands once it has shrunk into the corner.
  const touch = ab.rect({ name: "touch", x: 0, y: 196, parent: float, width: 250, height: 330, cornerRadius: 60, fill: argb(0, 0, 0, 0) });

  /* ---- colour, bound straight to the view model -------------------- */
  for (const s of eyeShapes) ab.bind(s.fillColor!, "color", accent);
  for (const g of eyeGlows) ab.bind(g.fillStops![0], "color", accent);
  for (const b of bars) ab.bind(b.fillColor!, "color", accent);
  ab.bind(orbit.strokeColor!, "color", accent);
  ab.bind(core.fillStops![1], "color", accent);

  /* ---- animations ---------------------------------------------------- */
  const eyeContours = eyeShapes.map((s) => s.contours![0]);
  const lids = eyes.map((e) => e.lid);
  const pops = eyes.map((e) => e.pop);

  // Alive: bob, follow-through, sway, breath of light, and blinks at uneven times.
  const LOOP_F = 360;
  const alive = ab.animation("alive", LOOP_F, "loop");
  alive.key(float, "y", [[0, 0, ease], [90, -8, ease], [180, 0, ease], [270, -8, ease], [360, 0]]);
  alive.key(head, "y", [[0, HEAD_Y, ease], [104, HEAD_Y - 2.5, ease], [194, HEAD_Y, ease], [284, HEAD_Y - 2.5, ease], [360, HEAD_Y]]);
  alive.key(shoulderL, "rotation", [[0, 0.03, ease], [110, -0.05, ease], [200, 0.03, ease], [290, -0.05, ease], [360, 0.03]]);
  alive.key(shoulderR, "rotation", [[0, -0.03, ease], [110, 0.05, ease], [200, -0.03, ease], [290, 0.05, ease], [360, -0.03]]);
  for (const axis of ["scaleX", "scaleY"] as const) {
    alive.key(shadow.shape, axis, [[0, 1, ease], [90, 0.84, ease], [180, 1, ease], [270, 0.84, ease], [360, 1]]);
  }
  alive.key(shadow.shape, "opacity", [[0, 1, ease], [90, 0.7, ease], [180, 1, ease], [270, 0.7, ease], [360, 1]]);
  alive.key(thrust.shape, "opacity", flicker(1, LOOP_F, 6, 0.6, 1));
  alive.key(thrust.shape, "scaleY", flicker(2, LOOP_F, 8, 0.85, 1.15));
  alive.key(bulbGlow.shape, "opacity", [[0, 0.55, ease], [60, 1, ease], [120, 0.55, ease], [180, 1, ease], [240, 0.55, ease], [300, 1, ease], [360, 0.55]]);
  const blink: Key[] = [
    [0, 1, "hold"],
    [112, 1, inQuad],
    [118, 0.08, out],
    [128, 1, "hold"],
    [270, 1, inQuad],
    [275, 0.08, out],
    [284, 1, inQuad],
    [289, 0.08, out],
    [299, 1, "hold"],
    [360, 1],
  ];
  for (const lid of lids) alive.key(lid, "scaleY", blink);

  // Mode: eye shape, chest orbit and speaker bars.
  const moodAnimation = (m: RobotMode): AnimationBuilder => {
    const frames = m === "thinking" ? 120 : m === "speaking" ? 96 : 360;
    const a = ab.animation(`mode ${m}`, frames, "loop");
    const pose = robotEyePose(m);
    for (const c of eyeContours) {
      if (m === "thinking") {
        a.morph(c, [
          [0, translateContour(pose, -3, 0), ease],
          [60, translateContour(pose, 3, 0), ease],
          [120, translateContour(pose, -3, 0)],
        ]);
      } else {
        a.morph(c, [[0, pose]]);
      }
    }
    const orbitEnd = { idle: 0.16, thinking: 0.34, speaking: 0.22, happy: 1 }[m];
    a.key(orbit.trim!, "trimEnd", [[0, orbitEnd]]);
    a.key(orbit.trim!, "trimOffset", m === "happy" ? [[0, 0]] : [[0, 0], [frames, m === "thinking" ? 1 : m === "speaking" ? 0.5 : 1]]);
    bars.forEach((bar, i) => {
      if (m === "idle") {
        a.key(bar.path, "height", [[0, 4]]).key(bar.shape, "opacity", [[0, 0.3]]).key(bar.shape, "y", [[0, BAR_Y]]);
      } else if (m === "thinking") {
        const at = i * 12;
        a.key(bar.path, "height", [[0, 4]]).key(bar.shape, "y", [[0, BAR_Y]]);
        a.key(bar.shape, "opacity", [[0, 0.2, "hold"], [at, 0.2, ease], [at + 14, 0.95, ease], [at + 40, 0.2, "hold"], [frames, 0.2]]);
      } else if (m === "speaking") {
        a.key(bar.path, "height", flicker(10 + i, frames, 8, 4, 18 - Math.abs(i - 2) * 3).map(([f, v]): Key => [f, v, ease]));
        a.key(bar.shape, "opacity", [[0, 0.95]]).key(bar.shape, "y", [[0, BAR_Y]]);
      } else {
        const lift = [4, 1, 0, 1, 4][i];
        a.key(bar.path, "height", [[0, 5]]).key(bar.shape, "opacity", [[0, 0.95]]).key(bar.shape, "y", [[0, BAR_Y - lift]]);
      }
    });
    return a;
  };
  const moods = ROBOT_MODES.map((m) => [m, moodAnimation(m)] as const);

  // Energy: glow strength, blended continuously.
  const glowAt = (name: string, k: number) => {
    const a = ab.animation(name, 60, "loop");
    a.key(coreGlow.shape, "opacity", [[0, 0.2 + 0.8 * k]]);
    for (const axis of ["scaleX", "scaleY"] as const) {
      a.key(coreGlow.shape, axis, [[0, 0.75 + 0.5 * k]]);
      a.key(bulbGlow.shape, axis, [[0, 0.7 + 0.6 * k]]);
    }
    for (const g of eyeGlows) a.key(g.shape, "opacity", [[0, 0.12 + 0.6 * k]]);
    a.key(thrust.shape, "scaleX", [[0, 0.75 + 0.5 * k]]);
    a.key(core.shape, "opacity", [[0, 0.55 + 0.45 * k]]);
    return a;
  };
  const dim = glowAt("energy 0", 0);
  const bright = glowAt("energy 100", 1);

  // Look: the eyes lead, the head follows, the antenna lags the other way.
  const lookAtX = (name: string, s: number) =>
    ab
      .animation(name, 60, "loop")
      .key(gaze, "x", [[0, 11 * s]])
      .key(neck, "rotation", [[0, 0.08 * s]])
      .key(neck, "x", [[0, 3 * s]])
      .key(antenna, "rotation", [[0, -0.14 * s]])
      .key(body, "rotation", [[0, 0.025 * s]]);
  const lookAtY = (name: string, s: number) =>
    ab
      .animation(name, 60, "loop")
      .key(gaze, "y", [[0, 7 * s]])
      .key(head, "scaleY", [[0, 1 - 0.015 * Math.abs(s)]]);

  // Hover: the eyes open a touch, the antenna perks, a sheen crosses the visor,
  // and the eyes start following the pointer target.
  const rest = ab.animation("rest", 60, "loop").key(sheen, "x", [[0, -150]]).key(antenna, "scaleY", [[0, 1]]);
  for (const p of pops) rest.key(p, "scaleX", [[0, 1]]).key(p, "scaleY", [[0, 1]]);
  const perk = ab.animation("perk", 54, "oneShot");
  perk.key(sheen, "x", [[0, -150, ease], [40, 150]]);
  perk.key(antenna, "scaleY", [[0, 1, spring], [36, 1.16]]);
  for (const p of pops) perk.key(p, "scaleX", [[0, 1, out], [14, 1.08]]).key(p, "scaleY", [[0, 1, out], [14, 1.1]]);

  // Poke: hop with squash and stretch, happy eyes, a wave and a ping off the antenna.
  const still = ab.animation("still", 60, "loop");
  still.key(hop, "y", [[0, FEET_Y]]).key(hop, "scaleX", [[0, 1]]).key(hop, "scaleY", [[0, 1]]);
  still.key(bulbCore.shape, "scaleX", [[0, 1]]).key(bulbCore.shape, "scaleY", [[0, 1]]).key(ping.shape, "opacity", [[0, 0]]);
  const HOP = 84;
  const bounce = ab.animation("hop", HOP, "oneShot");
  bounce.key(hop, "y", [[0, FEET_Y, "hold"], [6, FEET_Y, out], [24, FEET_Y - 22, inQuad], [40, FEET_Y, "hold"], [HOP, FEET_Y]]);
  bounce.key(hop, "scaleY", [[0, 1, ease], [6, 0.9, out], [16, 1.07, ease], [40, 0.9, spring], [HOP, 1]]);
  bounce.key(hop, "scaleX", [[0, 1, ease], [6, 1.07, out], [16, 0.95, ease], [40, 1.07, spring], [HOP, 1]]);
  for (const c of eyeContours) bounce.morph(c, [[0, EYE.open, out], [8, EYE.happy, "hold"], [66, EYE.happy, ease], [HOP, EYE.open]]);
  bounce.key(upperR, "rotation", [
    [0, DOWN, out],
    [14, DOWN - 1.45, ease],
    [26, DOWN - 1.05, ease],
    [38, DOWN - 1.6, ease],
    [50, DOWN - 1.05, ease],
    [62, DOWN - 1.4, ease],
    [HOP, DOWN],
  ]);
  bounce.key(foreR, "rotation", [
    [0, 0, out],
    [14, 0.75, ease],
    [26, 0.2, ease],
    [38, 0.9, ease],
    [50, 0.15, ease],
    [62, 0.7, ease],
    [HOP, 0],
  ]);
  for (const axis of ["scaleX", "scaleY"] as const) {
    bounce.key(bulbCore.shape, axis, [[0, 1, out], [10, 1.6, ease], [34, 1]]);
    bounce.key(ping.shape, axis, [[0, 1, "hold"], [8, 1, out], [44, 4.2]]);
  }
  bounce.key(ping.shape, "opacity", [[0, 0, "hold"], [8, 1, out], [44, 0]]);

  /* ---- state machine ------------------------------------------------- */
  const sm = ab.stateMachine(ROBOT.stateMachine);

  const aliveLayer = sm.layer("alive");
  aliveLayer.transition(aliveLayer.entry, aliveLayer.play(alive));

  const modeLayer = sm.layer("mode");
  const modeStates = moods.map(([m, a]) => {
    const s = modeLayer.play(a);
    modeLayer.onStart(s, { set: showing, value: m });
    return [m, s] as const;
  });
  modeLayer.transition(modeLayer.entry, modeStates[0][1]);
  for (const [m, s] of modeStates) {
    modeLayer.transition(modeLayer.any, s, { conditions: [{ vm: mode, value: m }], durationMs: 320, ease });
  }

  const energyLayer = sm.layer("energy");
  energyLayer.transition(energyLayer.entry, energyLayer.blend1D(energy, [[0, dim], [100, bright]]));

  const lookXLayer = sm.layer("look x");
  lookXLayer.transition(
    lookXLayer.entry,
    lookXLayer.blend1D(lookX, [[-1, lookAtX("look left", -1)], [0, lookAtX("look ahead", 0)], [1, lookAtX("look right", 1)]]),
  );
  const lookYLayer = sm.layer("look y");
  lookYLayer.transition(
    lookYLayer.entry,
    lookYLayer.blend1D(lookY, [[-1, lookAtY("look up", -1)], [0, lookAtY("look level", 0)], [1, lookAtY("look down", 1)]]),
  );

  const hoverLayer = sm.layer("hover");
  const sRest = hoverLayer.play(rest);
  const sPerk = hoverLayer.play(perk);
  hoverLayer.transition(hoverLayer.entry, sRest);
  hoverLayer.transition(sRest, sPerk, { conditions: [{ vm: hover, value: true }], durationMs: 160 });
  hoverLayer.transition(sPerk, sRest, { conditions: [{ vm: hover, value: false }], durationMs: 360, ease });

  const pokeLayer = sm.layer("poke");
  const sStill = pokeLayer.play(still);
  const sHop = pokeLayer.play(bounce);
  pokeLayer.onStart(sStill, { set: reacting, value: false });
  pokeLayer.onStart(sHop, { set: reacting, value: true });
  pokeLayer.transition(pokeLayer.entry, sStill);
  pokeLayer.transition(sStill, sHop, { conditions: [{ vmTrigger: poke }] });
  pokeLayer.transition(sHop, sStill, { conditions: [], exitAtPercent: 100, durationMs: 200 });

  // After `alive`, so a tuck's y wins over the bob and a present state that does not key y lets the bob continue.
  const ARRIVE = 36;
  const TUCK = 48;
  const BACK = 42;
  const PARK = { x: 352, y: 236, scale: 0.34 };
  const arriving = ab.animation("arriving", ARRIVE, "oneShot");
  arriving.key(float, "scaleX", [[0, 0.62, spring], [ARRIVE, 1]]);
  arriving.key(float, "scaleY", [[0, 0.62, spring], [ARRIVE, 1]]);
  arriving.key(bubble, "opacity", [[0, 0, ease], [22, 1]]);
  const present = ab.animation("present", 30, "loop");
  present.key(float, "x", [[0, CX]]).key(float, "scaleX", [[0, 1]]).key(float, "scaleY", [[0, 1]]).key(float, "rotation", [[0, 0]]);
  present.key(bubble, "opacity", [[0, 1]]);
  const tucking = ab.animation("tucking", TUCK, "oneShot");
  tucking.key(float, "x", [[0, CX, ease], [TUCK, PARK.x]]);
  tucking.key(float, "y", [[0, 0, out], [16, -18, inQuad], [TUCK, PARK.y]]);
  tucking.key(float, "scaleX", [[0, 1, ease], [TUCK, PARK.scale]]);
  tucking.key(float, "scaleY", [[0, 1, ease], [TUCK, PARK.scale]]);
  tucking.key(float, "rotation", [[0, 0, out], [18, -0.22, ease], [34, 0.12, spring], [TUCK, 0]]);
  tucking.key(bubble, "opacity", [[0, 1, ease], [16, 0]]);
  const parked = ab.animation("parked", 30, "loop");
  parked.key(float, "x", [[0, PARK.x]]).key(float, "y", [[0, PARK.y]]);
  parked.key(float, "scaleX", [[0, PARK.scale]]).key(float, "scaleY", [[0, PARK.scale]]).key(float, "rotation", [[0, 0]]);
  parked.key(bubble, "opacity", [[0, 0]]);
  const returning = ab.animation("returning", BACK, "oneShot");
  returning.key(float, "x", [[0, PARK.x, ease], [BACK, CX]]);
  returning.key(float, "y", [[0, PARK.y, out], [16, PARK.y - 24, inQuad], [BACK, 0]]);
  returning.key(float, "scaleX", [[0, PARK.scale, spring], [BACK, 1]]);
  returning.key(float, "scaleY", [[0, PARK.scale, spring], [BACK, 1]]);
  returning.key(float, "rotation", [[0, 0, out], [14, 0.4, ease], [BACK, 0]]);
  returning.key(bubble, "opacity", [[0, 0, "hold"], [20, 0, ease], [BACK, 1]]);

  const presenceLayer = sm.layer("presence");
  const sArriving = presenceLayer.play(arriving);
  const sPresent = presenceLayer.play(present);
  const sTucking = presenceLayer.play(tucking);
  const sParked = presenceLayer.play(parked);
  const sReturning = presenceLayer.play(returning);
  presenceLayer.report(presence);
  presenceLayer.transition(presenceLayer.entry, sArriving);
  presenceLayer.transition(sArriving, sTucking, { conditions: [{ vmTrigger: poke }] });
  presenceLayer.transition(sArriving, sPresent, { conditions: [], exitAtPercent: 100 });
  presenceLayer.transition(sPresent, sTucking, { conditions: [{ vmTrigger: poke }] });
  presenceLayer.transition(sTucking, sParked, { conditions: [], exitAtPercent: 100 });
  presenceLayer.transition(sParked, sReturning, { conditions: [{ vmTrigger: poke }] });
  presenceLayer.transition(sReturning, sPresent, { conditions: [], exitAtPercent: 100 });
  presenceLayer.transition(presenceLayer.any, sPresent, { conditions: [{ vmTrigger: settle }] });

  // A new line every few seconds. The bubble group hides all of them while tucked.
  const SLOT = 360;
  const FADE = 24;
  const lineCycle = ab.animation("lines", ROBOT_LINES.length * SLOT, "loop");
  said.forEach((one, i) => {
    const start = i * SLOT;
    const end = start + SLOT;
    const total = ROBOT_LINES.length * SLOT;
    const keys: Key[] =
      i === 0
        ? [
            [0, 1, "hold"],
            [end - FADE, 1, ease],
            [end, 0, "hold"],
            [total - FADE, 0, ease],
            [total, 1],
          ]
        : [
            [0, 0, "hold"],
            [start, 0, ease],
            [start + FADE, 1, "hold"],
            [end - FADE, 1, ease],
            [Math.min(end, total), 0],
          ];
    if (i !== 0 && end < total) keys.push([total, 0]);
    lineCycle.key(one.text, "opacity", keys);
  });
  const linesLayer = sm.layer("lines");
  linesLayer.transition(linesLayer.entry, linesLayer.play(lineCycle));

  // Gaze: the pointer moves a target; the eyes copy a share of its offset, clamped
  // to the visor. The hover layer owns the constraint's strength, so when the
  // pointer leaves the eyes glide home instead of staying where it left them.
  const follow = ab.translationConstraint(gaze, gazeTarget, {
    copyFactor: 0.07,
    copyFactorY: 0.05,
    offset: true,
    limit: { minX: -16, maxX: 16, minY: -9, maxY: 9 },
    strength: 0,
  });
  rest.key(follow, "strength", [[0, 0]]);
  perk.key(follow, "strength", [[0, 0, ease], [30, 1]]);

  sm.listen("pointer in", touch.shape, "enter", { set: hover, value: true });
  sm.listen("pointer out", touch.shape, "exit", { set: hover, value: false });
  sm.listen("press", touch.shape, "down", { fire: poke });
  sm.listen("gaze", touch.shape, "move", { align: gazeTarget });

  return ab.encode(0xb07);
}

