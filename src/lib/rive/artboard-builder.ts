/**
 * Declarative builder over `riv-writer`. Shapes are declared in painter's order
 * (first declared is drawn first, at the back); the runtime draws the *last*
 * drawable in the file first, so the builder reverses them on encode.
 *
 * Indices are what make a `.riv` fragile by hand: a component's `parentId`, a
 * keyed object's `objectId` and a keyframe's `interpolatorId` are positions in
 * the artboard's component list, a state's `animationId` is a position in the
 * animation list, a transition's `stateToId` a position in its layer, and a
 * condition's `inputId` a position in the machine's inputs. The builder hands
 * out handles and resolves every index once, at encode time.
 */

import {
  CAP,
  CONDITION_OP,
  INTERPOLATION,
  JOIN,
  LOOP,
  TRANSITION_FLAG,
  TYPE,
  encodeRiv,
  type PropName,
  type Props,
  type RivObject,
} from "@/lib/rive/riv-writer";

export type Handle = { readonly label: string; id: number };

function handle(label: string): Handle {
  return { label, id: -1 };
}

function resolved(h: Handle): number {
  if (h.id < 0) throw new Error(`${h.label} was never placed in the artboard`);
  return h.id;
}

type Component = {
  handle: Handle;
  type: number;
  props: Props;
  parent: Handle | null;
  children: Component[];
};

export type StrokeSpec = {
  color: number;
  thickness: number;
  cap?: keyof typeof CAP;
  join?: keyof typeof JOIN;
};

export type PaintSpec = {
  fill?: number;
  stroke?: StrokeSpec;
};

export type ShapeHandles = {
  shape: Handle;
  path: Handle;
  fill?: Handle;
  fillColor?: Handle;
  stroke?: Handle;
  strokeColor?: Handle;
};

type Base = {
  name: string;
  x: number;
  y: number;
  parent?: Handle;
  opacity?: number;
};

/** Properties an animation can key, with the object kind that owns them. */
const KEYABLE = {
  x: 13,
  y: 14,
  rotation: 15,
  scaleX: 16,
  scaleY: 17,
  opacity: 18,
  width: 20,
  height: 21,
  thickness: 47,
} as const;
export type Keyable = keyof typeof KEYABLE;

/** [frame, value] or [frame, value, easing out of this key]. */
export type Key = readonly [number, number, Easing?];
export type Easing = Handle | "linear" | "hold";

type KeyedTrack =
  | { kind: "double"; target: Handle; property: number; keys: Key[] }
  | { kind: "color"; target: Handle; keys: Array<readonly [number, number, Easing?]> };

export class AnimationBuilder {
  readonly handle: Handle;
  readonly tracks: KeyedTrack[] = [];

  constructor(
    readonly name: string,
    readonly frames: number,
    readonly loop: keyof typeof LOOP,
    readonly fps: number,
  ) {
    this.handle = handle(`animation ${name}`);
  }

  key(target: Handle, property: Keyable, keys: Key[]): this {
    this.tracks.push({ kind: "double", target, property: KEYABLE[property], keys });
    return this;
  }

  /** Keys a `SolidColor`'s value. */
  keyColor(target: Handle, keys: Array<readonly [number, number, Easing?]>): this {
    this.tracks.push({ kind: "color", target, keys });
    return this;
  }
}

type Input = { handle: Handle; type: number; name: string; value?: boolean };

type Condition =
  | { trigger: Handle }
  | { bool: Handle; equals: boolean };

type Transition = {
  to: Handle;
  conditions: Condition[];
  /** Milliseconds of mix into the next state. */
  durationMs?: number;
  /** Leave once this share (0–100) of the source animation has played. */
  exitAtPercent?: number;
};

type State = {
  handle: Handle;
  type: number;
  animation?: AnimationBuilder;
  transitions: Transition[];
};

export class LayerBuilder {
  readonly states: State[] = [];
  readonly entry: Handle;
  readonly any: Handle;
  readonly exit: Handle;

  constructor(readonly name: string) {
    this.entry = this.add(TYPE.entryState, "entry");
    this.any = this.add(TYPE.anyState, "any");
    this.exit = this.add(TYPE.exitState, "exit");
  }

  private add(type: number, label: string, animation?: AnimationBuilder): Handle {
    const h = handle(`${this.name}/${label}`);
    this.states.push({ handle: h, type, animation, transitions: [] });
    return h;
  }

  play(animation: AnimationBuilder): Handle {
    return this.add(TYPE.animationState, animation.name, animation);
  }

  transition(from: Handle, to: Handle, options: Omit<Transition, "to"> = { conditions: [] }): this {
    const state = this.states.find((s) => s.handle === from);
    if (!state) throw new Error(`${from.label} is not a state of layer ${this.name}`);
    state.transitions.push({ to, ...options });
    return this;
  }
}

