/**
 * Declarative builder over `riv-writer`. Shapes are declared in painter's order
 * (first declared is drawn first, at the back); the runtime draws the *last*
 * drawable in the file first, so the builder reverses them on encode.
 *
 * Indices are what make a `.riv` fragile by hand: a component's `parentId`, a
 * keyed object's `objectId` and a keyframe's `interpolatorId` are positions in
 * the artboard's component list, a state's `animationId` is a position in the
 * animation list, a transition's `stateToId` a position in its layer, and a
 * condition's `inputId` a position in the machine's inputs. A data bind's
 * source path is (view model, property) positions in the file. The builder
 * hands out handles and resolves every index once, at encode time.
 *
 * Two ways to drive a machine:
 *   - state-machine inputs (`sm.trigger`, `sm.bool`): what the older
 *     illustrations use. The runtime deprecates them.
 *   - a view model (`ab.viewModel`): numbers, booleans, triggers, colours and
 *     enums the host sets through data binding. Transitions compare them,
 *     1D blend states mix animations by a number, listeners and state actions
 *     write them, and `ab.bind` ties one straight to a component property.
 */

import {
  ACTION_FLAG,
  BIND_FLAG,
  BLEND_MODE,
  CAP,
  CONDITION_OP,
  EASING,
  INTERPOLATION,
  JOIN,
  LAYER_STATE_FLAG,
  LISTENER_TYPE,
  LOOP,
  TRANSITION_FLAG,
  TRIM_MODE,
  TYPE,
  encodeRiv,
  type PropName,
  type PropValue,
  type Props,
  type RivObject,
} from "@/lib/rive/riv-writer";
import type { Contour, Vertex } from "@/lib/rive/path-data";

export type Handle = {
  readonly label: string;
  id: number;
  /** The colour property a `keyColor` or colour bind on this handle writes. */
  readonly colorProperty?: number;
};

function handle(label: string, colorProperty?: number): Handle {
  return { label, id: -1, colorProperty };
}

function resolved(h: Handle): number {
  if (h.id < 0) throw new Error(`${h.label} was never placed in the artboard`);
  return h.id;
}

type Bind = { propertyKey: number; prop: VMProp };

type Component = {
  handle: Handle;
  type: number;
  props: Props;
  parent: Handle | null;
  children: Component[];
  /** Properties that hold another component's index, resolved at encode. */
  links?: Partial<Record<PropName, Handle>>;
  /** Data binds from the view model onto this component, written right after it. */
  binds?: Bind[];
};

export type Gradient = {
  kind: "linear" | "radial";
  /** Local to the shape. A radial gradient's radius is the distance from `from` to `to`. */
  from: readonly [number, number];
  to: readonly [number, number];
  stops: ReadonlyArray<readonly [position: number, color: number]>;
};
export type Paint = number | Gradient;

export type TrimSpec = { start: number; end: number; offset?: number; mode?: keyof typeof TRIM_MODE };
export type FeatherSpec = { strength: number; offsetX?: number; offsetY?: number; inner?: boolean };

export type StrokeSpec = {
  color: Paint;
  thickness: number;
  cap?: keyof typeof CAP;
  join?: keyof typeof JOIN;
  trim?: TrimSpec;
};

export type PaintSpec = {
  fill?: Paint;
  stroke?: StrokeSpec;
  /** Soft edge on the fill (glows, shadows). */
  feather?: FeatherSpec;
  blend?: keyof typeof BLEND_MODE;
};

export type ContourHandles = { path: Handle; vertices: Handle[]; cubic: boolean };

export type ShapeHandles = {
  shape: Handle;
  path: Handle;
  fill?: Handle;
  fillColor?: Handle;
  fillStops?: Handle[];
  stroke?: Handle;
  strokeColor?: Handle;
  strokeStops?: Handle[];
  trim?: Handle;
  feather?: Handle;
  contours?: ContourHandles[];
};

type Base = {
  name: string;
  x: number;
  y: number;
  parent?: Handle;
  opacity?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
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
  cornerRadius: 31,
  thickness: 47,
  vertexX: 24,
  vertexY: 25,
  inRotation: 84,
  inDistance: 85,
  outRotation: 86,
  outDistance: 87,
  gradientOpacity: 46,
  stopPosition: 39,
  trimStart: 114,
  trimEnd: 115,
  trimOffset: 116,
  featherStrength: 749,
  strength: 172,
} as const;
export type Keyable = keyof typeof KEYABLE;

