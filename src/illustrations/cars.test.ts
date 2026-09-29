import { describe, expect, it } from "vitest";
import { CARS, buildCars, carsGeometry } from "@/illustrations/cars";
import { PROP, TYPE, decodeRiv } from "@/lib/rive/riv-writer";

const key = (name: keyof typeof PROP) => PROP[name][0];

describe("cars illustration", () => {
  it("points the legend at lamps on the artboard, lead ahead of the follower", () => {
    const g = carsGeometry();
    for (const point of [g.leadLamp, g.gap, g.thirdLamp]) {
      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(CARS.width);
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(CARS.height);
    }
    expect(g.leadLamp.x).toBeGreaterThan(g.gap.x);
    expect(g.gap.x).toBeGreaterThan(g.thirdLamp.x);
  });

  it("encodes a view model the director can fire, and no deprecated inputs", () => {
    const bytes = buildCars();
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe("RIVE");
    const { objects } = decodeRiv(bytes);
    const named = (type: number) => objects.filter((o) => o.type === type).map((o) => o.props.get(key("vmName")));
    expect(named(TYPE.viewModel)).toEqual([CARS.name]);
    expect(named(TYPE.vmPropertyTrigger)).toEqual([CARS.props.brake]);
    expect(named(TYPE.vmPropertyBoolean)).toEqual([CARS.props.braked]);
    expect(objects.filter((o) => o.type === TYPE.smTrigger || o.type === TYPE.smBool)).toHaveLength(0);
  });
});