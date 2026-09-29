/**
 * A minimal writer for the Rive runtime format (major version 7).
 *
 * The Rive editor is the usual way to make a `.riv`. This repo builds its
 * illustrations from code instead, so that an illustration can carry values
 * computed from a frozen model and be regenerated when the model changes. The
 * format is the one the open-source runtime reads (`rive-runtime/src/file.cpp`):
 * a `RIVE` fingerprint, varuint versions and file id, an empty property table of
 * contents, then a flat stream of objects. Each object is a varuint type key and
 * a list of (property key, value) pairs terminated by key 0. Hierarchy is
 * expressed with `parentId`, an index into the artboard's component list, where
 * the artboard itself is 0.
 *
 * Only the object types the illustrations use are listed. Type and property
 * keys are copied from the runtime's generated `*_base.hpp` headers, read at
 * the rive-runtime commit the pinned `@rive-app/canvas` was built from; the
 * object order for view models, data binds and listeners follows the editor's
 * own exports in that repo's `tests/unit_tests/assets`.
 */

export const RIV_MAJOR = 7;
export const RIV_MINOR = 0;

type Kind = "uint" | "string" | "double" | "color" | "bool" | "bytes";

export const TYPE = {
  backboard: 23,
  artboard: 1,
  node: 2,
  shape: 3,
  ellipse: 4,
  rectangle: 7,
  pointsPath: 16,
  straightVertex: 5,
  cubicDetachedVertex: 6,
  fill: 20,
  stroke: 24,
  solidColor: 18,
  linearGradient: 22,
  radialGradient: 17,
  gradientStop: 19,
  trimPath: 47,
  feather: 533,
  clippingShape: 42,
  translationConstraint: 87,
  cubicEase: 28,
  elasticInterpolator: 174,
  linearAnimation: 31,
  keyedObject: 25,
  keyedProperty: 26,
  keyFrameDouble: 30,
  keyFrameColor: 37,
  stateMachine: 53,
  smTrigger: 58,
  smBool: 59,
  smNumber: 56,
  smLayer: 57,
  animationState: 61,
  entryState: 63,
  anyState: 62,
  exitState: 64,
  blendState1DViewModel: 528,
  blendAnimation1D: 75,
  transition: 65,
  triggerCondition: 68,
  boolCondition: 71,
  // View models and data binding
  dataEnumCustom: 438,
  dataEnumValue: 445,
  dataConverterTrigger: 504,
  viewModel: 435,
  vmPropertyNumber: 431,
  vmPropertyBoolean: 448,
  vmPropertyTrigger: 502,
  vmPropertyColor: 440,
  vmPropertyEnumCustom: 439,
  vmInstance: 437,
  vmInstanceNumber: 442,
  vmInstanceBoolean: 449,
  vmInstanceTrigger: 501,
  vmInstanceColor: 426,
  vmInstanceEnum: 432,
  dataBindContext: 447,
  bindableNumber: 473,
  bindableBoolean: 472,
  bindableTrigger: 503,
  bindableColor: 475,
  bindableEnum: 474,
  vmCondition: 482,
  vmPropertyComparator: 479,
  valueNumberComparator: 484,
  valueBooleanComparator: 481,
  valueTriggerComparator: 505,
  valueEnumComparator: 485,
  listener: 114,
  listenerVMChange: 487,
  listenerAlignTarget: 126,
} as const;