/** Properties a view-model number can be bound straight onto. */
const BINDABLE_NUMBER = {
  x: 13,
  y: 14,
  rotation: 15,
  scaleX: 16,
  scaleY: 17,
  opacity: 18,
  trimEnd: 115,
  trimOffset: 116,
} as const;

/** [frame, value] or [frame, value, easing out of this key]. */
export type Key = readonly [number, number, Easing?];
export type Easing = Handle | "linear" | "hold";

type KeyedTrack =
  | { kind: "double"; target: Handle; property: number; keys: Key[] }
  | { kind: "color"; target: Handle; property: number; keys: Array<readonly [number, number, Easing?]> };

const SOLID_COLOR = 37;
const STOP_COLOR = 38;

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

  /** Keys a `SolidColor`'s value or a gradient stop's colour. */
  keyColor(target: Handle, keys: Array<readonly [number, number, Easing?]>): this {
    this.tracks.push({ kind: "color", target, property: target.colorProperty ?? SOLID_COLOR, keys });
    return this;
  }

  /**
   * Keys every vertex of a contour through a list of poses with the same
   * vertex count. Handle angles are unwrapped against the previous pose, and a
   * zero-length handle borrows its neighbour's angle, so a morph never spins a
   * handle the long way round.
   */
  morph(target: ContourHandles, poses: Array<readonly [number, Contour, Easing?]>): this {
    const n = target.vertices.length;
    for (const [, pose] of poses) {
      if (pose.points.length !== n) {
        throw new Error(`${this.name}: morph pose has ${pose.points.length} vertices, contour has ${n}`);
      }
    }
    target.vertices.forEach((vertex, i) => {
      const pts = poses.map(([frame, pose, easing]) => ({ frame, easing, v: pose.points[i] }));
      this.key(vertex, "vertexX", pts.map((p): Key => [p.frame, p.v.x, p.easing]));
      this.key(vertex, "vertexY", pts.map((p): Key => [p.frame, p.v.y, p.easing]));
      if (!target.cubic) return;
      for (const side of ["in", "out"] as const) {
        const polar = pts.map((p) => handlePolar(p.v[side]));
        const angles = unwrapAngles(polar);
        const rotation = side === "in" ? "inRotation" : "outRotation";
        const distance = side === "in" ? "inDistance" : "outDistance";
        this.key(vertex, rotation, pts.map((p, k): Key => [p.frame, angles[k], p.easing]));
        this.key(vertex, distance, pts.map((p, k): Key => [p.frame, polar[k].distance, p.easing]));
      }
    });
    return this;
  }
}

function handlePolar(h: readonly [number, number] | undefined) {
  if (!h) return { rotation: NaN, distance: 0 };
  const distance = Math.hypot(h[0], h[1]);
  return { rotation: distance < 1e-6 ? NaN : Math.atan2(h[1], h[0]), distance: round4(distance) };
}

function unwrapAngles(polar: Array<{ rotation: number }>): number[] {
  const known = polar.map((p) => p.rotation);
  const first = known.find((a) => !Number.isNaN(a)) ?? 0;
  const out: number[] = [];
  let prev = first;
  for (const a of known) {
    if (Number.isNaN(a)) {
      out.push(round4(prev));
      continue;
    }
    let v = a;
    while (v - prev > Math.PI) v -= 2 * Math.PI;
    while (v - prev < -Math.PI) v += 2 * Math.PI;
    out.push(round4(v));
    prev = v;
  }
  return out;
}

const round4 = (n: number) => Math.round(n * 10000) / 10000;

type Input = { handle: Handle; type: number; name: string; value?: boolean };

/* ------------------------------------------------------------------ */
/* View model                                                          */
/* ------------------------------------------------------------------ */

export type VMKind = "number" | "boolean" | "trigger" | "color" | "enum";

export type VMProp<K extends VMKind = VMKind> = {
  readonly kind: K;
  readonly name: string;
  /** Position in the view model: the second id of every data-bind path. */
  readonly index: number;
  readonly initial: number | boolean;
  /** Enum only: the value names, in order. */
  readonly values?: readonly string[];
};

const VM_PROPERTY_TYPE: Record<VMKind, number> = {
  number: TYPE.vmPropertyNumber,
  boolean: TYPE.vmPropertyBoolean,
  trigger: TYPE.vmPropertyTrigger,
  color: TYPE.vmPropertyColor,
  enum: TYPE.vmPropertyEnumCustom,
};

