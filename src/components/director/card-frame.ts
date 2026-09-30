/**
 * The field-card sheet is another origin, so the overlay cannot see its
 * scroll or its cursor. The server route `/field-card-frame/[card]` fetches
 * the sheet (a browser fetch fails when a redirect omits CORS) and this file
 * frames it as a sandboxed srcdoc with one bridge script. The bridge names
 * the section. This file decides which bubble line that name is.
 *
 * Moving a fine pointer reports the block under the cursor. Scrolling reports
 * the block crossing the reading band — about a third of the way down the
 * viewport — on a mouse and on a phone. A block is a table row, a picker
 * entry, or a list item when one is there, and otherwise the section.
 */

import { type FieldCard } from "@/illustrations/field-cards";

export const SECTION_MESSAGE = "field-card-section";

/** The overlay asks the sheet to scroll when a wheel lands on the robot. */
export const SCROLL_MESSAGE = "field-card-scroll";

/** Share of the viewport height the phone treats as the line being read. */
export const READING_BAND = 0.38;

export const CARD_FRAME_SANDBOX = "allow-scripts allow-popups allow-popups-to-escape-sandbox allow-modals";

/** Same-origin route that returns the framed sheet, when this app is serving it. */
export function fieldCardFramePath(id: string): string {
  return `/field-card-frame/${id}`;
}

/**
 * URLs to try for the sheet. A trailing slash on alextouvras.com answers 308
 * with no CORS header, so a browser on another origin cannot follow it. The
 * same path without the slash allows the fetch.
 */
export function cardDocumentUrls(pageUrl: string): string[] {
  const url = new URL(pageUrl);
  const slashed = url.pathname.length > 1 && url.pathname.endsWith("/");
  const bare = new URL(url.href);
  if (slashed) bare.pathname = url.pathname.replace(/\/+$/, "") || "/";
  const withSlash = new URL(url.href);
  if (!slashed && url.pathname.length > 1) withSlash.pathname = `${url.pathname}/`;
  // GitHub Pages redirects the bare path without CORS. This site redirects the slashed path the same way.
  if (url.hostname.endsWith("github.io")) return [slashed ? url.href : withSlash.href];
  if (url.hostname === "alextouvras.com" || url.hostname.endsWith(".alextouvras.com")) return [bare.href];
  return [...new Set([url.href, bare.href, withSlash.href])];
}

/** The framed sheet: the card's own HTML when the browser can read it, otherwise the server route. */
export async function loadFramedCard(id: string, pageUrl: string, signal?: AbortSignal): Promise<string> {
  for (const url of cardDocumentUrls(pageUrl)) {
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) continue;
      return cardFrameHtml(await res.text(), res.url || url);
    } catch (err) {
      if (signal?.aborted) throw err;
    }
  }
  const res = await fetch(fieldCardFramePath(id), { signal });
  if (!res.ok) throw new Error(String(res.status));
  return res.text();
}

export function sectionKey(heading: string): string {
  return heading.replace(/\s+/g, " ").trim().toLowerCase();
}

/** The bubble line for a heading the bridge reported, or null if this card has no such block. */
export function sectionLine(card: FieldCard, heading: string): string | null {
  const key = sectionKey(heading);
  const found = card.sections.find((section) => sectionKey(section.heading) === key);
  return found?.line ?? null;
}

export type SectionReport = { heading: string; title: string; text: string };

/** Fold the sheet's punctuation into the bubble's printable ASCII. */
export function toAscii(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/\u2026/g, "...")
    .replace(/\u00B7/g, "-")
    .replace(/\u20AC/g, "EUR ")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * One bubble line for the row, picker entry, or list item under the reader.
 * The words are the sheet's own, folded into ASCII and kept to one line.
 */
export function fitBubbleLine(title: string, text: string): string | null {
  const name = toAscii(title);
  const body = toAscii(text);
  const raw = name && body ? `${name}. ${body}` : name || body;
  if (!raw) return null;
  if (raw.length <= 64) return raw;
  const cut = raw.slice(0, 64);
  const space = cut.lastIndexOf(" ");
  const trimmed = (space >= 24 ? cut.slice(0, space) : cut).trim();
  return trimmed.length ? trimmed : null;
}

/** The row's own words when the reader is on one, otherwise the section line. */
export function speechLine(card: FieldCard, report: SectionReport): string | null {
  return fitBubbleLine(report.title, report.text) ?? sectionLine(card, report.heading);
}

function clipField(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length > max) return "";
  return text;
}

export function parseSectionMessage(data: unknown): SectionReport | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as { source?: unknown; heading?: unknown; title?: unknown; text?: unknown };
  if (msg.source !== SECTION_MESSAGE) return null;
  const heading = clipField(msg.heading, 160);
  if (!heading) return null;
  return { heading, title: clipField(msg.title, 80), text: clipField(msg.text, 180) };
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * The script that runs inside the sheet. It posts the heading of the section
 * under the cursor, or of the section crossing the reading band.
 */
