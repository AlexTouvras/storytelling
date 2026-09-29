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

describe("ArtboardBuilder view model", () => {
  function build() {
    const ab = new ArtboardBuilder("V", 100, 100);
    const vm = ab.viewModel("V");
    const level = vm.number("level", 40);
    const poke = vm.trigger("poke");
    const mode = vm.enum("mode", ["a", "b"], "a");
    const tint = vm.color("tint", argb(1, 2, 3));
    const dot = ab.ellipse({ name: "dot", x: 50, y: 50, width: 10, height: 10, fill: argb(0, 0, 0) });
    ab.bind(dot.fillColor!, "color", tint);
    const low = ab.animation("low", 60, "loop").key(dot.shape, "x", [[0, 10]]);
    const high = ab.animation("high", 60, "loop").key(dot.shape, "x", [[0, 90]]);
    const sm = ab.stateMachine("V");
    const blend = sm.layer("level");
    blend.transition(blend.entry, blend.blend1D(level, [[0, low], [100, high]]));
    const modes = sm.layer("mode");
    const a = modes.play(low);
    const b = modes.play(high);
    modes.transition(modes.entry, a);
    modes.transition(modes.any, a, { conditions: [{ vm: mode, value: "a" }] });
    modes.transition(modes.any, b, { conditions: [{ vm: mode, value: "b" }] });
    modes.onStart(b, { set: level, value: 0 });
    sm.listen("press", dot.shape, "down", { fire: poke });
    return decodeRiv(ab.encode()).objects;
  }
  const of = (objects: ReturnType<typeof build>, type: number) => objects.filter((o) => o.type === type);

  it("writes the view model and its instance before the artboard, which binds to both", () => {
    const objects = build();
    const at = (type: number) => objects.findIndex((o) => o.type === type);
    expect(at(TYPE.viewModel)).toBeLessThan(at(TYPE.vmInstance));
    expect(at(TYPE.vmInstance)).toBeLessThan(at(TYPE.artboard));
    const artboard = objects[at(TYPE.artboard)];
    expect(artboard.props.get(key("abViewModelId"))).toBe(0);
    expect(of(objects, TYPE.dataEnumValue).map((o) => o.props.get(key("enumValueKey")))).toEqual(["a", "b"]);
  });

  it("writes an enum's first value explicitly, because id properties default to empty", () => {
    const objects = build();
    const initial = of(objects, TYPE.vmInstanceEnum)[0];
    expect(initial.props.get(key("vmEnumValue"))).toBe(0);
    const compared = of(objects, TYPE.valueEnumComparator).map((o) => o.props.get(key("compareEnum")));
    expect(compared).toEqual([0, 1]);
  });

  it("binds by path: view model 0, then the property's position", () => {
    const objects = build();
    const paths = of(objects, TYPE.dataBindContext).map((o) => o.props.get(key("bindSourcePath")));
    expect(paths).toContainEqual([0, 3]);
    expect(paths).toContainEqual([0, 0]);
    expect(paths).toContainEqual([0, 1]);
  });

  it("fires a trigger through the trigger converter and writes values back to the source", () => {
    const objects = build();
    expect(of(objects, TYPE.dataConverterTrigger)).toHaveLength(1);
    const binds = of(objects, TYPE.dataBindContext);
    const fire = binds.find((o) => (o.props.get(key("bindSourcePath")) as number[])[1] === 1)!;
    expect(fire.props.get(key("bindConverterId"))).toBe(0);
    expect(fire.props.get(key("bindFlags"))).toBe(1);
  });

  it("puts a state's actions after the state and before its transitions", () => {
    const objects = build();
    const actionAt = objects.findIndex((o) => o.type === TYPE.listenerVMChange && o.props.get(key("listenerActionFlags")) === 4);
    expect(actionAt).toBeGreaterThan(0);
    const before = objects.slice(0, actionAt).reverse();
    const lastLayerThing = before.find((o) => o.type === TYPE.animationState || o.type === TYPE.transition)!;
    expect(lastLayerThing.type).toBe(TYPE.animationState);
  });

  it("targets listeners at artboard components", () => {
    const objects = build();
    const listener = of(objects, TYPE.listener)[0];
    const artboardAt = objects.findIndex((o) => o.type === TYPE.artboard);
    const target = listener.props.get(key("listenerTargetId")) as number;
    expect(objects[artboardAt + target].props.get(key("name"))).toBe("dot");
  });
});
