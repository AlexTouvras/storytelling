import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { sectionLine, parseFieldCards } from "./field-card-robot.mjs";

describe("sheet robot sections", () => {
  it("reads the delivery hero the live sheet actually shows", () => {
    const source = readFileSync(new URL("../src/illustrations/field-cards.ts", import.meta.url), "utf8");
    const cards = parseFieldCards(source);
    const delivery = cards.find((card) => card.id === "delivery");
    assert.ok(delivery);
    assert.equal(
      sectionLine(delivery.sections, "Match the calendars, then cut over."),
      "This card is evidence before the change is called done.",
    );
    assert.equal(sectionLine(delivery.sections, "Tool picker"), "Flags and pipelines are lanes. The sequence is the call.");
    assert.equal(sectionLine(delivery.sections, "not a section"), null);
  });
});
