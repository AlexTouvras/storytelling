import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildField } from "@/lib/sim/book-field";
import { PROP, TYPE, decodeRiv } from "@/lib/rive/riv-writer";
import { HOUSEHOLD, buildHousehold, fallingKeys, householdValues } from "@/illustrations/household";

const key = (name: keyof typeof PROP) => PROP[name][0];
const featured = buildField().featured;
const values = householdValues(featured);

describe("householdValues", () => {
  it("takes its proportions from the modelled loan", () => {
    expect(values.levelBefore).toBe(0.8);
    expect(values.levelAfter).toBeCloseTo((0.8 * featured.bufferAfter) / featured.bufferBefore, 3);
    expect(values.thinLevel).toBeCloseTo((0.8 * 0.06 * featured.incomeMonthly) / featured.bufferBefore, 3);
    expect(values.paymentRatio).toBeCloseTo(featured.paymentAfter / featured.paymentBefore, 3);
  });

  it("ends the featured loan below the thin line, as the film says it does", () => {
    expect(featured.shareAfter).toBeLessThan(0.06);
    expect(values.levelAfter).toBeLessThan(values.thinLevel);
    expect(values.thinLevel).toBeLessThan(values.levelBefore);
  });
});

describe("household.riv", () => {
  const committed = readFileSync(join(process.cwd(), "src/illustrations/household.riv"));

  it("is exactly what the model produces today", () => {
    expect(Buffer.compare(committed, Buffer.from(buildHousehold(values)))).toBe(0);
  });

  it("carries the state machine and inputs the director drives", () => {
    const { objects } = decodeRiv(new Uint8Array(committed));
    const machine = objects.find((o) => o.type === TYPE.stateMachine)!;
    expect(machine.props.get(key("animName"))).toBe(HOUSEHOLD.stateMachine);
    const trigger = objects.find((o) => o.type === TYPE.smTrigger)!;
    const bool = objects.find((o) => o.type === TYPE.smBool)!;
    expect(trigger.props.get(key("smName"))).toBe(HOUSEHOLD.inputs.shock);
    expect(bool.props.get(key("smName"))).toBe(HOUSEHOLD.inputs.constrained);
    const artboard = objects.find((o) => o.type === TYPE.artboard)!;
    expect(artboard.props.get(key("name"))).toBe(HOUSEHOLD.name);
  });

  it("stays a KB-size asset", () => {
    expect(committed.byteLength).toBeLessThan(32 * 1024);
  });
});

describe("fallingKeys", () => {
  it("closes the loop and jumps back to the top instead of sliding up", () => {
    const { y, opacity } = fallingKeys(144, 48, 1 / 3, 300, 340);
    expect(y[0][1]).toBeCloseTo(y[y.length - 1][1], 3);
    expect(y[y.length - 1][0]).toBe(144);
    for (let i = 0; i < y.length - 1; i++) {
      const rising = y[i + 1][1] < y[i][1];
      if (rising) {
        expect(y[i][2]).toBe("hold");
        expect(y[i + 1][0] - y[i][0]).toBe(1);
        expect(opacity[i + 1][1]).toBe(0);
      }
    }
  });

  it("refuses a cycle that would leave a seam", () => {
    expect(() => fallingKeys(144, 50, 0, 0, 1)).toThrow();
  });
});
