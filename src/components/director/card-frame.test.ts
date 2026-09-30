import { describe, expect, it } from "vitest";
import { FIELD_CARDS } from "@/illustrations/field-cards";
import {
  READING_BAND,
  SCROLL_MESSAGE,
  SECTION_MESSAGE,
  cardDocumentUrls,
  cardFrameHtml,
  fieldCardBridge,
  fieldCardFramePath,
  parseSectionMessage,
  sectionLine,
  speechLine,
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
    expect(parseSectionMessage({ source: SECTION_MESSAGE, heading: "Always on" })).toEqual({
      heading: "Always on",
    });
    expect(parseSectionMessage({ source: SECTION_MESSAGE, heading: "  Ladder + gates \n" })).toEqual({
      heading: "Ladder + gates",
    });
    expect(parseSectionMessage({ source: "other", heading: "Always on" })).toBeNull();
    expect(parseSectionMessage({ source: SECTION_MESSAGE, heading: "" })).toBeNull();
    expect(parseSectionMessage({ source: SECTION_MESSAGE, heading: "x".repeat(161) })).toBeNull();
    expect(parseSectionMessage(null)).toBeNull();
  });

  it("keeps the section line while the reader moves through rows inside it", () => {
    const card = FIELD_CARDS[0];
    const heading = "Problem → use → example";
    expect(speechLine(card, { heading })).toBe("Match the real problem to the thinnest layer that solves it.");
    expect(speechLine(card, { heading })).not.toMatch(/RAG|MCP/);
    expect(speechLine(card, { heading: "Always on" })).toBe("If you cannot stop it, you do not ship it.");
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
    expect(cardDocumentUrls("https://alextouvras.com/sdlc-field-card/")).toEqual([
      "https://alextouvras.com/sdlc-field-card",
    ]);
    expect(cardDocumentUrls("https://alextouvras.github.io/agentic-ai-field-card/")).toEqual([
      "https://alextouvras.github.io/agentic-ai-field-card/",
    ]);
  });

  it("follows the reading band on scroll, and the section beside the cursor on a move", () => {
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

  it("does not post again while the reading band stays inside one section", () => {
    const bridge = mountTable();
    expect(bridge.headings()).toEqual(["Problem block"]);
    bridge.scrollTo(80);
    bridge.fire("scroll");
    expect(bridge.headings()).toEqual(["Problem block"]);
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
    querySelectorAll(sel: string) {
      if (sel.includes("tr")) return [];
      return sections;
    },
    elementFromPoint(x: number, y: number) {
      const hit = sections.find((section) => {
        const box = section.getBoundingClientRect();
        return y >= box.top && y <= box.bottom && x >= box.left && x <= box.right;
      });
      return {
        closest(sel: string) {
          if (sel.includes("tr") || sel.includes("pick") || sel.includes("li")) return null;
          return hit ?? null;
        },
      };
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

/** Two table rows inside one section. Scrolling from the first row to the second stays on that section. */
function mountTable() {
  const headings: string[] = [];
  const parent = {
    postMessage(data: { heading?: string }) {
      if (data.heading) headings.push(data.heading);
    },
  };
  const state = { scroll: 0 };
  const section = {
    querySelector() {
      return { textContent: "Problem block" };
    },
    getAttribute() {
      return "";
    },
    getBoundingClientRect() {
      return { top: 0 - state.scroll, bottom: 2000 - state.scroll, left: 80, right: 1000, height: 2000 };
    },
  };
  const rows = [
    { title: "RAG", text: "Answers ignore our docs.", top: 260, bottom: 340 },
    { title: "MCP", text: "Need live reads.", top: 340, bottom: 420 },
  ].map((row) => {
    const node = {
      querySelectorAll() {
        return [{ textContent: row.text }, { textContent: row.title }];
      },
      closest(sel: string) {
        return sel.includes("tr") ? node : sel.includes("section") ? section : null;
      },
      getBoundingClientRect() {
        const top = row.top - state.scroll;
        const bottom = row.bottom - state.scroll;
        return { top, bottom, left: 80, right: 1000, height: bottom - top };
      },
    };
    return node;
  });
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
    querySelectorAll(sel: string) {
      if (sel.includes("tr")) return rows;
      return [section];
    },
    elementFromPoint(x: number, y: number) {
      const row = rows.find((item) => {
        const box = item.getBoundingClientRect();
        return y >= box.top && y <= box.bottom && x >= box.left && x <= box.right;
      });
      if (row) return row;
      const box = section.getBoundingClientRect();
      if (y >= box.top && y <= box.bottom) return { closest: (sel: string) => (sel.includes("section") ? section : null) };
      return { closest: () => null };
    },
  };
  const windowMock = {
    innerWidth: 1280,
    innerHeight: 800,
    parent,
    matchMedia: () => ({ matches: true }),
    addEventListener: on,
    requestAnimationFrame: (fn: () => void) => fn(),
  };
  const run = new Function("window", "document", "parent", "requestAnimationFrame", fieldCardBridge());
  run(windowMock, documentMock, parent, windowMock.requestAnimationFrame);
  return {
    headings: () => headings,
    scrollTo(y: number) {
      state.scroll = y;
    },
    fire(type: string) {
      for (const fn of listeners[type] ?? []) fn({});
    },
  };
}