/** Property key and wire kind. */
export const PROP = {
  name: [4, "string"],
  parentId: [5, "uint"],
  // Artboard / layout
  abWidth: [7, "double"],
  abHeight: [8, "double"],
  abClip: [196, "bool"],
  abOriginX: [11, "double"],
  abOriginY: [12, "double"],
  // Transform
  x: [13, "double"],
  y: [14, "double"],
  rotation: [15, "double"],
  scaleX: [16, "double"],
  scaleY: [17, "double"],
  opacity: [18, "double"],
  // Parametric path
  width: [20, "double"],
  height: [21, "double"],
  originX: [123, "double"],
  originY: [124, "double"],
  cornerRadius: [31, "double"],
  // Points path + vertices
  isClosed: [32, "bool"],
  vx: [24, "double"],
  vy: [25, "double"],
  inRotation: [84, "double"],
  inDistance: [85, "double"],
  outRotation: [86, "double"],
  outDistance: [87, "double"],
  // Drawable
  blendMode: [23, "uint"],
  // Paint
  colorValue: [37, "color"],
  thickness: [47, "double"],
  cap: [48, "uint"],
  join: [49, "uint"],
  // Gradient, in the shape's local space; a radial gradient's radius is |end − start|
  startX: [42, "double"],
  startY: [33, "double"],
  endX: [34, "double"],
  endY: [35, "double"],
  gradientOpacity: [46, "double"],
  stopColor: [38, "color"],
  stopPosition: [39, "double"],
  // Trim path (a stroke effect), 0–1 of the path's length
  trimStart: [114, "double"],
  trimEnd: [115, "double"],
  trimOffset: [116, "double"],
  trimMode: [117, "uint"],
  // Feather (soft edge on a paint)
  featherStrength: [749, "double"],
  featherOffsetX: [750, "double"],
  featherOffsetY: [751, "double"],
  featherInner: [752, "bool"],
  // Clipping shape
  clipSourceId: [92, "uint"],
  // Constraints
  strength: [172, "double"],
  constraintTargetId: [173, "uint"],
  sourceSpace: [179, "uint"],
  destSpace: [180, "uint"],
  copyFactor: [182, "double"],
  constraintOffset: [188, "bool"],
  minMaxSpace: [195, "uint"],
  minValue: [183, "double"],
  maxValue: [184, "double"],
  doesCopy: [189, "bool"],
  min: [190, "bool"],
  max: [191, "bool"],
  copyFactorY: [185, "double"],
  minValueY: [186, "double"],
  maxValueY: [187, "double"],
  doesCopyY: [192, "bool"],
  minY: [193, "bool"],
  maxY: [194, "bool"],
  // Interpolator
  x1: [63, "double"],
  y1: [64, "double"],
  x2: [65, "double"],
  y2: [66, "double"],
  easingValue: [405, "uint"],
  amplitude: [406, "double"],
  period: [407, "double"],
  // Animation
  animName: [55, "string"],
  fps: [56, "uint"],
  duration: [57, "uint"],
  speed: [58, "double"],
  loop: [59, "uint"],
  objectId: [51, "uint"],
  propertyKey: [53, "uint"],
  frame: [67, "uint"],
  interpolationType: [68, "uint"],
  interpolatorId: [69, "uint"],
  keyValue: [70, "double"],
  keyColor: [88, "color"],
  // State machine
  smName: [138, "string"],
  smBoolValue: [141, "bool"],
  animationId: [149, "uint"],
  stateToId: [151, "uint"],
  transitionFlags: [152, "uint"],
  transitionDuration: [158, "uint"],
  exitTime: [160, "uint"],
  transitionInterpolation: [349, "uint"],
  transitionInterpolatorId: [350, "uint"],
  inputId: [155, "uint"],
  opValue: [156, "uint"],
  layerStateFlags: [536, "uint"],
  blendAnimationId: [165, "uint"],
  blendValue: [166, "double"],
  // Artboard ↔ view model
  abViewModelId: [583, "uint"],
  abDefaultStateMachineId: [236, "uint"],
  // View models
  vmName: [557, "string"],
  enumName: [572, "string"],
  enumValueKey: [578, "string"],
  enumId: [574, "uint"],
  vmInstanceViewModelId: [566, "uint"],
  vmPropertyId: [554, "uint"],
  vmNumberValue: [575, "double"],
  vmBooleanValue: [593, "bool"],
  vmTriggerValue: [687, "uint"],
  vmColorValue: [555, "color"],
  vmEnumValue: [560, "uint"],
  // Data binding
  bindPropertyKey: [586, "uint"],
  bindFlags: [587, "uint"],
  bindConverterId: [660, "uint"],
  bindSourcePath: [588, "bytes"],
  bindableNumberValue: [636, "double"],
  bindableBooleanValue: [634, "bool"],
  bindableColorValue: [638, "color"],
  bindableEnumValue: [637, "uint"],
  bindableTriggerValue: [686, "uint"],
  vmConditionOp: [650, "uint"],
  compareNumber: [652, "double"],
  compareBoolean: [647, "bool"],
  compareEnum: [653, "uint"],
  compareTrigger: [689, "uint"],
  // Listeners
  listenerTargetId: [224, "uint"],
  listenerType: [225, "uint"],
  listenerActionFlags: [980, "uint"],
  alignTargetId: [240, "uint"],
  alignPreserveOffset: [541, "bool"],
} as const satisfies Record<string, readonly [number, Kind]>;

