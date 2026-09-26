import { describe, expect, it } from "vitest";
import {
  arrival,
  cameraCreep,
  leadLag,
  markLife,
  rankJitter,
  strokeWeight,
} from "@/components/film/craft";

const RANKS = [0, 0.17, 0.38, 0.5, 0.74, 1];
const SPREADS = [0.1, 0.3, 0.45];

describe("leadLag", () => {
  it("holds the cue table's endpoints for every rank", () => {
    for (const rank of RANKS) {
      for (const spread of SPREADS) {
        expect(leadLag(0, rank, spread)).toBe(0);
        expect(leadLag(1, rank, spread)).toBe(1);
      }
    }
  });

  it("lets one side lead", () => {
    for (const t of [0.2, 0.4, 0.6, 0.8]) {
      expect(leadLag(t, 0, 0.3)).toBeGreaterThan(leadLag(t, 1, 0.3));
    }
  });

  it("never spreads the field by half a cycle", () => {
    // The moment the leading mark lands, the trailing one must already be moving,
    // or the field reads as two populations instead of one wave.
    for (const spread of SPREADS) {
      let landed = 1;
      for (let i = 0; i <= 200; i++) {
        const t = i / 200;
        if (leadLag(t, 0, spread) >= 1) {
          landed = t;
          break;
        }
      }
      expect(leadLag(landed, 1, spread)).toBeGreaterThan(0);
    }
  });

  it("is monotonic in t", () => {
    for (const rank of RANKS) {
      let prev = -1;
      for (let i = 0; i <= 100; i++) {
        const value = leadLag(i / 100, rank, 0.3);
        expect(value).toBeGreaterThanOrEqual(prev);
        prev = value;
      }
    }
  });
});

describe("arrival", () => {
  it("is a drop-in for the population channel at its endpoints", () => {
    for (const rank of RANKS) {
      expect(arrival(rank, 0)).toBe(0);
      expect(arrival(rank, 1)).toBe(1);
    }
  });

  it("writes the field on in rank order", () => {
    expect(arrival(0.1, 0.5)).toBeGreaterThan(arrival(0.9, 0.5));
    expect(arrival(0.9, 0.5)).toBe(0);
  });
});

describe("rankJitter", () => {
  it("roughens the wavefront without reordering it", () => {
    const low = rankJitter(11, 0.1);
    const high = rankJitter(11, 0.9);
    expect(low).toBeLessThan(high);
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(1);
  });

  it("is deterministic", () => {
    expect(rankJitter(404, 0.5)).toBe(rankJitter(404, 0.5));
  });
});

describe("markLife", () => {
  it("is still under reduced motion", () => {
    const life = markLife(7, 12.5, 4, 0);
    expect(life).toEqual({ dx: 0, dy: 0, glow: 1 });
  });

  it("is deterministic and seeded per mark", () => {
    expect(markLife(7, 3, 4)).toEqual(markLife(7, 3, 4));
    expect(markLife(8, 3, 4).dx).not.toBe(markLife(7, 3, 4).dx);
  });

  it("gives even the smallest marks a visible amplitude", () => {
    let peak = 0;
    for (let i = 0; i < 400; i++) peak = Math.max(peak, markLife(3, i / 20, 0.8).dx);
    expect(peak).toBeGreaterThan(0.8);
  });

  it("keeps drift proportional to the mark, so a close-up is not a swarm", () => {
    const small = markLife(3, 2.4, 2);
    const large = markLife(3, 2.4, 20);
    expect(Math.abs(large.dx)).toBeGreaterThan(Math.abs(small.dx));
    expect(Math.abs(large.dx)).toBeLessThanOrEqual(20 * 0.3 + 1e-9);
  });

  it("moves within half a second, from any start time", () => {
    // A one-second floor is too generous: a drift slow enough to pass it still
    // repeats frames, and a repeated frame is a still picture. The window here
    // is 15 frames, which is the window the rendered gate measures. Per-mark
    // phase is what carries it through the moments when any single mark is at
    // the top of its own arc.
    const ids = Array.from({ length: 240 }, (_, i) => i * 7 + 1);
    for (let start = 0; start < 60; start += 0.25) {
      let moved = 0;
      for (const id of ids) {
        const a = markLife(id, start, 3);
        const b = markLife(id, start + 0.25, 3);
        if (Math.hypot(b.dx - a.dx, b.dy - a.dy) > 0.25) moved++;
      }
      expect(moved / ids.length).toBeGreaterThan(0.5);
    }
  });
});

describe("cameraCreep", () => {
  it("stays planted while the film is moving", () => {
    expect(cameraCreep(12, 0)).toEqual({ pan: 0, span: 1 });
    expect(cameraCreep(12, 1, 0)).toEqual({ pan: 0, span: 1 });
  });

  it("creeps, and stays inside a fraction of the span", () => {
    for (let t = 0; t < 120; t += 0.5) {
      const creep = cameraCreep(t, 1);
      expect(Math.abs(creep.pan)).toBeLessThan(0.025);
      expect(creep.span).toBeLessThanOrEqual(1);
      expect(creep.span).toBeGreaterThan(0.97);
    }
  });
});

describe("strokeWeight", () => {
  it("leaves an unzoomed line alone", () => {
    expect(strokeWeight(1.5, 1)).toBe(1.5);
  });

  it("grows well under the camera's own factor", () => {
    const weight = strokeWeight(1, 6);
    expect(weight).toBeGreaterThan(1.5);
    expect(weight).toBeLessThan(2.2);
  });
});
