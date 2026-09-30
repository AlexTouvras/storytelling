import { describe, expect, it } from "vitest";
import { FIELD_CARDS } from "@/illustrations/field-cards";
import {
  READING_BAND,
  SCROLL_MESSAGE,
  SECTION_MESSAGE,
  cardFrameHtml,
  fieldCardBridge,
  fieldCardFramePath,
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
    expect(fieldCardBridge()).toContain(SCROLL_MESSAGE);
    expect(fieldCardBridge()).toContain(String(READING_BAND));
    expect(fieldCardBridge()).toContain("(hover: hover) and (pointer: fine)");
    expect(fieldCardBridge()).toContain("bestScore = -Infinity");
    expect(fieldCardBridge()).not.toContain("</script>");
    expect(fieldCardFramePath("ai")).toBe("/field-card-frame/ai");
  });

  it("follows the reading band on scroll, and the row beside the cursor on a move", () => {
    const bridge = mountBridge({ fine: true, width: 1280, height: 800 });
    expect(bridge.headings()).toEqual(["Hero block"]);

    bridge.pointer(400, 200);
    expect(bridge.headings()).toEqual(["Hero block"]);

    bridge.pointer(1100, 700);
    expect(bridge.headings()).toEqual(["Hero block", "Problem block"]);

    bridge.pointer(400, 200);
    bridge.scrollTo(250);
    bridge.fire("scroll");
    expect(bridge.headings()).toEqual(["Hero block", "Problem block", "Hero block", "Problem block"]);
  });

  it("scrolls the sheet when the overlay forwards a wheel", () => {
    const bridge = mountBridge({ fine: true, width: 1280, height: 800 });
    bridge.wheel(0, 180);
    expect(bridge.scrollTop()).toBe(180);
    bridge.wheel(0, 40, 1);
    expect(bridge.scrollTop()).toBe(180 + 40 * 16);
    bridge.wheel(Number.NaN, 10);
    expect(bridge.scrollTop()).toBe(180 + 40 * 16);
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

type Box = { top: number; bottom: number; left: number; right: number };

/**
 * Runs the bridge against a two-block sheet. Hero is 0–500, the problem
 * block is 500–1400, and the sheet only spans x 80–1000, so x 1100 is the
 * margin beside a row.
 */
function mountBridge(spec: { fine: boolean; width: number; height: number }) {
  const headings: string[] = [];
  const parent = {
    postMessage(data: { heading?: string }) {
      if (data.heading) headings.push(data.heading);
    },
  };
  const state = { scroll: 0 };
  const blocks: Array<{ heading: string; box: Box }> = [
    { heading: "Hero block", box: { top: 0, bottom: 500, left: 80, right: 1000 } },
    { heading: "Problem block", box: { top: 500, bottom: 1400, left: 80, right: 1000 } },
  ];
  const sections = blocks.map((block) => ({
    querySelector() {
      return { textContent: block.heading };
    },
    getAttribute() {
      return "";
    },
    getBoundingClientRect() {
      const top = block.box.top - state.scroll;
      const bottom = block.box.bottom - state.scroll;
      return { top, bottom, left: block.box.left, right: block.box.right, height: bottom - top };
    },
  }));
  const listeners: Record<string, Array<(event: unknown) => void>> = {};
  const on = (type: string, fn: (event: unknown) => void) => {
    (listeners[type] ??= []).push(fn);
  };
  const root = { scrollTop: 0, scrollLeft: 0, style: { scrollBehavior: "" } };
  const documentMock = {
    readyState: "complete",
    scrollingElement: root,
    documentElement: root,
    addEventListener: on,
    querySelectorAll: () => sections,
    elementFromPoint(x: number, y: number) {
      const hit = sections.find((section) => {
        const box = section.getBoundingClientRect();
        return y >= box.top && y <= box.bottom && x >= box.left && x <= box.right;
      });
      return { closest: () => hit ?? null };
    },
  };
  const windowMock = {
    innerWidth: spec.width,
    innerHeight: spec.height,
    parent,
    matchMedia: () => ({ matches: spec.fine }),
    addEventListener: on,
    requestAnimationFrame: (fn: () => void) => fn(),
  };
  const run = new Function("window", "document", "parent", "requestAnimationFrame", fieldCardBridge());
  run(windowMock, documentMock, parent, windowMock.requestAnimationFrame);
  return {
    headings: () => headings,
    pointer(x: number, y: number) {
      for (const fn of listeners.pointermove ?? []) fn({ clientX: x, clientY: y });
    },
    scrollTo(y: number) {
      state.scroll = y;
    },
    fire(type: string) {
      for (const fn of listeners[type] ?? []) fn({});
    },
    wheel(x: number, y: number, mode = 0) {
      for (const fn of listeners.message ?? []) fn({ source: parent, data: { source: SCROLL_MESSAGE, x, y, mode } });
    },
    scrollTop: () => root.scrollTop,
  };
}