export type PropName = keyof typeof PROP;
/** A `bytes` property is a list of ids, each written as a varuint. */
export type PropValue = number | string | boolean | readonly number[];
export type Props = Partial<Record<PropName, PropValue>>;

export const LOOP = { oneShot: 0, loop: 1, pingPong: 2 } as const;
export const INTERPOLATION = { hold: 0, linear: 1, cubic: 2 } as const;
export const TRANSITION_FLAG = {
  durationIsPercentage: 1 << 1,
  enableExitTime: 1 << 2,
  exitTimeIsPercentage: 1 << 3,
} as const;
export const CONDITION_OP = {
  equal: 0,
  notEqual: 1,
  lessThanOrEqual: 2,
  greaterThanOrEqual: 3,
  lessThan: 4,
  greaterThan: 5,
} as const;

/** `DataBindFlags`: direction bit 0 (0 = source → target). */
export const BIND_FLAG = { toTarget: 0, toSource: 1 } as const;
/** `LayerStateFlags.Reset`: a blend state resets keyed values it does not own. */
export const LAYER_STATE_FLAG = { reset: 1 << 1 } as const;
/** `ListenerAction.flags`: bit 0 is start/end, bits 1–2 the owner (listener, transition, state). */
export const ACTION_FLAG = { stateStart: 2 << 1, stateEnd: (2 << 1) | 1 } as const;
export const LISTENER_TYPE = { enter: 0, exit: 1, down: 2, up: 3, move: 4, click: 6 } as const;
export const TRIM_MODE = { sequential: 1, synchronized: 2 } as const;
export const EASING = { in: 0, out: 1, inOut: 2 } as const;
export const BLEND_MODE = {
  srcOver: 3,
  screen: 14,
  overlay: 15,
  lighten: 17,
  colorDodge: 18,
  multiply: 24,
} as const;

/** Stroke cap / join enums as the runtime numbers them. */
export const CAP = { butt: 0, round: 1, square: 2 } as const;
export const JOIN = { miter: 0, round: 1, bevel: 2 } as const;

const KIND_BY_KEY = new Map<number, Kind>(
  Object.values(PROP).map(([key, kind]) => [key, kind]),
);

class Bytes {
  private out: number[] = [];

  byte(v: number) {
    this.out.push(v & 0xff);
  }

  varuint(v: number) {
    if (!Number.isInteger(v) || v < 0) throw new Error(`varuint needs a non-negative integer, got ${v}`);
    let n = v;
    do {
      let b = n % 128;
      n = Math.floor(n / 128);
      if (n > 0) b |= 0x80;
      this.byte(b);
    } while (n > 0);
  }

  u32(v: number) {
    const buf = new DataView(new ArrayBuffer(4));
    buf.setUint32(0, v >>> 0, true);
    for (let i = 0; i < 4; i++) this.byte(buf.getUint8(i));
  }

  f32(v: number) {
    const buf = new DataView(new ArrayBuffer(4));
    buf.setFloat32(0, v, true);
    for (let i = 0; i < 4; i++) this.byte(buf.getUint8(i));
  }

  string(v: string) {
    const encoded = new TextEncoder().encode(v);
    this.varuint(encoded.length);
    for (const b of encoded) this.byte(b);
  }

