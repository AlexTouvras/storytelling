/**
 * Three cars from the side, for the one brake.
 *
 * The picture is a depiction, built the same way as the field-card robot:
 * cubic contours and gradients for the body, a solid lamp so the brake can
 * recolour it. Nothing in the artboard is a chart and nothing is read off it.
 * The lead lamp comes on, the next lamp later, the third later and fuller.
 * The gap closes, the nose dips, and the wheels slow. The film says the
 * brake is enlarged.
 *
 * Cars face right. Lamps are at the tail. The group origin is the rear axle,
 * so a small positive rotation dips the nose.
 */

import { ArtboardBuilder, type Handle } from "@/lib/rive/artboard-builder";
import { parsePath } from "@/lib/rive/path-data";
import { argb } from "@/lib/rive/riv-writer";

export const CARS = {
  name: "Cars",
  stateMachine: "Cars",
  width: 480,
  height: 200,
  props: {
    /** Trigger: the brake plays. */
    brake: "brake",
    /** Bool: jump to the end of the brake, no animation. */
    braked: "braked",
  },
  brakeSeconds: 3,
} as const;

const PAINT = argb(236, 240, 246);
const PAINT_MID = argb(196, 206, 220);
const PAINT_LOW = argb(132, 142, 158);
const GLASS = argb(186, 206, 220);
const GLASS_DEEP = argb(120, 146, 166);
const WHEEL = argb(22, 26, 32);
const RIM = argb(186, 194, 204);
const SPOKE = argb(210, 216, 224);
const LAMP_OFF = argb(72, 48, 54);
const LAMP_DIM = argb(180, 48, 56);
const LAMP_MID = argb(230, 56, 64);
const LAMP_FULL = argb(255, 72, 78);
const HEAD = argb(255, 236, 214);
const ROAD_TOP = argb(78, 84, 96);
const ROAD_LOW = argb(32, 36, 44);
const LINE = argb(168, 176, 188);

const FPS = 60;
const BRAKE_FRAMES = CARS.brakeSeconds * FPS;

/** Rear-axle x of each car at rest, and where the followers finish. */
const REST = { follower: 48, middle: 196, lead: 344 } as const;
const CLOSED = { follower: 86, middle: 218 } as const;
const AXLE_Y = 142;
/** Lamp centre, relative to the rear axle. Ellipse x/y are centres. */
const LAMP_LOCAL = { x: -12, y: -10 };

/** Where the legend points, in artboard units. */
export function carsGeometry() {
  return {
    leadLamp: { x: REST.lead + LAMP_LOCAL.x, y: AXLE_Y + LAMP_LOCAL.y },
    gap: { x: (REST.middle + 100 + REST.lead - 16) / 2, y: AXLE_Y - 22 },
    thirdLamp: { x: REST.follower + LAMP_LOCAL.x, y: AXLE_Y + LAMP_LOCAL.y },
  };
}

type CarParts = {
  body: Handle;
  lampColor: Handle;
  glow: Handle;
  wheels: Handle[];
};