const VM_INSTANCE: Record<VMKind, { type: number; value: PropName }> = {
  number: { type: TYPE.vmInstanceNumber, value: "vmNumberValue" },
  boolean: { type: TYPE.vmInstanceBoolean, value: "vmBooleanValue" },
  trigger: { type: TYPE.vmInstanceTrigger, value: "vmTriggerValue" },
  color: { type: TYPE.vmInstanceColor, value: "vmColorValue" },
  enum: { type: TYPE.vmInstanceEnum, value: "vmEnumValue" },
};

/** The state-machine-side stand-in for a view-model property, and the key a data bind writes on it. */
const BINDABLE: Record<VMKind, { type: number; key: number; value: PropName }> = {
  number: { type: TYPE.bindableNumber, key: 636, value: "bindableNumberValue" },
  boolean: { type: TYPE.bindableBoolean, key: 634, value: "bindableBooleanValue" },
  trigger: { type: TYPE.bindableTrigger, key: 686, value: "bindableTriggerValue" },
  color: { type: TYPE.bindableColor, key: 638, value: "bindableColorValue" },
  enum: { type: TYPE.bindableEnum, key: 637, value: "bindableEnumValue" },
};

export class ViewModelBuilder {
  readonly props: VMProp[] = [];

  constructor(readonly name: string) {}

  private add<K extends VMKind>(kind: K, name: string, initial: number | boolean, values?: readonly string[]): VMProp<K> {
    if (this.props.some((p) => p.name === name)) throw new Error(`view model ${this.name} already has ${name}`);
    const prop: VMProp<K> = { kind, name, index: this.props.length, initial, values };
    this.props.push(prop);
    return prop;
  }

  number(name: string, initial = 0): VMProp<"number"> {
    return this.add("number", name, initial);
  }

  boolean(name: string, initial = false): VMProp<"boolean"> {
    return this.add("boolean", name, initial);
  }

  trigger(name: string): VMProp<"trigger"> {
    return this.add("trigger", name, 0);
  }

  color(name: string, initial: number): VMProp<"color"> {
    return this.add("color", name, initial);
  }

  enum<const V extends string>(name: string, values: readonly V[], initial: V = values[0]): VMProp<"enum"> {
    const at = values.indexOf(initial);
    if (at < 0) throw new Error(`${name}: ${initial} is not one of ${values.join(", ")}`);
    return this.add("enum", name, at, values);
  }
}

function enumIndex(prop: VMProp, value: string | number | boolean): number {
  if (prop.kind !== "enum") return Number(value);
  const at = prop.values!.indexOf(String(value));
  if (at < 0) throw new Error(`${prop.name}: ${String(value)} is not one of ${prop.values!.join(", ")}`);
  return at;
}

/* ------------------------------------------------------------------ */
/* State machine                                                       */
/* ------------------------------------------------------------------ */

type Condition =
  | { trigger: Handle }
  | { bool: Handle; equals: boolean }
  | { vm: VMProp<"number" | "boolean" | "enum">; op?: keyof typeof CONDITION_OP; value: number | boolean | string }
  | { vmTrigger: VMProp<"trigger"> };

type Transition = {
  to: Handle;
  conditions: Condition[];
  /** Milliseconds of mix into the next state. */
  durationMs?: number;
  /** Leave once this share (0–100) of the source animation has played. */
  exitAtPercent?: number;
  /** Easing of the mix itself. */
  ease?: Handle;
};

/** Something a listener or a state does to the view model or the scene. */
export type Action =
  | { set: VMProp<"number" | "boolean" | "enum" | "color">; value: number | boolean | string }
  | { fire: VMProp<"trigger"> }
  | { align: Handle; preserveOffset?: boolean };

