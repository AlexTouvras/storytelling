import { describe, expect, it } from "vitest";
import { mapContour, parsePath, roundedRect, translateContour } from "@/lib/rive/path-data";

describe("parsePath", () => {
  it("keeps straight segments as sharp vertices", () => {
    const [c] = parsePath("M 0 0 L 10 0 H 20 V 5 Z");
    expect(c.closed).toBe(true);
    expect(c.points).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 5 }]);
  });

  it("moves a cubic's control points onto the vertices, relative to each", () => {
    const [c] = parsePath("M 0 0 C 10 0 20 10 20 20");
    expect(c.points[0]).toEqual({ x: 0, y: 0, out: [10, 0] });
    expect(c.points[1]).toEqual({ x: 20, y: 20, in: [0, -10] });
  });

  it("reads relative commands from the pen", () => {
    const [c] = parsePath("m 10 10 l 5 0 c 0 5 5 5 5 0");
    expect(c.points.map((p) => [p.x, p.y])).toEqual([[10, 10], [15, 10], [20, 10]]);
    expect(c.points[1].out).toEqual([0, 5]);
    expect(c.points[2].in).toEqual([0, 5]);
  });

  it("mirrors the last control for S and raises Q to a cubic", () => {
    const [s] = parsePath("M 0 0 C 0 10 10 10 10 0 S 20 -10 20 0");
    expect(s.points[1].out).toEqual([0, -10]);
    const [q] = parsePath("M 0 0 Q 15 30 30 0");
    expect(q.points[0].out).toEqual([10, 20]);
    expect(q.points[1].in).toEqual([-10, 20]);
  });

  it("folds a closing vertex onto the first, keeping its incoming handle", () => {
    const [c] = parsePath("M -10 0 C -10 -8 10 -8 10 0 C 10 8 -10 8 -10 0 Z");
    expect(c.points).toHaveLength(2);
    expect(c.points[0].in).toEqual([0, 8]);
  });

  it("splits on every move and rejects arcs", () => {
    expect(parsePath("M 0 0 L 1 1 M 5 5 L 6 6")).toHaveLength(2);
    expect(() => parsePath("M 0 0 A 5 5 0 0 1 10 0")).toThrow(/unsupported command "A"/);
  });
});

describe("contour helpers", () => {
  it("builds a rounded rectangle from eight cubic vertices, so any two morph", () => {
    const a = roundedRect(20, 30, 5);
    const b = roundedRect(28, 7, 3.5);
    expect(a.points).toHaveLength(8);
    expect(b.points).toHaveLength(8);
    expect(a.points.every((p) => p.in && p.out)).toBe(true);
    expect(Math.max(...a.points.map((p) => p.x))).toBe(10);
  });

  it("maps handles as absolute points, so a translation leaves them alone", () => {
    const c = roundedRect(10, 10, 3);
    const moved = translateContour(c, 5, -2);
    moved.points.forEach((p, i) => {
      expect(p.x).toBeCloseTo(c.points[i].x + 5);
      expect(p.in).toEqual(c.points[i].in);
    });
    const doubled = mapContour(c, (x, y) => [x * 2, y * 2]);
    expect(doubled.points[1].out![0]).toBeCloseTo(c.points[1].out![0] * 2);
  });
});
