/**
 * Three cars from the side, for the one brake.
 *
 * Nothing in the artboard is a chart and nothing is read off it. The lead
 * lamp comes on, the next lamp later, the third later and fuller. The gap
 * closes and the wheels slow. The film says the brake is enlarged.
 *
 * Inputs match the grid: a trigger plays the brake, a bool jumps to the end.
 */

import { ArtboardBuilder, type Handle } from "@/lib/rive/artboard-builder";
import { argb } from "@/lib/rive/riv-writer";

export const CARS = {
  name: "Cars",
  stateMachine: "Cars",
  width: 480,
  height: 200,
  inputs: {
    /** Trigger: the brake plays. */
    brake: "brake",
    /** Bool: jump to the end of the brake, no animation. */
    braked: "braked",
  },
  brakeSeconds: 3,
} as const;

const BODY = argb(226, 232, 240);
const GLASS = argb(186, 210, 224);
const WHEEL = argb(28, 32, 40);
const SPOKE = argb(200, 206, 214);
const LAMP_OFF = argb(72, 48, 54);
const LAMP_DIM = argb(180, 48, 56);
const LAMP_MID = argb(230, 56, 64);
const LAMP_FULL = argb(255, 72, 78);
const ROAD = argb(48, 54, 68);

const FPS = 60;
const BRAKE_FRAMES = CARS.brakeSeconds * FPS;

/** Where the legend points, in artboard units. Cars face right; lamps are at the tail. */
export function carsGeometry() {
  return {
    leadLamp: { x: 318, y: 108 },
    gap: { x: 250, y: 92 },
    thirdLamp: { x: 78, y: 108 },
  };
}

type CarParts = {
  body: Handle;
  lamp: Handle;
  lampColor: Handle;
  wheel: Handle;
};

function car(
  ab: ArtboardBuilder,
  name: string,
  x: number,
  bodyW: number,
  lampColor: number,
): CarParts {
  const y = 118;
  const body = ab.group({ name, x, y });
  ab.rect({
    name: `${name} body`,
    parent: body,
    x: 8,
    y: -28,
    width: bodyW,
    height: 36,
    cornerRadius: 8,
    fill: BODY,
  });
  ab.rect({
    name: `${name} glass`,
    parent: body,
    x: bodyW * 0.42,
    y: -46,
    width: bodyW * 0.4,
    height: 20,
    cornerRadius: 6,
    fill: GLASS,
  });
  const lampShape = ab.rect({
    name: `${name} lamp`,
    parent: body,
    x: 0,
    y: -16,
    width: 10,
    height: 12,
    cornerRadius: 2,
    fill: lampColor,
  });
  const wheel = ab.group({ name: `${name} wheel`, parent: body, x: bodyW * 0.72, y: 8 });
  ab.ellipse({
    name: `${name} tyre`,
    parent: wheel,
    x: -11,
    y: -11,
    width: 22,
    height: 22,
    fill: WHEEL,
  });
  ab.rect({
    name: `${name} spoke`,
    parent: wheel,
    x: -1.5,
    y: -10,
    width: 3,
    height: 20,
    fill: SPOKE,
  });
  return { body, lamp: lampShape.shape, lampColor: lampShape.fillColor!, wheel };
}

export function buildCars(): Uint8Array {
  const ab = new ArtboardBuilder(CARS.name, CARS.width, CARS.height);
  ab.rect({ name: "road", x: 0, y: 150, width: 480, height: 8, fill: ROAD });

  // Follower, middle, lead. Gaps are open at rest and close in the brake.
  const follower = car(ab, "follower", 36, 92, LAMP_OFF);
  const middle = car(ab, "middle", 186, 92, LAMP_OFF);
  const lead = car(ab, "lead", 336, 92, LAMP_OFF);

  const idle = ab.animation("idle", 120, "loop");
  const brake = ab.animation("brake", BRAKE_FRAMES, "oneShot");
  const held = ab.animation("held", 60, "loop");

  const spin = (anim: ReturnType<ArtboardBuilder["animation"]>, frames: number, turns: number) => {
    for (const c of [follower, middle, lead]) {
      anim.key(c.wheel, "rotation", [
        [0, 0],
        [frames, turns * Math.PI * 2],
      ]);
    }
  };
  spin(idle, 120, 2);

  // Lamps: lead, then middle, then the follower fuller.
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
  };
  lampKeys(brake, lead, 24, LAMP_DIM);
  lampKeys(brake, middle, 70, LAMP_MID);
  lampKeys(brake, follower, 120, LAMP_FULL);

  // The two followers close the gap. The lead stays.
  brake.key(middle.body, "x", [
    [0, 186],
    [BRAKE_FRAMES, 210],
  ]);
  brake.key(follower.body, "x", [
    [0, 36],
    [BRAKE_FRAMES, 78],
  ]);
  // Fast at first, then almost stopped.
  for (const c of [follower, middle, lead]) {
    brake.key(c.wheel, "rotation", [
      [0, 0],
      [80, Math.PI * 4],
      [BRAKE_FRAMES, Math.PI * 4.6],
    ]);
  }

  held.keyColor(lead.lampColor, [[0, LAMP_DIM]]);
  held.keyColor(middle.lampColor, [[0, LAMP_MID]]);
  held.keyColor(follower.lampColor, [[0, LAMP_FULL]]);
  held.key(middle.body, "x", [[0, 210]]);
  held.key(follower.body, "x", [[0, 78]]);
  for (const c of [follower, middle, lead]) {
    held.key(c.wheel, "rotation", [
      [0, Math.PI * 4.6],
      [60, Math.PI * 4.8],
    ]);
  }

  const sm = ab.stateMachine(CARS.stateMachine);
  const brakeInput = sm.trigger(CARS.inputs.brake);
  const braked = sm.bool(CARS.inputs.braked);
  const layer = sm.layer("brake");
  const sIdle = layer.play(idle);
  const sBrake = layer.play(brake);
  const sHeld = layer.play(held);
  layer.transition(layer.entry, sIdle);
  layer.transition(sIdle, sBrake, { conditions: [{ trigger: brakeInput }] });
  layer.transition(sIdle, sHeld, { conditions: [{ bool: braked, equals: true }] });
  layer.transition(sBrake, sHeld, { conditions: [], exitAtPercent: 100 });

  return ab.encode(0xc45);
}