export function fieldCardBridge(): string {
  return `(function () {
  var SOURCE = ${JSON.stringify(SECTION_MESSAGE)};
  var SCROLL = ${JSON.stringify(SCROLL_MESSAGE)};
  var BAND = ${READING_BAND};
  var pointer = null;
  var last = "";
  var scheduled = false;
  var sample = "band";
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)");

  function headingOf(el) {
    if (!el) return "";
    var node = el.querySelector("h1, h2");
    var text = node ? node.textContent : (el.getAttribute("aria-label") || "");
    return String(text).replace(/\\s+/g, " ").trim();
  }

  function regionAt(x, y) {
    var hit = document.elementFromPoint(x, y);
    var direct = hit && hit.closest ? hit.closest("header.hero, section, footer.meta") : null;
    var named = headingOf(direct);
    if (named) return named;
    var nodes = document.querySelectorAll("header.hero, section, footer.meta");
    var best = "";
    var bestScore = -Infinity;
    for (var i = 0; i < nodes.length; i++) {
      var box = nodes[i].getBoundingClientRect();
      if (y < box.top || y > box.bottom || box.height < 1) continue;
      var containsX = x >= box.left && x <= box.right;
      var dist = containsX ? 0 : Math.min(Math.abs(x - box.left), Math.abs(x - box.right));
      var score = (containsX ? 1e9 : 0) - dist;
      if (score > bestScore) {
        bestScore = score;
        best = headingOf(nodes[i]);
      }
    }
    return best;
  }

  function clip(value) {
    return String(value || "").replace(/\\s+/g, " ").trim().slice(0, 180);
  }

  function readBlock(el) {
    if (!el || !el.closest) return null;
    var row = el.closest("tr");
    if (row) {
      var cells = row.querySelectorAll("td");
      if (cells.length >= 2) return { title: clip(cells[1].textContent), text: clip(cells[0].textContent) };
    }
    var pick = el.closest(".pick");
    if (pick) {
      var name = pick.querySelector("strong");
      var desc = pick.querySelector("span");
      return { title: clip(name ? name.textContent : ""), text: clip(desc ? desc.textContent : "") };
    }
    var item = el.closest("li");
    if (item) return { title: "", text: clip(item.textContent) };
    return null;
  }

  function blockAt(x, y) {
    var hit = document.elementFromPoint(x, y);
    var direct = readBlock(hit);
    if (direct && (direct.title || direct.text)) return direct;
    var sections = document.querySelectorAll("header.hero, section, footer.meta");
    for (var s = 0; s < sections.length; s++) {
      var area = sections[s].getBoundingClientRect();
      if (y >= area.top && y <= area.bottom && x >= area.left && x <= area.right) return { title: "", text: "" };
    }
    var nodes = document.querySelectorAll("tr, .pick, li");
    var best = null;
    var bestScore = -Infinity;
    for (var i = 0; i < nodes.length; i++) {
      var box = nodes[i].getBoundingClientRect();
      if (y < box.top || y > box.bottom || box.height < 8) continue;
      var containsX = x >= box.left && x <= box.right;
      var dist = containsX ? 0 : Math.min(Math.abs(x - box.left), Math.abs(x - box.right));
      var score = (containsX ? 1e9 : 0) - dist - box.height * 0.001;
      if (score <= bestScore) continue;
      var read = readBlock(nodes[i]);
      if (!read || (!read.title && !read.text)) continue;
      bestScore = score;
      best = read;
    }
    return best || { title: "", text: "" };
  }

  function send(heading, block) {
    var title = block && block.title ? block.title : "";
    var text = block && block.text ? block.text : "";
    var key = heading + "\\n" + title + "\\n" + text;
    if (!heading || key === last) return;
    last = key;
    parent.postMessage({ source: SOURCE, heading: heading, title: title, text: text }, "*");
  }

  function place(next) {
    sample = next;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      var usePointer = sample === "pointer" && fine.matches && pointer;
      var x = usePointer ? pointer.x : window.innerWidth / 2;
      var y = usePointer ? pointer.y : window.innerHeight * BAND;
      send(regionAt(x, y), blockAt(x, y));
    });
  }

  document.addEventListener("pointermove", function (e) {
    pointer = { x: e.clientX, y: e.clientY };
    if (fine.matches) place("pointer");
  }, { passive: true });
  window.addEventListener("scroll", function () { place("band"); }, { passive: true });
  document.addEventListener("scroll", function () { place("band"); }, true);
  window.addEventListener("resize", function () { place("band"); });
  window.addEventListener("message", function (e) {
    if (e.source !== parent || !e.data || e.data.source !== SCROLL) return;
    var mode = e.data.mode;
    var unit = mode === 1 ? 16 : mode === 2 ? window.innerHeight : 1;
    var dx = Number(e.data.x);
    var dy = Number(e.data.y);
    if (!isFinite(dx) || !isFinite(dy)) return;
    dx = Math.max(-2400, Math.min(2400, dx)) * unit;
    dy = Math.max(-2400, Math.min(2400, dy)) * unit;
    var root = document.scrollingElement || document.documentElement;
    var prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    root.scrollLeft += dx;
    root.scrollTop += dy;
    root.style.scrollBehavior = prev;
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { place("band"); });
  else place("band");
})();`;
}

/**
 * The sheet's own HTML, with a base URL so its root-relative assets still
 * resolve, and the bridge inserted once. Scripts in the sheet stay sandboxed
 * by the iframe; they already refuse to mount a second robot when framed.
 */
export function cardFrameHtml(html: string, pageUrl: string): string {
  const href = escapeAttr(new URL(pageUrl).href);
  let next = html;
  if (!/<base\b/i.test(next)) {
    next = next.replace(/<head(\s[^>]*)?>/i, (open) => `${open}<base href="${href}">`);
  }
  const tag = `<script data-field-card-bridge>${fieldCardBridge()}<\/script>`;
  if (next.includes("</body>")) next = next.replace("</body>", `${tag}</body>`);
  else next += tag;
  return next;
}