export class StateMachineBuilder {
  readonly inputs: Input[] = [];
  readonly layers: LayerBuilder[] = [];

  constructor(readonly name: string) {}

  trigger(name: string): Handle {
    const h = handle(`input ${name}`);
    this.inputs.push({ handle: h, type: TYPE.smTrigger, name });
    return h;
  }

  bool(name: string, value = false): Handle {
    const h = handle(`input ${name}`);
    this.inputs.push({ handle: h, type: TYPE.smBool, name, value });
    return h;
  }

  layer(name: string): LayerBuilder {
    const layer = new LayerBuilder(name);
    this.layers.push(layer);
    return layer;
  }
}

export class ArtboardBuilder {
  private readonly root: Handle = handle("artboard");
  private readonly groups: Component[] = [];
  private readonly drawables: Component[] = [];
  private readonly easings: Array<{ handle: Handle; props: Props }> = [];
  private readonly animations: AnimationBuilder[] = [];
  private readonly machines: StateMachineBuilder[] = [];

  constructor(
    readonly name: string,
    readonly width: number,
    readonly height: number,
  ) {}

  /** A transform-only node, for scaling or fading several shapes together. */
  group(spec: Base): Handle {
    const h = handle(`group ${spec.name}`);
    this.groups.push({
      handle: h,
      type: TYPE.node,
      props: { name: spec.name, x: spec.x, y: spec.y, opacity: spec.opacity },
      parent: spec.parent ?? null,
      children: [],
    });
    return h;
  }

  ellipse(spec: Base & PaintSpec & { width: number; height: number }): ShapeHandles {
    return this.shape(spec, TYPE.ellipse, { width: spec.width, height: spec.height });
  }

  rect(
    spec: Base &
      PaintSpec & {
        width: number;
        height: number;
        cornerRadius?: number;
        originX?: number;
        originY?: number;
      },
  ): ShapeHandles {
    return this.shape(spec, TYPE.rectangle, {
      width: spec.width,
      height: spec.height,
      cornerRadius: spec.cornerRadius,
      originX: spec.originX,
      originY: spec.originY,
    });
  }

  /** Straight-edged path; points are relative to (x, y). */
  polyline(spec: Base & PaintSpec & { points: ReadonlyArray<readonly [number, number]>; closed?: boolean }): ShapeHandles {
    const handles = this.shape(spec, TYPE.pointsPath, { isClosed: spec.closed ?? false });
    const path = this.drawables[this.drawables.length - 1].children[0];
    for (const [vx, vy] of spec.points) {
      path.children.push({
        handle: handle(`${spec.name} vertex`),
        type: TYPE.straightVertex,
        props: { vx, vy },
        parent: path.handle,
        children: [],
      });
    }
    return handles;
  }

  cubic(x1: number, y1: number, x2: number, y2: number): Handle {
    const h = handle(`cubic ${x1},${y1},${x2},${y2}`);
    this.easings.push({ handle: h, props: { x1, y1, x2, y2 } });
    return h;
  }

  animation(name: string, frames: number, loop: keyof typeof LOOP = "oneShot", fps = 60): AnimationBuilder {
    const a = new AnimationBuilder(name, frames, loop, fps);
    this.animations.push(a);
    return a;
  }

  stateMachine(name: string): StateMachineBuilder {
    const m = new StateMachineBuilder(name);
    this.machines.push(m);
    return m;
  }

  private shape(spec: Base & PaintSpec, pathType: number, pathProps: Props): ShapeHandles {
    const shapeHandle = handle(`shape ${spec.name}`);
    const pathHandle = handle(`path ${spec.name}`);
    const shape: Component = {
      handle: shapeHandle,
      type: TYPE.shape,
      props: { name: spec.name, x: spec.x, y: spec.y, opacity: spec.opacity },
      parent: spec.parent ?? null,
      children: [],
    };
    shape.children.push({
      handle: pathHandle,
      type: pathType,
      props: pathProps,
      parent: shapeHandle,
      children: [],
    });
    const out: ShapeHandles = { shape: shapeHandle, path: pathHandle };
    const paint = (type: number, extra: Props, color: number, label: string) => {
      const paintHandle = handle(`${label} ${spec.name}`);
      const colorHandle = handle(`${label} colour ${spec.name}`);
      shape.children.push({
        handle: paintHandle,
        type,
        props: extra,
        parent: shapeHandle,
        children: [
          {
            handle: colorHandle,
            type: TYPE.solidColor,
            props: { colorValue: color },
            parent: paintHandle,
            children: [],
          },
        ],
      });
      return [paintHandle, colorHandle] as const;
    };
    // Unlike drawables, a shape's paints draw in file order: fill first, so
    // the stroke lands on top of it.
    if (spec.fill !== undefined) {
      [out.fill, out.fillColor] = paint(TYPE.fill, {}, spec.fill, "fill");
    }
    if (spec.stroke) {
      [out.stroke, out.strokeColor] = paint(
        TYPE.stroke,
        {
          thickness: spec.stroke.thickness,
          cap: CAP[spec.stroke.cap ?? "round"],
          join: JOIN[spec.stroke.join ?? "round"],
        },
        spec.stroke.color,
        "stroke",
      );
    }
    this.drawables.push(shape);
    return out;
  }