type State = {
  handle: Handle;
  type: number;
  animation?: AnimationBuilder;
  blend?: { prop: VMProp<"number">; entries: Array<readonly [number, AnimationBuilder]> };
  transitions: Transition[];
  onStart: Action[];
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
    this.states.push({ handle: h, type, animation, transitions: [], onStart: [] });
    return h;
  }

  play(animation: AnimationBuilder): Handle {
    return this.add(TYPE.animationState, animation.name, animation);
  }

  /**
   * A state that mixes animations by a view-model number: each entry is the
   * value at which that animation plays at full weight. Between two entries the
   * runtime blends their keyed values, so a number becomes continuous motion.
   */
  blend1D(prop: VMProp<"number">, entries: Array<readonly [number, AnimationBuilder]>, label = `blend ${prop.name}`): Handle {
    const h = this.add(TYPE.blendState1DViewModel, label);
    this.states[this.states.length - 1].blend = { prop, entries: [...entries].sort((a, b) => a[0] - b[0]) };
    return h;
  }

  transition(from: Handle, to: Handle, options: Omit<Transition, "to"> = { conditions: [] }): this {
    this.stateOf(from).transitions.push({ to, ...options });
    return this;
  }

  /** Actions performed when a state starts: the non-deprecated way to report a state to the host. */
  onStart(state: Handle, ...actions: Action[]): this {
    this.stateOf(state).onStart.push(...actions);
    return this;
  }

  private stateOf(h: Handle): State {
    const state = this.states.find((s) => s.handle === h);
    if (!state) throw new Error(`${h.label} is not a state of layer ${this.name}`);
    return state;
  }
}

type Listener = { name: string; target: Handle; type: keyof typeof LISTENER_TYPE; actions: Action[] };

export class StateMachineBuilder {
  readonly inputs: Input[] = [];
  readonly layers: LayerBuilder[] = [];
  readonly listeners: Listener[] = [];

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

  /** Pointer handling inside the file: `target` is the shape that is hit-tested. */
  listen(name: string, target: Handle, type: keyof typeof LISTENER_TYPE, ...actions: Action[]): this {
    this.listeners.push({ name, target, type, actions });
    return this;
  }
}

/* ------------------------------------------------------------------ */
/* Artboard                                                            */
/* ------------------------------------------------------------------ */

type Easer = { handle: Handle; type: number; props: Props };

export type TranslationConstraintSpec = {
  /** Share of the target's translation copied, per axis. */
  copyFactor: number;
  copyFactorY?: number;
  /** Add the copied share to the owner's own translation instead of replacing it. */
  offset?: boolean;
  /** Clamp the result, in the owner's parent space. */
  limit?: { minX: number; maxX: number; minY: number; maxY: number };
  /** 0 world, 1 local. Local reads the target's offset from its parent. */
  sourceSpace?: 0 | 1;
  destSpace?: 0 | 1;
  strength?: number;
};

export class ArtboardBuilder {
  private readonly root: Handle = handle("artboard");
  private readonly groups: Component[] = [];
  private readonly drawables: Component[] = [];
  private readonly byHandle = new Map<Handle, Component>();
  private readonly easings: Easer[] = [];
  private readonly animations: AnimationBuilder[] = [];
  private readonly machines: StateMachineBuilder[] = [];
  private vm: ViewModelBuilder | null = null;

  constructor(
    readonly name: string,
    readonly width: number,
    readonly height: number,
  ) {}

  /** The artboard's view model. One per artboard; the runtime binds its default instance. */
  viewModel(name: string): ViewModelBuilder {
    if (this.vm) throw new Error(`${this.name} already has view model ${this.vm.name}`);
    this.vm = new ViewModelBuilder(name);
    return this.vm;
  }

  /** A transform-only node, for scaling or fading several shapes together. */
  group(spec: Base): Handle {
    const h = handle(`group ${spec.name}`);
    const c: Component = {
      handle: h,
      type: TYPE.node,
      props: transformProps(spec),
      parent: spec.parent ?? null,
      children: [],
    };
    this.groups.push(c);
    this.byHandle.set(h, c);
    return h;
  }

  ellipse(spec: Base & PaintSpec & { width: number; height: number }): ShapeHandles {
    return this.shape(spec, [{ type: TYPE.ellipse, props: { width: spec.width, height: spec.height } }]);
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
    return this.shape(spec, [
      {
        type: TYPE.rectangle,
        props: {
          width: spec.width,
          height: spec.height,
          cornerRadius: spec.cornerRadius,
          originX: spec.originX,
          originY: spec.originY,
        },
      },
    ]);
  }

  /** Straight-edged path; points are relative to (x, y). */
  polyline(spec: Base & PaintSpec & { points: ReadonlyArray<readonly [number, number]>; closed?: boolean }): ShapeHandles {
    const contour: Contour = { closed: spec.closed ?? false, points: spec.points.map(([x, y]) => ({ x, y })) };
    return this.shape(spec, [], [contour], false);
  }

  /**
   * A curved path of one or more contours, relative to (x, y); see
   * `parsePath` for SVG path data. `cubic: true` writes every vertex with
   * handles, which a contour needs if an animation will morph it.
   */
  path(spec: Base & PaintSpec & { contours: Contour[]; cubic?: boolean }): ShapeHandles {
    return this.shape(spec, [], spec.contours, spec.cubic ?? false);
  }

