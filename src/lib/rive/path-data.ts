/**
 * SVG path data → Rive contours.
 *
 * Rive stores a curve as vertices with an incoming and an outgoing control
 * handle, each relative to its vertex; SVG stores it as segments whose control
 * points belong to the segment. A cubic `C c1 c2 p` from `p0` becomes
 * `out(p0) = c1 − p0` and `in(p) = c2 − p`. Supports M, L, H, V, C, S, Q, T and
 * Z, absolute and relative. No arcs: write them as cubics.
 */

export type Vec = readonly [number, number];

/** A vertex; `in`/`out` are control handles relative to the vertex, absent on a sharp corner. */
export type Vertex = { x: number; y: number; in?: Vec; out?: Vec };

export type Contour = { points: Vertex[]; closed: boolean };

const round = (n: number) => Math.round(n * 1000) / 1000;

function tokens(d: string): Array<string | number> {
  const out: Array<string | number> = [];
  const re = /([A-DF-Za-df-z])|(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/g;
  for (const m of d.matchAll(re)) out.push(m[1] ?? Number(m[2]));
  return out;
}

export function parsePath(d: string): Contour[] {
  const t = tokens(d);
  const contours: Contour[] = [];
  let current: Contour | null = null;
  let pen: Vec = [0, 0];
  let start: Vec = [0, 0];
  let lastControl: Vec | null = null;
  let lastQuad: Vec | null = null;
  let cmd = "";
  let i = 0;

  const num = () => {
    const v = t[i++];
    if (typeof v !== "number") throw new Error(`path data: expected a number at token ${i - 1} in "${d}"`);
    return v;
  };
  const vertex = (p: Vec, inHandle?: Vec): Vertex => {
    const v: Vertex = { x: round(p[0]), y: round(p[1]) };
    if (inHandle) v.in = [round(inHandle[0] - p[0]), round(inHandle[1] - p[1])];
    return v;
  };
  const setOut = (c: Vec) => {
    const last = current!.points[current!.points.length - 1];
    last.out = [round(c[0] - last.x), round(c[1] - last.y)];
  };
  const cubicTo = (c1: Vec, c2: Vec, p: Vec) => {
    setOut(c1);
    current!.points.push(vertex(p, c2));
    lastControl = c2;
    pen = p;
  };

  while (i < t.length) {
    if (typeof t[i] === "string") cmd = t[i++] as string;
    const rel = cmd === cmd.toLowerCase();
    const at = (x: number, y: number): Vec => (rel ? [pen[0] + x, pen[1] + y] : [x, y]);
    switch (cmd.toUpperCase()) {
      case "M": {
        pen = at(num(), num());
        start = pen;
        current = { points: [vertex(pen)], closed: false };
        contours.push(current);
        cmd = rel ? "l" : "L";
        lastControl = lastQuad = null;
        break;
      }
      case "L":
        pen = at(num(), num());
        current!.points.push(vertex(pen));
        lastControl = lastQuad = null;
        break;
      case "H": {
        const x = num();
        pen = [rel ? pen[0] + x : x, pen[1]];
        current!.points.push(vertex(pen));
        lastControl = lastQuad = null;
        break;
      }
      case "V": {
        const y = num();
        pen = [pen[0], rel ? pen[1] + y : y];
        current!.points.push(vertex(pen));
        lastControl = lastQuad = null;
        break;
      }
      case "C": {
        const c1 = at(num(), num());
        const c2 = at(num(), num());
        const p = at(num(), num());
        cubicTo(c1, c2, p);
        lastQuad = null;
        break;
      }
      case "S": {
        const c1: Vec = lastControl ? [2 * pen[0] - lastControl[0], 2 * pen[1] - lastControl[1]] : pen;
        const c2 = at(num(), num());
        const p = at(num(), num());
        cubicTo(c1, c2, p);
        lastQuad = null;
        break;
      }
      case "Q":
      case "T": {
        const q: Vec =
          cmd.toUpperCase() === "Q"
            ? at(num(), num())
            : lastQuad
              ? [2 * pen[0] - lastQuad[0], 2 * pen[1] - lastQuad[1]]
              : pen;
        const p = at(num(), num());
        const from = pen;
        cubicTo(
          [from[0] + (2 / 3) * (q[0] - from[0]), from[1] + (2 / 3) * (q[1] - from[1])],
          [p[0] + (2 / 3) * (q[0] - p[0]), p[1] + (2 / 3) * (q[1] - p[1])],
          p,
        );
        lastQuad = q;
        break;
      }
      case "Z": {
        const c = current!;
        c.closed = true;
        const first = c.points[0];
        const last = c.points[c.points.length - 1];
        if (c.points.length > 1 && Math.abs(first.x - last.x) < 1e-3 && Math.abs(first.y - last.y) < 1e-3) {
          if (last.in) first.in = last.in;
          c.points.pop();
        }
        pen = start;
        lastControl = lastQuad = null;
        break;
      }
      default:
        throw new Error(`path data: unsupported command "${cmd}"`);
    }
  }
  return contours;
}

/**
 * Moves every vertex and handle through `f`. Handles are mapped as absolute
 * control points, so a bend or a squash keeps curves tangent; good for deriving
 * one morph pose from another with the same vertex count.
 */
export function mapContour(c: Contour, f: (x: number, y: number) => Vec): Contour {
  return {
    closed: c.closed,
    points: c.points.map((v) => {
      const [x, y] = f(v.x, v.y);
      const out: Vertex = { x: round(x), y: round(y) };
      for (const side of ["in", "out"] as const) {
        const h = v[side];
        if (!h) continue;
        const [hx, hy] = f(v.x + h[0], v.y + h[1]);
        out[side] = [round(hx - x), round(hy - y)];
      }
      return out;
    }),
  };
}

export const translateContour = (c: Contour, dx: number, dy: number) => mapContour(c, (x, y) => [x + dx, y + dy]);

/** A closed rounded rectangle centred on (0, 0), as cubic vertices (so it can morph). */
export function roundedRect(width: number, height: number, radius: number): Contour {
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(radius, w, h);
  const k = r * 0.5523;
  const p = (x: number, y: number, inH: Vec, outH: Vec): Vertex => ({
    x: round(x),
    y: round(y),
    in: [round(inH[0]), round(inH[1])],
    out: [round(outH[0]), round(outH[1])],
  });
  return {
    closed: true,
    points: [
      p(-w + r, -h, [-k, 0], [0, 0]),
      p(w - r, -h, [0, 0], [k, 0]),
      p(w, -h + r, [0, -k], [0, 0]),
      p(w, h - r, [0, 0], [0, k]),
      p(w - r, h, [k, 0], [0, 0]),
      p(-w + r, h, [0, 0], [-k, 0]),
      p(-w, h - r, [0, k], [0, 0]),
      p(-w, -h + r, [0, 0], [0, -k]),
    ],
  };
}
