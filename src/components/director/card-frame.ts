/**
 * The field-card sheet is another origin, so the overlay cannot see its
 * scroll or its cursor. The server route `/field-card-frame/[card]` fetches
 * the sheet (a browser fetch fails when a redirect omits CORS) and this file
 * frames it as a sandboxed srcdoc with one bridge script. The bridge names
 * the section. This file decides which bubble line that name is.
 *
 * A fine pointer (a mouse) reports the section under the cursor, including
 * the row beside the cursor when the sheet does not fill the width. A coarse
 * pointer (a phone) has no hover, so it reports the section crossing the
 * reading band — about a third of the way down the viewport — and that band
 * moves as the sheet scrolls.
 */

import { type FieldCard } from "@/illustrations/field-cards";

export const SECTION_MESSAGE = "field-card-section";

/** Share of the viewport height the phone treats as the line being read. */
export const READING_BAND = 0.38;

export const CARD_FRAME_SANDBOX = "allow-scripts allow-popups allow-popups-to-escape-sandbox allow-modals";

/** Same-origin route that returns the framed sheet. The browser does not fetch the sheet itself. */
export function fieldCardFramePath(id: string): string {
  return `/field-card-frame/${id}`;
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

export function parseSectionMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as { source?: unknown; heading?: unknown };
  if (msg.source !== SECTION_MESSAGE) return null;
  if (typeof msg.heading !== "string") return null;
  const heading = msg.heading.replace(/\s+/g, " ").trim();
  if (!heading || heading.length > 160) return null;
  return heading;
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
  var BAND = ${READING_BAND};
  var pointer = null;
  var last = "";
  var scheduled = false;
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
    var bestScore = -1;
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

  function send(heading) {
    if (!heading || heading === last) return;
    last = heading;
    parent.postMessage({ source: SOURCE, heading: heading }, "*");
  }

  function place() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      var usePointer = fine.matches && pointer;
      var x = usePointer ? pointer.x : window.innerWidth / 2;
      var y = usePointer ? pointer.y : window.innerHeight * BAND;
      send(regionAt(x, y));
    });
  }

  document.addEventListener("pointermove", function (e) {
    pointer = { x: e.clientX, y: e.clientY };
    if (fine.matches) place();
  }, { passive: true });
  window.addEventListener("scroll", place, { passive: true });
  document.addEventListener("scroll", place, true);
  window.addEventListener("resize", place);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", place);
  else place();
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
