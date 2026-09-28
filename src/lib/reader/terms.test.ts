import { describe, expect, it } from "vitest";
import {
  formsPattern,
  orientationProblems,
  segmentBeat,
  technicalForms,
  termOrderProblems,
  type Term,
} from "@/lib/reader/terms";
import { normaliseKind } from "@/lib/reader/kinds";

const TRIP: Term = {
  id: "trip",
  word: "trip",
  technical: "loss of generation",
  definition: "A plant disconnecting without warning.",
  beat: 1,
};
const MASS: Term = {
  id: "mass",
  word: "spinning mass",
  technical: "inertia; kinetic energy, GWs",
  definition: "Energy stored in turning generators.",
  beat: 2,
};

const beats = [
  { title: "Fifty", paragraphs: ["The grid turns at one speed."] },
  { title: "A trip", paragraphs: ["That is a trip. Nineteen trips in a year."] },
  { title: "Inside", paragraphs: ["The spinning mass gives up energy, 170 GWs of it."] },
];

describe("term matching", () => {
  it("matches whole words and plurals, not longer words", () => {
    const p = formsPattern(["trip"]);
    expect("two trips".match(p)).toEqual(["trips"]);
    expect("it tripped".match(p)).toBeNull();
    expect("a trip.".match(formsPattern(["trip"]))).toEqual(["trip"]);
  });

  it("splits a technical name into its forms, without the film word", () => {
    expect(technicalForms(MASS)).toEqual(["inertia", "kinetic energy", "GWs"]);
  });
});

describe("term order", () => {
  it("passes a narration that teaches each term where it is first used", () => {
    expect(termOrderProblems([TRIP, MASS], beats)).toEqual([]);
  });

  it("fails a word used before its beat", () => {
    const early = [{ ...beats[0], paragraphs: ["A trip is coming."] }, beats[1], beats[2]];
    expect(termOrderProblems([TRIP], early)).toEqual(['beat 0 uses "trip" before beat 1 teaches it']);
  });

  it("fails a technical name used before its film word is taught", () => {
    const early = [beats[0], { ...beats[1], kicker: "At 170 GWs" }, beats[2]];
    expect(termOrderProblems([MASS], early)).toEqual([
      'beat 1 uses the technical name "GWs" before beat 2 teaches "spinning mass"',
    ]);
  });

  it("fails a term its beat never uses, and a beat that does not exist", () => {
    expect(termOrderProblems([{ ...TRIP, beat: 0 }], beats)).toEqual([
      'term "trip" is never used in the paragraphs of beat 0, so it is never taught',
    ]);
    expect(termOrderProblems([{ ...TRIP, beat: 9 }], beats)[0]).toMatch(/does not have/);
  });
});

describe("segmentBeat", () => {
  it("makes a button of the first use only, in the teaching beat", () => {
    const [first] = segmentBeat(beats[1].paragraphs, [TRIP, MASS], 1);
    expect(first).toEqual([
      { text: "That is a " },
      { text: "trip", termId: "trip" },
      { text: ". Nineteen trips in a year." },
    ]);
    expect(segmentBeat(beats[2].paragraphs, [TRIP], 2)).toEqual([[{ text: beats[2].paragraphs[0] }]]);
  });

  it("carries a taught term across paragraphs", () => {
    const out = segmentBeat(["No word here.", "A trip, then a trip."], [TRIP], 1);
    expect(out[0]).toEqual([{ text: "No word here." }]);
    expect(out[1].filter((s) => s.termId)).toHaveLength(1);
  });
});

describe("orientation", () => {
  const card =
    "The Nordic grid is one machine turning at 50 turns a second. When a power plant drops out, it slows. This story is about how far it slows, why that depends on the hour, and what the grid buys to stop it.";

  it("accepts a short card with no technical names", () => {
    expect(orientationProblems(card, [TRIP, MASS])).toEqual([]);
  });

  it("rejects a card that leans on a technical name, or runs long", () => {
    expect(orientationProblems(`${card} It is about inertia.`, [MASS])).toEqual([
      'orientation uses the technical name "inertia"',
    ]);
    expect(orientationProblems(`${card} ${card}`, [])[0]).toMatch(/words/);
  });
});

describe("kinds", () => {
  it("normalises the spellings packs use", () => {
    expect(normaliseKind("modeled")).toBe("modelled");
    expect(normaliseKind("observed-published")).toBe("published");
    expect(normaliseKind("guess")).toBeNull();
  });
});
