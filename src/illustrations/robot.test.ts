import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROP, TYPE, decodeRiv } from "@/lib/rive/riv-writer";
import { ROBOT, ROBOT_MODES, buildRobot, robotEyePose } from "@/illustrations/robot";

const key = (name: keyof typeof PROP) => PROP[name][0];

describe("robot eyes", () => {
  it("has the same vertex count in every pose, so moods morph", () => {
    const counts = ROBOT_MODES.map((m) => robotEyePose(m).points.length);
    expect(new Set(counts).size).toBe(1);
  });
});

describe("robot.riv", () => {
  const committed = readFileSync(join(process.cwd(), "src/illustrations/robot.riv"));
  const { objects } = decodeRiv(new Uint8Array(committed));
  const names = (type: number, prop: keyof typeof PROP) => objects.filter((o) => o.type === type).map((o) => o.props.get(key(prop)));

  it("is exactly what the builder produces today", () => {
    expect(Buffer.compare(committed, Buffer.from(buildRobot()))).toBe(0);
  });

  it("is driven by a view model, not by state-machine inputs", () => {
    expect(names(TYPE.viewModel, "vmName")).toEqual([ROBOT.viewModel]);
    expect(names(TYPE.stateMachine, "animName")).toEqual([ROBOT.stateMachine]);
    expect(objects.some((o) => o.type === TYPE.smTrigger || o.type === TYPE.smBool)).toBe(false);
    const props = objects
      .filter((o) => ([TYPE.vmPropertyNumber, TYPE.vmPropertyBoolean, TYPE.vmPropertyTrigger, TYPE.vmPropertyColor, TYPE.vmPropertyEnumCustom] as number[]).includes(o.type))
      .map((o) => o.props.get(key("vmName")));
    expect(props).toEqual(Object.values(ROBOT.props));
  });

  it("offers every mode, in order, and starts idle", () => {
    const enumValues = names(TYPE.dataEnumValue, "enumValueKey");
    expect(enumValues.slice(0, ROBOT_MODES.length)).toEqual([...ROBOT_MODES]);
    const [mode] = names(TYPE.vmInstanceEnum, "vmEnumValue");
    expect(mode).toBe(ROBOT_MODES.indexOf(ROBOT.defaults.mode));
  });

  it("reacts to the pointer on its own", () => {
    const types = names(TYPE.listener, "listenerType");
    expect(types).toEqual(expect.arrayContaining([0, 1, 2, 4]));
  });

  it("stays a KB-size asset", () => {
    expect(committed.byteLength).toBeLessThan(40 * 1024);
  });
});
