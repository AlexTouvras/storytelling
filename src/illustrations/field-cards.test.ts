import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIELD_CARD_ACCENTS, FIELD_CARDS, TUCK_LINE } from "@/illustrations/field-cards";
import { ROBOT, ROBOT_LINES, robotLineProps } from "@/illustrations/robot";

describe("field card robot copy", () => {
  it("gives every homepage card six lines the bubble font can draw", () => {
    expect(FIELD_CARDS.map((c) => c.id)).toEqual(["ai", "delivery", "analytics", "sdlc", "credit", "story"]);
    for (const card of FIELD_CARDS) {
      expect(card.lines).toHaveLength(6);
      expect(card.lines[5]).toBe(TUCK_LINE);
      expect(FIELD_CARD_ACCENTS.some((a) => a.id === card.accent)).toBe(true);
      for (const words of card.lines) {
        expect(words.length).toBeGreaterThan(0);
        expect(words.length).toBeLessThanOrEqual(64);
        expect([...words].every((ch) => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 126)).toBe(true);
      }
    }
    const bodies = FIELD_CARDS.map((c) => c.lines.slice(0, 5).join("\n"));
    expect(new Set(bodies).size).toBe(FIELD_CARDS.length);
    for (const card of FIELD_CARDS) {
      expect(card.sections.length).toBeGreaterThanOrEqual(6);
      expect(card.sections[0].line).toBe(card.lines[0]);
      for (const section of card.sections) {
        expect(section.heading.length).toBeGreaterThan(0);
        expect(section.line.length).toBeGreaterThan(0);
        expect(section.line.length).toBeLessThanOrEqual(64);
        expect([...section.line].every((ch) => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 126)).toBe(true);
      }
    }
  });

  it("puts each card's rotation ahead of its sections, where the live script reads lines", () => {
    const source = readFileSync(join(process.cwd(), "src/illustrations/field-cards.ts"), "utf8");
    const start = source.indexOf("export const FIELD_CARDS");
    const end = source.indexOf("export type FieldCardId");
    const body = source.slice(start, end);
    let cursor = 0;
    for (const card of FIELD_CARDS) {
      const at = body.indexOf(`id: "${card.id}"`, cursor);
      const linesAt = body.indexOf("lines:", at);
      const sectionsAt = body.indexOf("sections:", at);
      expect(at).toBeGreaterThanOrEqual(0);
      expect(linesAt).toBeGreaterThan(at);
      expect(sectionsAt).toBeGreaterThan(linesAt);
      cursor = sectionsAt;
    }
  });

  it("keeps the AI opener where the live field-card script reads it", () => {
    const source = readFileSync(join(process.cwd(), "src/components/director/AiFieldCard.tsx"), "utf8");
    const opener = source.match(/^const CARD_LINE = "([^"\\]*)"/m);
    expect(opener?.[1]).toBe(FIELD_CARDS[0].lines[0]);
    expect(ROBOT_LINES[0]).toBe(ROBOT.defaults.line);
    expect(robotLineProps()).toEqual(["line", "line2", "line3", "line4", "line5", "line6"]);
  });

  it("has an overlay route for each card", () => {
    for (const card of FIELD_CARDS) {
      expect(existsSync(join(process.cwd(), "src/app/stories", card.route, "page.tsx"))).toBe(true);
      expect(existsSync(join(process.cwd(), "src/app/lab", card.route, "page.tsx"))).toBe(true);
    }
  });
});
