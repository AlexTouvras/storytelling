import { describe, expect, it } from "vitest";
import { PROP, TYPE, argb, decodeRiv, encodeRiv } from "@/lib/rive/riv-writer";
import { ArtboardBuilder } from "@/lib/rive/artboard-builder";

const key = (name: keyof typeof PROP) => PROP[name][0];

describe("encodeRiv", () => {
  it("writes the runtime header the Rive reader checks", () => {
    const bytes = encodeRiv([{ type: TYPE.backboard, props: {} }], 300);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("RIVE");
    // major 7, minor 0, file id 300 as a two-byte varuint, empty ToC
    expect([...bytes.slice(4, 9)]).toEqual([7, 0, 0xac, 0x02, 0]);
  });

  it("round-trips every wire kind", () => {
    const bytes = encodeRiv([
      {
        type: TYPE.shape,
        props: { name: "näme", parentId: 200, x: 1.5, opacity: 0.25 },
      },
      { type: TYPE.solidColor, props: { colorValue: argb(186, 104, 255, 1) } },
      { type: TYPE.smBool, props: { smName: "b", smBoolValue: true } },
    ]);
    const { major, objects } = decodeRiv(bytes);
    expect(major).toBe(7);
    expect(objects[0].props.get(key("name"))).toBe("näme");
    expect(objects[0].props.get(key("parentId"))).toBe(200);
    expect(objects[0].props.get(key("x"))).toBeCloseTo(1.5);
    expect(objects[1].props.get(key("colorValue"))).toBe(0xffba68ff);
    expect(objects[2].props.get(key("smBoolValue"))).toBe(true);
  });

  it("refuses values a varuint cannot carry", () => {
    expect(() => encodeRiv([{ type: TYPE.shape, props: { parentId: -1 } }])).toThrow();
  });
});

describe("ArtboardBuilder", () => {
  function build() {
    const ab = new ArtboardBuilder("A", 100, 100);
    const back = ab.rect({ name: "back", x: 0, y: 0, width: 10, height: 10, fill: 1 });
    const front = ab.ellipse({ name: "front", x: 0, y: 0, width: 5, height: 5, stroke: { color: 2, thickness: 1 } });
    const anim = ab.animation("move", 60, "loop").key(front.shape, "x", [[0, 0], [60, 10]]);
    const sm = ab.stateMachine("M");
    const go = sm.trigger("go");
    const layer = sm.layer("L");
    const idle = layer.play(anim);
    layer.transition(layer.entry, idle);
    layer.transition(idle, layer.exit, { conditions: [{ trigger: go }] });
    return { objects: decodeRiv(ab.encode()).objects, back, front };
  }

  it("writes the front-most shape first, because the runtime draws the last one first", () => {
    const { objects } = build();
    const names = objects.filter((o) => o.type === TYPE.shape).map((o) => o.props.get(key("name")));
    expect(names).toEqual(["front", "back"]);
  });

  it("resolves every parent to an earlier component of the artboard", () => {
    const { objects } = build();
    const artboardAt = objects.findIndex((o) => o.type === TYPE.artboard);
    const firstAnimation = objects.findIndex((o) => o.type === TYPE.linearAnimation);
    const components = objects.slice(artboardAt, firstAnimation);
    components.forEach((c, i) => {
      if (i === 0) return;
      const parent = c.props.get(key("parentId"));
      expect(typeof parent).toBe("number");
      expect(parent as number).toBeLessThan(i);
    });
  });

  it("keys the object it was handed, by artboard index", () => {
    const { objects, front } = build();
    const keyed = objects.find((o) => o.type === TYPE.keyedObject)!;
    expect(keyed.props.get(key("objectId"))).toBe(front.shape.id);
    const artboardAt = objects.findIndex((o) => o.type === TYPE.artboard);
    expect(objects[artboardAt + front.shape.id].props.get(key("name"))).toBe("front");
  });

  it("points transitions at states in their own layer and conditions at inputs", () => {
    const { objects } = build();
    const transitions = objects.filter((o) => o.type === TYPE.transition);
    // entry(0) → idle(3); idle(3) → exit(2)
    expect(transitions.map((t) => t.props.get(key("stateToId")))).toEqual([3, 2]);
    const condition = objects.find((o) => o.type === TYPE.triggerCondition)!;
    expect(condition.props.get(key("inputId"))).toBe(0);
  });
});
