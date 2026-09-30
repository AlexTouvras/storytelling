import { describe, expect, it } from "vitest";
import { FIELD_CARDS } from "@/illustrations/field-cards";
import {
  READING_BAND,
  SECTION_MESSAGE,
  cardFrameHtml,
  fieldCardBridge,
  parseSectionMessage,
  sectionLine,
} from "@/components/director/card-frame";

describe("field card section lines", () => {
  it("maps a reported heading to that block's line", () => {
    const card = FIELD_CARDS[0];
    expect(sectionLine(card, "Anti-patterns")).toBe("An agent for plain questions is the usual overbuild.");
    expect(sectionLine(card, "  anti-patterns ")).toBe("An agent for plain questions is the usual overbuild.");
    expect(sectionLine(card, "Problem → use → example")).toBe(
      "Match the real problem to the thinnest layer that solves it.",
    );
    expect(sectionLine(card, "No such block")).toBeNull();
  });

  it("keeps each card's blocks distinct, including headings the sheets share", () => {
    const shared = "Problem → use → example";
    const lines = FIELD_CARDS.map((card) => sectionLine(card, shared));
    expect(lines.every(Boolean)).toBe(true);
    expect(new Set(lines).size).toBe(FIELD_CARDS.length);
    for (const card of FIELD_CARDS) {
      expect(card.sections[0].line).toBe(card.lines[0]);
      expect(new Set(card.sections.map((section) => section.heading)).size).toBe(card.sections.length);
    }
  });

  it("accepts only a short heading from the bridge", () => {
    expect(parseSectionMessage({ source: SECTION_MESSAGE, heading: "Always on" })).toBe("Always on");
    expect(parseSectionMessage({ source: SECTION_MESSAGE, heading: "  Ladder + gates \n" })).toBe("Ladder + gates");
    expect(parseSectionMessage({ source: "other", heading: "Always on" })).toBeNull();
    expect(parseSectionMessage({ source: SECTION_MESSAGE, heading: "" })).toBeNull();
    expect(parseSectionMessage({ source: SECTION_MESSAGE, heading: "x".repeat(161) })).toBeNull();
    expect(parseSectionMessage(null)).toBeNull();
  });
});

describe("field card frame", () => {
  const page = "<!DOCTYPE html><html><head><title>Card</title></head><body><a href=\"/stories\">Home</a></body></html>";

  it("points root-relative urls at the sheet and inserts the bridge once", () => {
    const html = cardFrameHtml(page, "https://alextouvras.com/sdlc-field-card/");
    expect(html).toContain('<base href="https://alextouvras.com/sdlc-field-card/">');
    expect(html).toContain('href="/stories"');
    expect(html.match(/data-field-card-bridge/g)).toHaveLength(1);
    expect(html.endsWith("</script></body></html>") || html.includes("</script></body>")).toBe(true);
    expect(fieldCardBridge()).toContain(SECTION_MESSAGE);
    expect(fieldCardBridge()).toContain(String(READING_BAND));
    expect(fieldCardBridge()).toContain("(hover: hover) and (pointer: fine)");
    expect(fieldCardBridge()).not.toContain("</script>");
  });

  it("does not add a second base", () => {
    const html = cardFrameHtml(
      '<html><head><base href="https://example.test/"></head><body></body></html>',
      "https://alextouvras.com/story-field-card/",
    );
    expect(html.match(/<base\b/gi)).toHaveLength(1);
    expect(html).toContain('href="https://example.test/"');
  });
});
