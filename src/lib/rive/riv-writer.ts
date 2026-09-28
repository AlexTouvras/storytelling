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
 * keys are copied from the runtime's generated `*_base.hpp` headers.
 */

export const RIV_MAJOR = 7;
export const RIV_MINOR = 0;

type Kind = "uint" | "string" | "double" | "color" | "bool";

export const TYPE = {
  backboard: 23,
  artboard: 1,
  node: 2,
  shape: 3,
  ellipse: 4,
  rectangle: 7,
  pointsPath: 16,
  straightVertex: 5,
  fill: 20,
  stroke: 24,
  solidColor: 18,
  cubicEase: 28,
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
  transition: 65,
  triggerCondition: 68,
  boolCondition: 71,
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
  // Paint
  colorValue: [37, "color"],
  thickness: [47, "double"],
  cap: [48, "uint"],
  join: [49, "uint"],
  // Interpolator
  x1: [63, "double"],
  y1: [64, "double"],
  x2: [65, "double"],
  y2: [66, "double"],
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
  inputId: [155, "uint"],
  opValue: [156, "uint"],
} as const satisfies Record<string, readonly [number, Kind]>;

export type PropName = keyof typeof PROP;
export type Props = Partial<Record<PropName, number | string | boolean>>;

export const LOOP = { oneShot: 0, loop: 1, pingPong: 2 } as const;
export const INTERPOLATION = { hold: 0, linear: 1, cubic: 2 } as const;
export const TRANSITION_FLAG = {
  durationIsPercentage: 1 << 1,
  enableExitTime: 1 << 2,
  exitTimeIsPercentage: 1 << 3,
} as const;
export const CONDITION_OP = { equal: 0, notEqual: 1 } as const;

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

  done(): Uint8Array {
    return Uint8Array.from(this.out);
  }
}

export type RivObject = { type: number; props: Props };

function writeObject(out: Bytes, object: RivObject) {
  out.varuint(object.type);
  for (const [name, value] of Object.entries(object.props) as Array<[PropName, number | string | boolean]>) {
    if (value === undefined) continue;
    const [key, kind] = PROP[name];
    out.varuint(key);
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

export type DecodedObject = { type: number; props: Map<number, number | string | boolean> };

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
    const props = new Map<number, number | string | boolean>();
    for (;;) {
      const key = varuint();
      if (key === 0) break;
      const kind = KIND_BY_KEY.get(key);
      switch (kind) {
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