function car(ab: ArtboardBuilder, name: string, x: number, lampColor: number): CarParts {
  const body = ab.group({ name, x, y: AXLE_Y });

  ab.ellipse({
    name: `${name} shadow`,
    parent: body,
    x: 42,
    y: 12,
    width: 108,
    height: 12,
    fill: {
      kind: "radial",
      from: [0, 6],
      to: [54, 6],
      stops: [
        [0, argb(0, 0, 0, 0.45)],
        [1, argb(0, 0, 0, 0)],
      ],
    },
  });

  const glow = ab.ellipse({
    name: `${name} glow`,
    parent: body,
    x: LAMP_LOCAL.x,
    y: LAMP_LOCAL.y,
    width: 22,
    height: 16,
    opacity: 0,
    fill: {
      kind: "radial",
      from: [0, 0],
      to: [14, 0],
      stops: [
        [0, argb(255, 72, 78, 0.9)],
        [1, argb(255, 72, 78, 0)],
      ],
    },
  });

  ab.path({
    name: `${name} shell`,
    parent: body,
    x: 0,
    y: 0,
    contours: parsePath(
      "M -16 2 C -18 -6 -16 -14 -8 -18 C 0 -22 6 -22 14 -24 C 20 -40 32 -46 48 -46 C 62 -46 74 -40 82 -26 C 90 -20 98 -12 104 -4 C 108 0 106 4 100 6 L 84 6 L 78 2 L 54 2 L 48 6 L 16 6 L 10 2 L -6 2 Z",
    ),
    fill: {
      kind: "linear",
      from: [40, -46],
      to: [40, 8],
      stops: [
        [0, PAINT],
        [0.42, PAINT_MID],
        [1, PAINT_LOW],
      ],
    },
  });

  ab.path({
    name: `${name} glass`,
    parent: body,
    x: 0,
    y: 0,
    contours: parsePath("M 18 -22 C 24 -38 34 -42 46 -42 L 64 -42 C 74 -38 80 -28 84 -20 L 20 -20 Z"),
    fill: {
      kind: "linear",
      from: [50, -42],
      to: [50, -20],
      stops: [
        [0, GLASS],
        [1, GLASS_DEEP],
      ],
    },
  });

  ab.path({
    name: `${name} belt`,
    parent: body,
    x: 0,
    y: 0,
    contours: parsePath("M -6 -16 C 24 -22 70 -20 98 -8"),
    stroke: { color: argb(255, 255, 255, 0.35), thickness: 1.25 },
  });

  const lampShape = ab.ellipse({
    name: `${name} lamp`,
    parent: body,
    x: LAMP_LOCAL.x,
    y: LAMP_LOCAL.y,
    width: 10,
    height: 8,
    fill: lampColor,
  });

  ab.ellipse({
    name: `${name} head`,
    parent: body,
    x: 100,
    y: -4,
    width: 8,
    height: 6,
    fill: HEAD,
  });

  const wheels = [0, 68].map((axle, i) => {
    const wheel = ab.group({ name: `${name} wheel ${i}`, parent: body, x: axle, y: 0 });
    ab.ellipse({
      name: `${name} tyre ${i}`,
      parent: wheel,
      x: 0,
      y: 0,
      width: 28,
      height: 28,
      fill: WHEEL,
    });
    ab.ellipse({
      name: `${name} rim ${i}`,
      parent: wheel,
      x: 0,
      y: 0,
      width: 14,
      height: 14,
      fill: RIM,
    });
    ab.rect({
      name: `${name} spoke ${i}`,
      parent: wheel,
      x: 0,
      y: 0,
      width: 2.5,
      height: 22,
      originX: 0.5,
      originY: 0.5,
      fill: SPOKE,
    });
    return wheel;
  });

  return { body, lampColor: lampShape.fillColor!, glow: glow.shape, wheels };
}