  /** Clips `owner`'s drawn children to `source`'s geometry. The source shape needs no paint. */
  clip(owner: Handle, source: ShapeHandles): Handle {
    const h = handle(`clip ${owner.label}`);
    this.componentOf(owner).children.push({
      handle: h,
      type: TYPE.clippingShape,
      props: {},
      parent: owner,
      children: [],
      links: { clipSourceId: source.shape },
    });
    return h;
  }

  /** Moves `owner` by a share of `target`'s translation, e.g. pupils following a pointer target. */
  translationConstraint(owner: Handle, target: Handle, spec: TranslationConstraintSpec): Handle {
    const h = handle(`constraint ${owner.label}`);
    const props: Props = {
      strength: spec.strength,
      sourceSpace: spec.sourceSpace ?? 1,
      destSpace: spec.destSpace ?? 1,
      copyFactor: spec.copyFactor,
      copyFactorY: spec.copyFactorY ?? spec.copyFactor,
      doesCopy: true,
      doesCopyY: true,
      constraintOffset: spec.offset || undefined,
    };
    if (spec.limit) {
      Object.assign(props, {
        minMaxSpace: 1,
        min: true,
        max: true,
        minY: true,
        maxY: true,
        minValue: spec.limit.minX,
        maxValue: spec.limit.maxX,
        minValueY: spec.limit.minY,
        maxValueY: spec.limit.maxY,
      });
    }
    this.componentOf(owner).children.push({
      handle: h,
      type: TYPE.translationConstraint,
      props,
      parent: owner,
      children: [],
      links: { constraintTargetId: target },
    });
    return h;
  }

  /**
   * Ties a component property straight to a view-model property, no state
   * machine involved: the host sets the value and the next frame draws it.
   */
  bind(target: Handle, property: "color" | keyof typeof BINDABLE_NUMBER, prop: VMProp): this {
    const component = this.componentOf(target);
    let propertyKey: number;
    if (property === "color") {
      if (prop.kind !== "color") throw new Error(`${prop.name} is not a colour`);
      if (target.colorProperty === undefined) throw new Error(`${target.label} has no colour to bind`);
      propertyKey = target.colorProperty;
    } else {
      if (prop.kind !== "number") throw new Error(`${prop.name} is not a number`);
      propertyKey = BINDABLE_NUMBER[property];
    }
    (component.binds ??= []).push({ propertyKey, prop });
    return this;
  }

  cubic(x1: number, y1: number, x2: number, y2: number): Handle {
    const h = handle(`cubic ${x1},${y1},${x2},${y2}`);
    this.easings.push({ handle: h, type: TYPE.cubicEase, props: { x1, y1, x2, y2 } });
    return h;
  }

