import { describe, expect, it } from "vitest";
import {
  cueTableHolds,
  cueTableProblems,
  holdAt,
  type Cue,
} from "@/components/film/cue-table";
import { cameraCreep, markLife } from "@/components/film/craft";
import { RATE_HOLDS, frameAt } from "@/components/film/frame";
import { CUTOFF_HOLDS, cutoffFrameAt } from "@/components/film/cutoff-frame";

type Row = Cue & { a: number; b: number };

const options = { rendered: ["a", "b"] as const };

const table = (rows: Row[]) => rows;

describe("cueTableProblems", () => {
  it("passes a well-formed table", () => {
    expect(
      cueTableProblems(
        table([
          { at: 0, beat: 0, a: 0, b: 0 },
          { at: 0.5, beat: 1, a: 1, b: 0 },
          { at: 0.9, beat: 2, a: 1, b: 1 },
        ]),
        options,
      ),
    ).toEqual([]);
  });

  it("rejects a table that does not open the film", () => {
    const problems = cueTableProblems(
      table([
        { at: 0.2, beat: 0, a: 0, b: 0 },
        { at: 0.5, beat: 1, a: 1, b: 0 },
      ]),
      options,
    );
    expect(problems.join(" ")).toContain("not 0");
  });

  it("rejects cues that do not advance", () => {
    const problems = cueTableProblems(
      table([
        { at: 0, beat: 0, a: 0, b: 0 },
        { at: 0.4, beat: 1, a: 1, b: 0 },
        { at: 0.4, beat: 2, a: 1, b: 1 },
      ]),
      options,
    );
    expect(problems.join(" ")).toContain("does not advance");
  });

  it("rejects a skipped beat", () => {
    const problems = cueTableProblems(
      table([
        { at: 0, beat: 0, a: 0, b: 0 },
        { at: 0.4, beat: 2, a: 1, b: 0 },
      ]),
      options,
    );
    expect(problems.join(" ")).toContain("skips");
  });

  it("rejects a NaN channel the renderer was not told to track", () => {
    const rows = table([
      { at: 0, beat: 0, a: Number.NaN, b: 0 },
      { at: 0.4, beat: 1, a: 1, b: 0 },
    ]);
    expect(cueTableProblems(rows, options).join(" ")).toContain("NaN");
    expect(cueTableProblems(rows, { ...options, tracked: ["a"] })).toEqual([]);
  });
});

describe("cueTableHolds", () => {
  it("finds spans where no drawn channel moves, and merges them", () => {
    const holds = cueTableHolds(
      table([
        { at: 0, beat: 0, a: 0, b: 0 },
        { at: 0.2, beat: 1, a: 1, b: 0 },
        { at: 0.4, beat: 2, a: 1, b: 0 },
        { at: 0.6, beat: 3, a: 1, b: 0 },
        { at: 1, beat: 4, a: 1, b: 1 },
      ]),
      options,
    );
    expect(holds).toEqual([{ from: 0.2, to: 0.6, beat: 1 }]);
  });

  it("counts the tail after the last cue as a hold", () => {
    const holds = cueTableHolds(
      table([
        { at: 0, beat: 0, a: 0, b: 0 },
        { at: 0.8, beat: 1, a: 1, b: 1 },
      ]),
      options,
    );
    expect(holds).toEqual([{ from: 0.8, to: 1, beat: 1 }]);
  });

  /**
   * Both shipped films draw one canvas, so `rendered` has only ever described one
   * surface. A film with two would be tempted to hand in the union of their
   * channels — and that hides a frozen surface behind a moving one, which is the
   * same class of mistake as counting a DOM-only channel as motion. Holds are
   * per-surface: ask once per canvas.
   */
  it("hides a frozen surface when two surfaces share one rendered list", () => {
    const rows = table([
      { at: 0, beat: 0, a: 0, b: 0 },
      { at: 0.5, beat: 1, a: 1, b: 0 },
      { at: 1, beat: 2, a: 2, b: 0 },
    ]);

    // Channel `b` — the second canvas — never moves, yet the union reports no hold.
    expect(cueTableHolds(rows, { rendered: ["a", "b"] })).toEqual([]);

    // Asked per surface, the frozen one is found and can be given its own creep.
    expect(cueTableHolds(rows, { rendered: ["a"] })).toEqual([]);
    expect(cueTableHolds(rows, { rendered: ["b"] })).toEqual([
      { from: 0, to: 1, beat: 0 },
    ]);
  });
});

describe("holdAt", () => {
  const holds = [{ from: 0.2, to: 0.6, beat: 1 }];

  it("is zero while the film is moving", () => {
    expect(holdAt(holds, 0.1)).toBe(0);
    expect(holdAt(holds, 0.9)).toBe(0);
  });

  it("reaches the hold without a step at either edge", () => {
    expect(holdAt(holds, 0.2)).toBe(0);
    expect(holdAt(holds, 0.4)).toBe(1);
    expect(holdAt(holds, 0.6)).toBe(0);
  });
});

describe("the shipped films have no dead air", () => {
  const films = [
    { name: "when-rates-rise", holds: RATE_HOLDS, at: (p: number) => frameAt(p, { shareBefore: 0.14, shareAfter: 0.014 }).hold },
    { name: "where-should-the-cutoff-sit", holds: CUTOFF_HOLDS, at: (p: number) => cutoffFrameAt(p).hold },
  ];

  for (const film of films) {
    it(`${film.name} still holds, and every hold is alive`, () => {
      expect(film.holds.length).toBeGreaterThan(0);
      for (const hold of film.holds) {
        const mid = (hold.from + hold.to) / 2;
        expect(film.at(mid)).toBeGreaterThan(0.9);
        // The camera creeps and the marks keep living, so the frame the reader
        // dwells on is never the same frame a second later.
        const creepA = cameraCreep(0, film.at(mid));
        const creepB = cameraCreep(6, film.at(mid));
        expect(Math.abs(creepB.pan - creepA.pan)).toBeGreaterThan(0);
        const a = markLife(hold.beat * 31 + 5, 0, 3);
        const b = markLife(hold.beat * 31 + 5, 1, 3);
        expect(Math.hypot(b.dx - a.dx, b.dy - a.dy)).toBeGreaterThan(0);
      }
    });

    it(`${film.name} holds nothing under reduced motion`, () => {
      for (const hold of film.holds) {
        const mid = (hold.from + hold.to) / 2;
        const frame =
          film.name === "when-rates-rise"
            ? frameAt(mid, { shareBefore: 0.14, shareAfter: 0.014 }, true)
            : cutoffFrameAt(mid, true);
        expect(frame.hold).toBe(0);
      }
    });
  }
});
