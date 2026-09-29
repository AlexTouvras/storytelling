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
 *     which replace the runtime's deprecated state-change events.
 *
 * Its parts are rigid, so the rig is a hierarchy of groups (float → hop →
 * body / neck → head → gaze → eye → lid); it needs no bones.
 */

import { ArtboardBuilder, type AnimationBuilder, type Handle, type Key, type ShapeHandles } from "@/lib/rive/artboard-builder";
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
  },
  /** Enums the machine writes, for a host to read back as states. */
  reports: ["showing"],
  defaults: { mode: "idle" as RobotMode, energy: 60 },
} as const;

const CYAN = [92, 214, 226] as const;
const VIOLET = [186, 104, 255] as const;
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

export function buildRobot(): Uint8Array {
  const ab = new ArtboardBuilder(ROBOT.name, ROBOT.width, ROBOT.height);
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
    x: CX,
    y: 358,
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

  const arm = (side: -1 | 1, shoulder: Handle) => {
    const upper = parsePath(`M ${-7 * side} -4 C ${-9 * side} 14 ${-8 * side} 30 ${-4 * side} 40 L ${10 * side} 40 C ${12 * side} 28 ${10 * side} 12 ${8 * side} -4 Z`);
    ab.path({
      name: `arm ${side < 0 ? "L" : "R"}`,
      x: 0,
      y: 0,
      parent: shoulder,
      contours: upper,
      fill: { kind: "linear", from: [0, -4], to: [0, 44], stops: [[0, ink(52, 62, 96)], [1, ink(18, 22, 40)]] },
      stroke: { color: white(0.28), thickness: 1.5 },
    });
    ab.ellipse({
      name: `hand ${side < 0 ? "L" : "R"}`,
      x: 3 * side,
      y: 46,
      parent: shoulder,
      width: 20,
      height: 20,
      fill: { kind: "radial", from: [-3, -4], to: [8, 6], stops: [[0, ink(74, 86, 128)], [1, ink(20, 24, 44)]] },
      stroke: { color: violet(0.55), thickness: 1.5 },
    });
  };
  arm(-1, shoulderL);
  arm(1, shoulderR);

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

  // On top of everything, and invisible: what the pointer listeners hit-test.
  const touch = ab.rect({ name: "touch", x: CX, y: 196, width: 250, height: 330, cornerRadius: 60, fill: argb(0, 0, 0, 0) });

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
  bounce.key(shoulderR, "rotation", [
    [0, 0, out],
    [14, -2.3, ease],
    [26, -1.9, ease],
    [38, -2.5, ease],
    [50, -1.9, ease],
    [62, -2.3, ease],
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