  ids(v: readonly number[]) {
    const inner = new Bytes();
    for (const id of v) inner.varuint(id);
    const encoded = inner.done();
    this.varuint(encoded.length);
    for (const b of encoded) this.byte(b);
  }

  done(): Uint8Array {
    return Uint8Array.from(this.out);
  }
}

export type RivObject = { type: number; props: Props };

function writeObject(out: Bytes, object: RivObject) {
  out.varuint(object.type);
  for (const [name, value] of Object.entries(object.props) as Array<[PropName, PropValue]>) {
    if (value === undefined) continue;
    const [key, kind] = PROP[name];
    out.varuint(key);
    if (kind === "bytes") {
      if (!Array.isArray(value)) throw new Error(`${name} needs a list of ids`);
      out.ids(value);
      continue;
    }
    switch (kind) {
      case "uint":
        out.varuint(Number(value));
        break;
      case "double":
        out.f32(Number(value));
        break;
      case "color":
        out.u32(Number(value));
        break;
      case "bool":
        out.byte(value ? 1 : 0);
        break;
      case "string":
        out.string(String(value));
        break;
    }
  }
  out.varuint(0);
}

export function encodeRiv(objects: readonly RivObject[], fileId = 0): Uint8Array {
  const out = new Bytes();
  for (const c of "RIVE") out.byte(c.charCodeAt(0));
  out.varuint(RIV_MAJOR);
  out.varuint(RIV_MINOR);
  out.varuint(fileId);
  // Every property written is one the runtime already knows, so the table of
  // contents that lets a reader skip unknown properties stays empty.
  out.varuint(0);
  for (const object of objects) writeObject(out, object);
  return out.done();
}

export type DecodedObject = { type: number; props: Map<number, PropValue> };

/**
 * Reads back what `encodeRiv` writes. Only knows the property keys in `PROP`,
 * which is enough to check a generated file and not meant for editor exports.
 */
export function decodeRiv(bytes: Uint8Array): {
  major: number;
  minor: number;
  objects: DecodedObject[];
} {
  let i = 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const byte = () => bytes[i++];
  const varuint = () => {
    let v = 0;
    let scale = 1;
    for (;;) {
      const b = byte();
      v += (b & 0x7f) * scale;
      scale *= 128;
      if (!(b & 0x80)) return v;
    }
  };
  const fingerprint = String.fromCharCode(byte(), byte(), byte(), byte());
  if (fingerprint !== "RIVE") throw new Error("not a Rive file");
  const major = varuint();
  const minor = varuint();
  varuint();
  while (varuint() !== 0) {
    throw new Error("decodeRiv does not read a property table of contents");
  }
  const objects: DecodedObject[] = [];
  while (i < bytes.length) {
    const type = varuint();
    const props = new Map<number, PropValue>();
    for (;;) {
      const key = varuint();
      if (key === 0) break;
      const kind = KIND_BY_KEY.get(key);
      switch (kind) {
        case "bytes": {
          const length = varuint();
          const end = i + length;
          const ids: number[] = [];
          while (i < end) ids.push(varuint());
          props.set(key, ids);
          break;
        }
        case "uint":
          props.set(key, varuint());
          break;
        case "double":
          props.set(key, view.getFloat32(i, true));
          i += 4;
          break;
        case "color":
          props.set(key, view.getUint32(i, true));
          i += 4;
          break;
        case "bool":
          props.set(key, byte() === 1);
          break;
        case "string": {
          const n = varuint();
          props.set(key, new TextDecoder().decode(bytes.subarray(i, i + n)));
          i += n;
          break;
        }
        default:
          throw new Error(`unknown property key ${key}`);
      }
    }
    objects.push({ type, props });
  }
  return { major, minor, objects };
}

/** ARGB, the way Rive stores colours. */
export function argb(r: number, g: number, b: number, a = 1): number {
  return (
    ((Math.round(a * 255) & 0xff) * 0x1000000 +
      ((r & 0xff) << 16) +
      ((g & 0xff) << 8) +
      (b & 0xff)) >>>
    0
  );
}