export function buildCars(): Uint8Array {
  const ab = new ArtboardBuilder(CARS.name, CARS.width, CARS.height);
  ab.rect({
    name: "road",
    x: CARS.width / 2,
    y: 178,
    width: CARS.width,
    height: 44,
    fill: {
      kind: "linear",
      from: [0, 0],
      to: [0, 44],
      stops: [
        [0, ROAD_TOP],
        [1, ROAD_LOW],
      ],
    },
  });
  ab.rect({ name: "lane line", x: CARS.width / 2, y: 157, width: CARS.width, height: 2, fill: LINE });

  const follower = car(ab, "follower", REST.follower, LAMP_OFF);
  const middle = car(ab, "middle", REST.middle, LAMP_OFF);
  const lead = car(ab, "lead", REST.lead, LAMP_OFF);
  const fleet = [follower, middle, lead];

  const idle = ab.animation("idle", 120, "loop");
  const brake = ab.animation("brake", BRAKE_FRAMES, "oneShot");
  const held = ab.animation("held", 60, "loop");

  const spin = (anim: ReturnType<ArtboardBuilder["animation"]>, frames: number, turns: number) => {
    for (const c of fleet) {
      for (const wheel of c.wheels) {
        anim.key(wheel, "rotation", [
          [0, 0],
          [frames, turns * Math.PI * 2],
        ]);
      }
    }
  };
  spin(idle, 120, 2);

  const lampKeys = (
    anim: ReturnType<ArtboardBuilder["animation"]>,
    c: CarParts,
    on: number,
    color: number,
  ) => {
    anim.keyColor(c.lampColor, [
      [0, LAMP_OFF],
      [Math.max(0, on - 8), LAMP_OFF],
      [on, color],
      [BRAKE_FRAMES, color],
    ]);
    anim.key(c.glow, "opacity", [
      [0, 0],
      [Math.max(0, on - 8), 0],
      [on + 10, 1],
      [BRAKE_FRAMES, 0.85],
    ]);
  };
  lampKeys(brake, lead, 24, LAMP_DIM);
  lampKeys(brake, middle, 70, LAMP_MID);
  lampKeys(brake, follower, 120, LAMP_FULL);

  brake.key(middle.body, "x", [
    [0, REST.middle],
    [BRAKE_FRAMES, CLOSED.middle],
  ]);
  brake.key(follower.body, "x", [
    [0, REST.follower],
    [BRAKE_FRAMES, CLOSED.follower],
  ]);
  // Nose dips around the rear axle. The lead dips less: it braked first.
  brake.key(lead.body, "rotation", [
    [0, 0],
    [40, 0.04],
    [BRAKE_FRAMES, 0.03],
  ]);
  for (const c of [middle, follower]) {
    brake.key(c.body, "rotation", [
      [0, 0],
      [90, 0],
      [BRAKE_FRAMES, 0.07],
    ]);
  }
  for (const c of fleet) {
    for (const wheel of c.wheels) {
      brake.key(wheel, "rotation", [
        [0, 0],
        [80, Math.PI * 4],
        [BRAKE_FRAMES, Math.PI * 4.6],
      ]);
    }
  }

  held.keyColor(lead.lampColor, [[0, LAMP_DIM]]);
  held.keyColor(middle.lampColor, [[0, LAMP_MID]]);
  held.keyColor(follower.lampColor, [[0, LAMP_FULL]]);
  held.key(lead.glow, "opacity", [[0, 0.7]]);
  held.key(middle.glow, "opacity", [[0, 0.85]]);
  held.key(follower.glow, "opacity", [[0, 1]]);
  held.key(middle.body, "x", [[0, CLOSED.middle]]);
  held.key(follower.body, "x", [[0, CLOSED.follower]]);
  held.key(lead.body, "rotation", [[0, 0.03]]);
  held.key(middle.body, "rotation", [[0, 0.07]]);
  held.key(follower.body, "rotation", [[0, 0.07]]);
  for (const c of fleet) {
    for (const wheel of c.wheels) {
      held.key(wheel, "rotation", [
        [0, Math.PI * 4.6],
        [60, Math.PI * 4.8],
      ]);
    }
  }

  const vm = ab.viewModel(CARS.name);
  const brakeProp = vm.trigger(CARS.props.brake);
  const braked = vm.boolean(CARS.props.braked);

  const sm = ab.stateMachine(CARS.stateMachine);
  const layer = sm.layer("brake");
  const sIdle = layer.play(idle);
  const sBrake = layer.play(brake);
  const sHeld = layer.play(held);
  layer.transition(layer.entry, sIdle);
  layer.transition(sIdle, sBrake, { conditions: [{ vmTrigger: brakeProp }] });
  layer.transition(sIdle, sHeld, { conditions: [{ vm: braked, value: true }] });
  layer.transition(sBrake, sHeld, { conditions: [], exitAtPercent: 100 });

  return ab.encode(0xc45);
}