  objects(): RivObject[] {
    const components: Array<{ component: Component | null; type: number; props: Props }> = [];
    this.root.id = 0;
    components.push({
      component: null,
      type: TYPE.artboard,
      props: {
        name: this.name,
        abWidth: this.width,
        abHeight: this.height,
        abClip: true,
        abOriginX: 0,
        abOriginY: 0,
      },
    });
    const place = (c: Component) => {
      c.handle.id = components.length;
      components.push({ component: c, type: c.type, props: c.props });
      for (const child of c.children) place(child);
    };
    for (const g of this.groups) place(g);
    for (const d of [...this.drawables].reverse()) place(d);
    for (const e of this.easings) {
      e.handle.id = components.length;
      components.push({ component: null, type: TYPE.cubicEase, props: e.props });
    }

    const out: RivObject[] = [{ type: TYPE.backboard, props: {} }];
    for (const { component, type, props } of components) {
      const withParent: Props = { ...props };
      if (component) withParent.parentId = resolved(component.parent ?? this.root);
      out.push({ type, props: stripUndefined(withParent) });
    }

    this.animations.forEach((a, i) => {
      a.handle.id = i;
      out.push({
        type: TYPE.linearAnimation,
        props: { animName: a.name, fps: a.fps, duration: a.frames, loop: LOOP[a.loop] },
      });
      for (const track of a.tracks) {
        out.push({ type: TYPE.keyedObject, props: { objectId: resolved(track.target) } });
        const property = track.kind === "double" ? track.property : 37;
        out.push({ type: TYPE.keyedProperty, props: { propertyKey: property } });
        for (const [frame, value, easing] of track.keys) {
          if (frame < 0 || frame > a.frames) {
            throw new Error(`${a.name}: key at frame ${frame} is outside 0–${a.frames}`);
          }
          const props: Props = { frame, ...easingProps(easing) };
          if (track.kind === "double") props.keyValue = value;
          else props.keyColor = value;
          out.push({
            type: track.kind === "double" ? TYPE.keyFrameDouble : TYPE.keyFrameColor,
            props,
          });
        }
      }
    });

    for (const machine of this.machines) {
      out.push({ type: TYPE.stateMachine, props: { animName: machine.name } });
      machine.inputs.forEach((input, i) => {
        input.handle.id = i;
        const props: Props = { smName: input.name };
        if (input.type === TYPE.smBool && input.value) props.smBoolValue = true;
        out.push({ type: input.type, props });
      });
      for (const layer of machine.layers) {
        layer.states.forEach((s, i) => (s.handle.id = i));
        out.push({ type: TYPE.smLayer, props: { smName: layer.name } });
        for (const state of layer.states) {
          out.push({
            type: state.type,
            props: state.animation ? { animationId: resolved(state.animation.handle) } : {},
          });
          for (const t of state.transitions) {
            let flags = 0;
            const props: Props = { stateToId: resolved(t.to) };
            if (t.exitAtPercent !== undefined) {
              flags |= TRANSITION_FLAG.enableExitTime | TRANSITION_FLAG.exitTimeIsPercentage;
              props.exitTime = t.exitAtPercent;
            }
            if (flags) props.transitionFlags = flags;
            if (t.durationMs) props.transitionDuration = t.durationMs;
            out.push({ type: TYPE.transition, props });
            for (const c of t.conditions) {
              if ("trigger" in c) {
                out.push({ type: TYPE.triggerCondition, props: { inputId: resolved(c.trigger) } });
              } else {
                out.push({
                  type: TYPE.boolCondition,
                  props: {
                    inputId: resolved(c.bool),
                    opValue: c.equals ? CONDITION_OP.equal : CONDITION_OP.notEqual,
                  },
                });
              }
            }
          }
        }
      }
    }
    return out;
  }

  encode(fileId = 0): Uint8Array {
    return encodeRiv(this.objects(), fileId);
  }
}

function easingProps(easing: Easing | undefined): Props {
  if (easing === undefined || easing === "linear") return { interpolationType: INTERPOLATION.linear };
  if (easing === "hold") return { interpolationType: INTERPOLATION.hold };
  return { interpolationType: INTERPOLATION.cubic, interpolatorId: resolved(easing) };
}

function stripUndefined(props: Props): Props {
  const out: Props = {};
  for (const [k, v] of Object.entries(props) as Array<[PropName, number | string | boolean | undefined]>) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