  /** Overshoot and settle; `period` in the eased unit (smaller is springier). */
  elastic(easing: keyof typeof EASING, amplitude = 1, period = 0.5): Handle {
    const h = handle(`elastic ${easing} ${amplitude} ${period}`);
    this.easings.push({ handle: h, type: TYPE.elasticInterpolator, props: { easingValue: EASING[easing], amplitude, period } });
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

  private componentOf(h: Handle): Component {
    const c = this.byHandle.get(h);
    if (!c) throw new Error(`${h.label} is not a component of ${this.name}`);
    return c;
  }

  private child(parent: Component, type: number, props: Props, label: string, colorProperty?: number): Component {
    const c: Component = { handle: handle(label, colorProperty), type, props, parent: parent.handle, children: [] };
    parent.children.push(c);
    this.byHandle.set(c.handle, c);
    return c;
  }

  private shape(
    spec: Base & PaintSpec,
    parametric: Array<{ type: number; props: Props }>,
    contours: Contour[] = [],
    cubic = false,
  ): ShapeHandles {
    const shapeHandle = handle(`shape ${spec.name}`);
    const shapeProps = transformProps(spec);
    if (spec.blend) shapeProps.blendMode = BLEND_MODE[spec.blend];
    const shape: Component = {
      handle: shapeHandle,
      type: TYPE.shape,
      props: shapeProps,
      parent: spec.parent ?? null,
      children: [],
    };
    this.byHandle.set(shapeHandle, shape);
    const out: ShapeHandles = { shape: shapeHandle, path: shapeHandle };

    const paths: Component[] = parametric.map((p) => this.child(shape, p.type, p.props, `path ${spec.name}`));
    if (contours.length) out.contours = [];
    for (const contour of contours) {
      const path = this.child(shape, TYPE.pointsPath, { isClosed: contour.closed }, `path ${spec.name}`);
      const vertices = contour.points.map((v, i) => this.vertex(path, v, cubic, `${spec.name} vertex ${i}`));
      out.contours!.push({ path: path.handle, vertices, cubic: cubic || contour.points.some((v) => v.in || v.out) });
      paths.push(path);
    }
    out.path = paths[0]?.handle ?? shapeHandle;

    // Unlike drawables, a shape's paints draw in file order: fill first, so
    // the stroke lands on top of it.
    if (spec.fill !== undefined) {
      const fill = this.child(shape, TYPE.fill, {}, `fill ${spec.name}`);
      out.fill = fill.handle;
      const paint = this.paint(fill, spec.fill, `fill colour ${spec.name}`);
      out.fillColor = paint.color;
      out.fillStops = paint.stops;
      if (spec.feather) {
        out.feather = this.child(
          fill,
          TYPE.feather,
          {
            featherStrength: spec.feather.strength,
            featherOffsetX: spec.feather.offsetX,
            featherOffsetY: spec.feather.offsetY,
            featherInner: spec.feather.inner || undefined,
          },
          `feather ${spec.name}`,
        ).handle;
      }
    }
    if (spec.stroke) {
      const stroke = this.child(
        shape,
        TYPE.stroke,
        {
          thickness: spec.stroke.thickness,
          cap: CAP[spec.stroke.cap ?? "round"],
          join: JOIN[spec.stroke.join ?? "round"],
        },
        `stroke ${spec.name}`,
      );
      out.stroke = stroke.handle;
      const paint = this.paint(stroke, spec.stroke.color, `stroke colour ${spec.name}`);
      out.strokeColor = paint.color;
      out.strokeStops = paint.stops;
      if (spec.stroke.trim) {
        const t = spec.stroke.trim;
        out.trim = this.child(
          stroke,
          TYPE.trimPath,
          { trimStart: t.start, trimEnd: t.end, trimOffset: t.offset, trimMode: TRIM_MODE[t.mode ?? "sequential"] },
          `trim ${spec.name}`,
        ).handle;
      }
    }
    this.drawables.push(shape);
    return out;
  }

  private vertex(path: Component, v: Vertex, cubic: boolean, label: string): Handle {
    if (!cubic && !v.in && !v.out) {
      return this.child(path, TYPE.straightVertex, { vx: v.x, vy: v.y }, label).handle;
    }
    const inP = handlePolar(v.in);
    const outP = handlePolar(v.out);
    const inRotation = Number.isNaN(inP.rotation) ? (Number.isNaN(outP.rotation) ? 0 : outP.rotation + Math.PI) : inP.rotation;
    const outRotation = Number.isNaN(outP.rotation) ? inRotation + Math.PI : outP.rotation;
    return this.child(
      path,
      TYPE.cubicDetachedVertex,
      {
        vx: v.x,
        vy: v.y,
        inRotation: round4(inRotation),
        inDistance: inP.distance,
        outRotation: round4(outRotation),
        outDistance: outP.distance,
      },
      label,
    ).handle;
  }

  private paint(owner: Component, paint: Paint, label: string): { color?: Handle; stops?: Handle[] } {
    if (typeof paint === "number") {
      return { color: this.child(owner, TYPE.solidColor, { colorValue: paint }, label, SOLID_COLOR).handle };
    }
    const gradient = this.child(
      owner,
      paint.kind === "linear" ? TYPE.linearGradient : TYPE.radialGradient,
      { startX: paint.from[0], startY: paint.from[1], endX: paint.to[0], endY: paint.to[1] },
      `${label} gradient`,
    );
    const stops = paint.stops.map(
      ([position, color], i) =>
        this.child(gradient, TYPE.gradientStop, { stopColor: color, stopPosition: position }, `${label} stop ${i}`, STOP_COLOR).handle,
    );
    return { stops };
  }

  objects(): RivObject[] {
    const vm = this.vm;
    const machinesUseTriggers = this.machines.some((m) =>
      m.listeners.some((l) => l.actions.some((a) => "fire" in a)) ||
      m.layers.some((layer) => layer.states.some((s) => s.onStart.some((a) => "fire" in a))),
    );
    const out: RivObject[] = [{ type: TYPE.backboard, props: {} }];

    // File level: converters, enums, the view model and its default instance.
    const TRIGGER_CONVERTER = 0;
    if (machinesUseTriggers) out.push({ type: TYPE.dataConverterTrigger, props: { name: "fire" } });
    if (vm) {
      let enumCount = 0;
      const enumIds = new Map<VMProp, number>();
      for (const p of vm.props) {
        if (p.kind !== "enum") continue;
        enumIds.set(p, enumCount++);
        out.push({ type: TYPE.dataEnumCustom, props: { enumName: p.name } });
        for (const key of p.values!) out.push({ type: TYPE.dataEnumValue, props: { enumValueKey: key } });
      }
      out.push({ type: TYPE.viewModel, props: { vmName: vm.name } });
      for (const p of vm.props) {
        const props: Props = { vmName: p.name };
        if (p.kind === "enum") props.enumId = enumIds.get(p);
        out.push({ type: VM_PROPERTY_TYPE[p.kind], props });
      }
      out.push({ type: TYPE.vmInstance, props: { vmName: "default", vmInstanceViewModelId: 0 } });
      for (const p of vm.props) {
        const props: Props = { vmPropertyId: p.index };
        // Enum values are ids, which default to "empty" rather than 0.
        if (p.kind === "enum" || (p.kind !== "trigger" && p.initial !== 0 && p.initial !== false)) {
          props[VM_INSTANCE[p.kind].value] = p.initial;
        }
        out.push({ type: VM_INSTANCE[p.kind].type, props });
      }
    }

    const components: Component[] = [];
    this.root.id = 0;
    const place = (c: Component) => {
      c.handle.id = components.length + 1;
      components.push(c);
      for (const child of c.children) place(child);
    };
    for (const g of this.groups) place(g);
    for (const d of [...this.drawables].reverse()) place(d);
    const easeBase = components.length + 1;
    this.easings.forEach((e, i) => (e.handle.id = easeBase + i));

    const artboardProps: Props = {
      name: this.name,
      abWidth: this.width,
      abHeight: this.height,
      abClip: true,
      abOriginX: 0,
      abOriginY: 0,
    };
    if (vm) {
      artboardProps.abViewModelId = 0;
      artboardProps.abDefaultStateMachineId = 0;
    }
    out.push({ type: TYPE.artboard, props: artboardProps });
    const path = (p: VMProp) => [0, p.index];
    for (const c of components) {
      const props: Props = { ...c.props, parentId: resolved(c.parent ?? this.root) };
      for (const [name, target] of Object.entries(c.links ?? {}) as Array<[PropName, Handle]>) props[name] = resolved(target);
      out.push({ type: c.type, props: stripUndefined(props) });
      for (const b of c.binds ?? []) {
        out.push({ type: TYPE.dataBindContext, props: { bindPropertyKey: b.propertyKey, bindSourcePath: path(b.prop) } });
      }
    }
    for (const e of this.easings) out.push({ type: e.type, props: e.props });

    this.animations.forEach((a, i) => {
      a.handle.id = i;
      out.push({
        type: TYPE.linearAnimation,
        props: { animName: a.name, fps: a.fps, duration: a.frames, loop: LOOP[a.loop] },
      });
      for (const track of a.tracks) {
        out.push({ type: TYPE.keyedObject, props: { objectId: resolved(track.target) } });
        out.push({ type: TYPE.keyedProperty, props: { propertyKey: track.property } });
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

    // A bindable property stands in for a view-model value inside the machine;
    // the data bind right after it names the source, and the object after that
    // (a comparator, a blend state, an action) picks it up from the import stack.
    const bindable = (p: VMProp, toSource: boolean, value?: PropValue) => {
      const b = BINDABLE[p.kind];
      const props: Props = {};
      if (value !== undefined && (p.kind === "enum" || (value !== 0 && value !== false))) props[b.value] = value;
      out.push({ type: b.type, props });
      const bind: Props = { bindPropertyKey: b.key, bindSourcePath: path(p) };
      if (toSource) bind.bindFlags = BIND_FLAG.toSource;
      if (toSource && p.kind === "trigger") bind.bindConverterId = TRIGGER_CONVERTER;
      out.push({ type: TYPE.dataBindContext, props: bind });
    };
    const action = (a: Action, flags?: number) => {
      if ("align" in a) {
        out.push({
          type: TYPE.listenerAlignTarget,
          props: stripUndefined({ alignTargetId: resolved(a.align), alignPreserveOffset: a.preserveOffset || undefined }),
        });
        return;
      }
      if (!vm) throw new Error(`${this.name}: a view-model action needs a view model`);
      if ("fire" in a) bindable(a.fire, true);
      else bindable(a.set, true, a.set.kind === "enum" ? enumIndex(a.set, a.value) : (a.value as PropValue));
      out.push({ type: TYPE.listenerVMChange, props: flags ? { listenerActionFlags: flags } : {} });
    };

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
          if (state.blend) {
            bindable(state.blend.prop, false);
            out.push({ type: state.type, props: { layerStateFlags: LAYER_STATE_FLAG.reset } });
            for (const [value, animation] of state.blend.entries) {
              out.push({
                type: TYPE.blendAnimation1D,
                props: stripUndefined({ blendAnimationId: resolved(animation.handle), blendValue: value || undefined }),
              });
            }
          } else {
            out.push({
              type: state.type,
              props: state.animation ? { animationId: resolved(state.animation.handle) } : {},
            });
          }
          // A state's actions must come before its transitions: an action binds
          // to the latest state *or transition* on the import stack.
          for (const a of state.onStart) action(a, ACTION_FLAG.stateStart);
          for (const t of state.transitions) {
            let flags = 0;
            const props: Props = { stateToId: resolved(t.to) };
            if (t.exitAtPercent !== undefined) {
              flags |= TRANSITION_FLAG.enableExitTime | TRANSITION_FLAG.exitTimeIsPercentage;
              props.exitTime = t.exitAtPercent;
            }
            if (flags) props.transitionFlags = flags;
            if (t.durationMs) props.transitionDuration = t.durationMs;
            if (t.ease) {
              props.transitionInterpolation = INTERPOLATION.cubic;
              props.transitionInterpolatorId = resolved(t.ease);
            }
            out.push({ type: TYPE.transition, props });
            for (const c of t.conditions) {
              if ("trigger" in c) {
                out.push({ type: TYPE.triggerCondition, props: { inputId: resolved(c.trigger) } });
              } else if ("bool" in c) {
                out.push({
                  type: TYPE.boolCondition,
                  props: {
                    inputId: resolved(c.bool),
                    opValue: c.equals ? CONDITION_OP.equal : CONDITION_OP.notEqual,
                  },
                });
              } else if ("vmTrigger" in c) {
                out.push({ type: TYPE.vmCondition, props: {} });
                bindable(c.vmTrigger, false);
                out.push({ type: TYPE.vmPropertyComparator, props: {} });
                out.push({ type: TYPE.valueTriggerComparator, props: {} });
              } else {
                const op = CONDITION_OP[c.op ?? "equal"];
                out.push({ type: TYPE.vmCondition, props: op ? { vmConditionOp: op } : {} });
                bindable(c.vm, false);
                out.push({ type: TYPE.vmPropertyComparator, props: {} });
                if (c.vm.kind === "number") {
                  out.push({ type: TYPE.valueNumberComparator, props: { compareNumber: Number(c.value) } });
                } else if (c.vm.kind === "boolean") {
                  out.push({ type: TYPE.valueBooleanComparator, props: c.value ? { compareBoolean: true } : {} });
                } else {
                  out.push({ type: TYPE.valueEnumComparator, props: { compareEnum: enumIndex(c.vm, c.value) } });
                }
              }
            }
          }
        }
      }
      for (const l of machine.listeners) {
        out.push({
          type: TYPE.listener,
          props: { smName: l.name, listenerTargetId: resolved(l.target), listenerType: LISTENER_TYPE[l.type] },
        });
        for (const a of l.actions) action(a);
      }
    }
    return out;
  }

  encode(fileId = 0): Uint8Array {
    return encodeRiv(this.objects(), fileId);
  }
}

function transformProps(spec: Base): Props {
  return {
    name: spec.name,
    x: spec.x,
    y: spec.y,
    rotation: spec.rotation,
    scaleX: spec.scaleX,
    scaleY: spec.scaleY,
    opacity: spec.opacity,
  };
}

function easingProps(easing: Easing | undefined): Props {
  if (easing === undefined || easing === "linear") return { interpolationType: INTERPOLATION.linear };
  if (easing === "hold") return { interpolationType: INTERPOLATION.hold };
  return { interpolationType: INTERPOLATION.cubic, interpolatorId: resolved(easing) };
}

function stripUndefined(props: Props): Props {
  const out: Props = {};
  for (const [k, v] of Object.entries(props) as Array<[PropName, PropValue | undefined]>) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
