/**
 * One storytelling robot for every homepage field card.
 *
 * Orbit publishes this file at `public/field-card-robot.mjs`. The storytelling
 * sync does not copy it. The pages are `/delivery-field-card/` and the other
 * `*-field-card` sheets, not the `/stories` overlays.
 *
 * Storytelling PR 25 binds six bubble lines and an accent on `robot.riv`.
 * This page does not vendor that file. Each visit resolves `main`, then
 * loads that commit's character, the `ROBOT` contract, and the card's six
 * judgements from `field-cards.ts`.
 *
 * The Agentic AI sheet keeps its own script (`host/ai-field-card-robot.mjs`).
 * The baked defaults are that card, so a blocked fetch still speaks its lines.
 *
 * https://alextouvras.com/stories/<card> draws the same robot over an iframe
 * of the sheet. When this page is that iframe, it stays out of the way.
 *
 * On the sheet itself, scrolling speaks the section crossing the reading
 * band, and a fine pointer speaks the section under the cursor. The words
 * are that section's line from `field-cards.ts`. All six runs show that one
 * line, so the crossfade cannot swap in a different judgement.
 */

export const STORY_REPO = "AlexTouvras/storytelling";

const FILES = {
  pkg: "package.json",
  robot: "src/illustrations/robot.ts",
  cards: "src/illustrations/field-cards.ts",
  riv: "src/illustrations/robot.riv",
};

/** Used only when a file from that commit cannot be read. */
export const FALLBACK_RUNTIME = "2.43.1";

export const FALLBACK_ROBOT = {
  name: "Robot",
  stateMachine: "Robot",
  width: 400,
  height: 400,
  props: {
    line: "line",
    line2: "line2",
    line3: "line3",
    line4: "line4",
    line5: "line5",
    line6: "line6",
    accent: "accent",
    presence: "presence",
    poke: "poke",
    settle: "settle",
  },
};

/** Layout from storytelling `FieldCardStage`. The canvas stays click-through. */
export const HOST = {
  settleMs: 1400,
  padTop: 80,
  padRight: 16,
  padBottom: 16,
  hit: {
    parked: { cx: 0.88, cy: 0.76, bw: 0.2, bh: 0.24 },
    present: { cx: 0.5, cy: 0.55, bw: 0.38, bh: 0.46 },
  },
};

const TUCK = "Tap me and I'll wait in the corner.";

/** Same band as storytelling `card-frame.ts`. About a third of the way down. */
export const READING_BAND = 0.38;

/**
 * Same words as storytelling `field-cards.ts` the day PR 25 merged.
 * A live read replaces these. They exist so a blocked fetch still speaks
 * the right card, not the AI defaults baked into the file.
 */
export const FALLBACK_CARDS = [
  {
    id: "ai",
    accent: "ai",
    lines: [
      "This card is which layer to use, and which to leave out.",
      "Start at the thinnest layer that solves the job.",
      "RAG grounds answers. An agent is for work that branches.",
      "MCP reaches a live system. Do not fine-tune facts.",
      "If you cannot stop it, you do not ship it.",
      TUCK,
    ],
  },
  {
    id: "delivery",
    accent: "delivery",
    lines: [
      "This card is evidence before the change is called done.",
      "Name the outcome and the owner. A title is not that.",
      "Pipeline green is not the same as held in production.",
      "Write the rollback before anyone says it is ready.",
      "Not yet is a decision. Sequence beats a pile of drafts.",
      TUCK,
    ],
  },
  {
    id: "analytics",
    accent: "analytics",
    lines: [
      "This card is when a number is real enough to use.",
      "Name the question and the grain before the tool.",
      "One definition, owned upstream. Do not remix it.",
      "A dashboard reads gold, not the raw landing zone.",
      "If the gap has no named cause, do not publish it.",
      TUCK,
    ],
  },
  {
    id: "sdlc",
    accent: "delivery",
    lines: [
      "This card is the order of the work, before the code.",
      "Write what done means while the plan is still cheap.",
      "Security sits in design and in test, not after the demo.",
      "A test that cannot fail for the right reason is out.",
      "Release, proof, and cutover live on the Delivery card.",
      TUCK,
    ],
  },
  {
    id: "credit",
    accent: "credit",
    lines: [
      "This card is the life of the loan. Act before the loss.",
      "A score at application is not the loss you hold.",
      "Name the increase in risk before you book the number.",
      "Watch the book in production. A launch deck is not that.",
      "A missed payment is a trigger, not a debate.",
      TUCK,
    ],
  },
  {
    id: "story",
    accent: "ai",
    lines: [
      "This card turns evidence into a decision.",
      "Start with the decision, not the dataset.",
      "The story never upgrades evidence into certainty.",
      "If nothing creates a next scene, it is analysis.",
      "End on what changes, and what is still uncertain.",
      TUCK,
    ],
  },
];

export const FALLBACK_ACCENTS = [
  { id: "ai", rgb: [0, 210, 211] },
  { id: "delivery", rgb: [157, 91, 244] },
  { id: "analytics", rgb: [57, 134, 228] },
  { id: "credit", rgb: [240, 166, 70] },
];

export function storyFileUrl(ref, filePath) {
  return `https://raw.githubusercontent.com/${STORY_REPO}/${ref}/${filePath}`;
}

export function canvasRuntimeVersion(pkg) {
  const raw = pkg?.dependencies?.["@rive-app/canvas"];
  if (typeof raw !== "string") return null;
  const match = raw.match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

/** ARGB, the way Rive stores colours. */
export function argb(r, g, b, a = 1) {
  return (
    ((Math.round(a * 255) & 0xff) * 0x1000000 +
      ((r & 0xff) << 16) +
      ((g & 0xff) << 8) +
      (b & 0xff)) >>>
    0
  );
}

function sliceObject(source, start) {
  let i = start;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  if (source[i] !== "{") return null;
  let depth = 0;
  let quote = null;
  for (let j = i; j < source.length; j += 1) {
    const c = source[j];
    if (quote) {
      if (c === "\\") {
        j += 1;
        continue;
      }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      continue;
    }
    if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(i, j + 1);
    }
  }
  return null;
}

function sliceBracket(source, start) {
  let i = start;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  if (source[i] !== "[") return null;
  let depth = 0;
  let quote = null;
  for (let j = i; j < source.length; j += 1) {
    const c = source[j];
    if (quote) {
      if (c === "\\") {
        j += 1;
        continue;
      }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      continue;
    }
    if (c === "[") depth += 1;
    else if (c === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(i, j + 1);
    }
  }
  return null;
}

function pickString(source, key) {
  const match = source.match(new RegExp("(?:^|[\\s,{])" + key + "\\s*:\\s*\"([^\"\\\\]*)\""));
  return match ? match[1] : null;
}

function pickNumber(source, key) {
  const match = source.match(new RegExp("(?:^|[\\s,{])" + key + "\\s*:\\s*(\\d+(?:\\.\\d+)?)"));
  return match ? Number(match[1]) : null;
}

function stripBlockComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

function exportBlock(source, name) {
  const at = source.search(new RegExp("export const " + name + "\\s*="));
  if (at < 0) return null;
  const eq = source.indexOf("=", at);
  if (eq < 0) return null;
  const body = source[eq + 1] === "[" || source.slice(eq + 1).trimStart().startsWith("[")
    ? sliceBracket(source, eq + 1)
    : sliceObject(source, eq + 1);
  return body;
}

/** Artboard name, state machine, size, and view-model keys from `export const ROBOT`. */
export function parseRobotContract(source) {
  if (typeof source !== "string") return null;
  source = stripBlockComments(source);
  const at = source.search(/export const ROBOT\s*=/);
  if (at < 0) return null;
  const eq = source.indexOf("=", at);
  if (eq < 0) return null;
  const body = sliceObject(source, eq + 1);
  if (!body) return null;
  const propsAt = body.indexOf("props:");
  const props = propsAt < 0 ? null : sliceObject(body, propsAt + "props:".length);
  if (!props) return null;
  const lineKeys = ["line", "line2", "line3", "line4", "line5", "line6"];
  const lineProps = lineKeys.map((key) => pickString(props, key));
  const contract = {
    name: pickString(body, "name"),
    stateMachine: pickString(body, "stateMachine"),
    width: pickNumber(body, "width"),
    height: pickNumber(body, "height"),
    props: {
      line: lineProps[0],
      line2: lineProps[1],
      line3: lineProps[2],
      line4: lineProps[3],
      line5: lineProps[4],
      line6: lineProps[5],
      accent: pickString(props, "accent"),
      presence: pickString(props, "presence"),
      poke: pickString(props, "poke"),
      settle: pickString(props, "settle"),
    },
  };
  if (!contract.name || !contract.stateMachine) return null;
  if (!contract.width || !contract.height) return null;
  if (lineProps.some((name) => !name)) return null;
  if (!contract.props.accent || !contract.props.presence || !contract.props.poke || !contract.props.settle) {
    return null;
  }
  return contract;
}

function parseTuck(source) {
  const match = source.match(/export const TUCK_LINE = "([^"\\]*)"/);
  return match ? match[1] : null;
}

function parseLineItems(arraySource, tuck) {
  const inner = arraySource.slice(1, -1);
  const lines = [];
  const re = /"([^"\\]*)"|TUCK_LINE\b/g;
  let match;
  while ((match = re.exec(inner))) {
    lines.push(match[1] !== undefined ? match[1] : tuck);
  }
  return lines;
}

/** Card id, accent id, and six bubble lines from `field-cards.ts`. */
export function parseFieldCards(source) {
  if (typeof source !== "string") return null;
  const tuck = parseTuck(source);
  const block = exportBlock(stripBlockComments(source), "FIELD_CARDS");
  if (!tuck || !block) return null;
  const cards = [];
  let i = 0;
  while (i < block.length) {
    const at = block.indexOf("{", i);
    if (at < 0) break;
    const obj = sliceObject(block, at);
    if (!obj) break;
    const id = pickString(obj, "id");
    const accent = pickString(obj, "accent");
    const linesAt = obj.indexOf("lines:");
    const linesBlock = linesAt < 0 ? null : sliceBracket(obj, linesAt + "lines:".length);
    const lines = linesBlock ? parseLineItems(linesBlock, tuck) : [];
    const sections = parseSections(obj);
    if (id && accent && lines.length === 6 && lines.every(Boolean)) {
      cards.push({ id, accent, lines, sections });
    }
    i = at + obj.length;
  }
  return cards.length ? cards : null;
}

function parseSections(obj) {
  const at = obj.indexOf("sections:");
  if (at < 0) return [];
  const block = sliceBracket(obj, at + "sections:".length);
  if (!block) return [];
  const sections = [];
  let i = 0;
  while (i < block.length) {
    const start = block.indexOf("{", i);
    if (start < 0) break;
    const item = sliceObject(block, start);
    if (!item) break;
    const heading = pickString(item, "heading");
    const line = pickString(item, "line");
    if (heading && line) sections.push({ heading, line });
    i = start + item.length;
  }
  return sections;
}

export function sectionKey(heading) {
  return String(heading).replace(/\s+/g, " ").trim().toLowerCase();
}

/** The section line for a heading, or null when this card has no such block. */
export function sectionLine(sections, heading) {
  const key = sectionKey(heading);
  if (!key) return null;
  const found = (sections || []).find((section) => sectionKey(section.heading) === key);
  return found?.line ?? null;
}

/** Accent id → sRGB from `FIELD_CARD_ACCENTS`. */
export function parseAccents(source) {
  if (typeof source !== "string") return null;
  const block = exportBlock(stripBlockComments(source), "FIELD_CARD_ACCENTS");
  if (!block) return null;
  const accents = [];
  const re = /id:\s*"([^"]+)"[\s\S]*?rgb:\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/g;
  let match;
  while ((match = re.exec(block))) {
    accents.push({
      id: match[1],
      rgb: [Number(match[2]), Number(match[3]), Number(match[4])],
    });
  }
  return accents.length ? accents : null;
}

export function cardSpeech(cardId, cards, accents) {
  const card = (cards || []).find((item) => item.id === cardId);
  if (!card) return null;
  const accent = (accents || []).find((item) => item.id === card.accent);
  if (!accent || accent.rgb.length !== 3) return null;
  return { lines: card.lines, rgb: accent.rgb, sections: card.sections || [] };
}

export function linePropNames(robot) {
  const props = robot?.props || {};
  return ["line", "line2", "line3", "line4", "line5", "line6"].map((key) => props[key]).filter(Boolean);
}

export async function currentStorySha() {
  try {
    const headers = { Accept: "application/vnd.github+json" };
    if (typeof window === "undefined") headers["User-Agent"] = "orbit-field-card-robot";
    const res = await fetch(`https://api.github.com/repos/${STORY_REPO}/commits/main`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.sha === "string" && data.sha ? data.sha : null;
  } catch {
    return null;
  }
}

function framed() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function safeVm(instance) {
  try {
    return instance?.viewModelInstance ?? null;
  } catch {
    return null;
  }
}

function readCardId() {
  const el = document.querySelector("script[src*='field-card-robot'][data-card]");
  const id = el?.getAttribute("data-card") || "";
  return /^[a-z0-9-]+$/.test(id) ? id : "";
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.arrayBuffer();
}

function loadRuntime(version) {
  const base = `https://cdn.jsdelivr.net/npm/@rive-app/canvas@${version}`;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${base}/rive.js`;
    script.async = true;
    script.onload = () => {
      const api = window.rive;
      if (!api?.Rive || !api.RuntimeLoader) {
        reject(new Error("Rive runtime did not load"));
        return;
      }
      api.RuntimeLoader.setWasmUrl(`${base}/rive.wasm`);
      resolve(api);
    };
    script.onerror = () => reject(new Error(`Rive runtime ${version} failed to load`));
    document.head.appendChild(script);
  });
}

function mountChrome() {
  const style = document.createElement("style");
  style.textContent = `
    .field-robot {
      pointer-events: none;
      position: fixed;
      z-index: 20;
      left: 0;
    }
    .field-robot canvas {
      width: 100%;
      height: 100%;
      display: block;
      vertical-align: top;
    }
    .field-robot-hit {
      position: fixed;
      z-index: 21;
      cursor: pointer;
      border: 0;
      background: transparent;
      padding: 0;
      color: transparent;
    }
    .field-robot-hit:focus-visible {
      outline: 2px solid #245a7a;
      outline-offset: 2px;
    }
    .field-robot-presence {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    @media print {
      .field-robot, .field-robot-hit, .field-robot-presence { display: none !important; }
    }
  `;
  const layer = document.createElement("div");
  layer.className = "field-robot";
  layer.id = "field-robot";
  layer.dataset.testid = "rive-robot";
  layer.style.top = `${HOST.padTop}px`;
  layer.style.right = `${HOST.padRight}px`;
  layer.style.bottom = `${HOST.padBottom}px`;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  layer.appendChild(canvas);

  const hit = document.createElement("button");
  hit.type = "button";
  hit.className = "field-robot-hit";
  hit.id = "field-robot-hit";
  hit.dataset.testid = "robot-hit";
  hit.hidden = true;
  hit.setAttribute("aria-label", "Tuck the robot into the corner");

  const presence = document.createElement("p");
  presence.className = "field-robot-presence";
  presence.id = "field-robot-presence";
  presence.dataset.testid = "robot-presence";
  presence.textContent = "—";

  document.head.appendChild(style);
  document.body.append(layer, hit, presence);
  return { layer, canvas, hit, presence };
}

function placeHit(hit, robot, where) {
  const boxW = window.innerWidth - HOST.padRight;
  const boxH = window.innerHeight - HOST.padTop - HOST.padBottom;
  const scale = Math.min(boxW, boxH) / robot.width;
  const w = robot.width * scale;
  const h = robot.height * scale;
  const x = window.innerWidth - HOST.padRight - w;
  const y = window.innerHeight - HOST.padBottom - h;
  const box = where === "parked" ? HOST.hit.parked : HOST.hit.present;
  hit.style.left = `${x + (box.cx - box.bw / 2) * w}px`;
  hit.style.top = `${y + (box.cy - box.bh / 2) * h}px`;
  hit.style.width = `${box.bw * w}px`;
  hit.style.height = `${box.bh * h}px`;
}

function headingOf(el) {
  if (!el) return "";
  const node = el.querySelector("h1, h2");
  const text = node ? node.textContent : el.getAttribute("aria-label") || "";
  return String(text).replace(/\s+/g, " ").trim();
}

/** The section heading at a viewport point. A row inside the section stays unnamed. */
export function headingAt(x, y) {
  const hit = document.elementFromPoint(x, y);
  const direct = hit && hit.closest ? hit.closest("header.hero, section, footer.meta") : null;
  const named = headingOf(direct);
  if (named) return named;
  const nodes = document.querySelectorAll("header.hero, section, footer.meta");
  let best = "";
  let bestScore = -Infinity;
  for (let i = 0; i < nodes.length; i += 1) {
    const box = nodes[i].getBoundingClientRect();
    if (y < box.top || y > box.bottom || box.height < 1) continue;
    const containsX = x >= box.left && x <= box.right;
    const dist = containsX ? 0 : Math.min(Math.abs(x - box.left), Math.abs(x - box.right));
    const score = (containsX ? 1e9 : 0) - dist;
    if (score > bestScore) {
      bestScore = score;
      best = headingOf(nodes[i]);
    }
  }
  return best;
}

function writeLines(instance, robot, names, lines) {
  const vm = safeVm(instance);
  names.forEach((name, index) => {
    const slot = vm?.string(name);
    if (slot && lines[index]) slot.value = lines[index];
  });
  instance?.play();
}

/**
 * Scrolling speaks the section at the reading band. A fine pointer speaks
 * the section under the cursor. The same sentence is written to every run.
 */
function followSections(instance, robot, names, speech, layer) {
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  let pointer = null;
  let sample = "band";
  let scheduled = false;
  let spoken = "";

  const apply = () => {
    const usePointer = sample === "pointer" && fine.matches && pointer;
    const x = usePointer ? pointer.x : window.innerWidth / 2;
    const y = usePointer ? pointer.y : window.innerHeight * READING_BAND;
    const line = sectionLine(speech.sections, headingAt(x, y));
    const next = line || "";
    if (next === spoken) return;
    spoken = next;
    writeLines(instance, robot, names, next ? names.map(() => next) : speech.lines);
    layer.dataset.speech = next || speech.lines[0] || "";
  };

  const place = (next) => {
    sample = next;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  };

  document.addEventListener(
    "pointermove",
    (event) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (fine.matches) place("pointer");
    },
    { passive: true },
  );
  window.addEventListener("scroll", () => place("band"), { passive: true });
  document.addEventListener("scroll", () => place("band"), true);
  window.addEventListener("resize", () => place("band"));
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => place("band"));
  } else {
    place("band");
  }
}

function removeChrome() {
  document.getElementById("field-robot")?.remove();
  document.getElementById("field-robot-hit")?.remove();
  document.getElementById("field-robot-presence")?.remove();
}

async function mount(cardId) {
  const sha = (await currentStorySha()) || "main";
  const ref = sha;
  const [pkgText, robotText, cardsText, riv] = await Promise.all([
    fetchText(storyFileUrl(ref, FILES.pkg)).catch(() => null),
    fetchText(storyFileUrl(ref, FILES.robot)).catch(() => null),
    fetchText(storyFileUrl(ref, FILES.cards)).catch(() => null),
    fetchBuffer(storyFileUrl(ref, FILES.riv)),
  ]);

  const cards = (cardsText && parseFieldCards(cardsText)) || FALLBACK_CARDS;
  const accents = (cardsText && parseAccents(cardsText)) || FALLBACK_ACCENTS;
  const speech = cardSpeech(cardId, cards, accents);
  if (!speech) return;

  let runtime = FALLBACK_RUNTIME;
  if (pkgText) {
    try {
      runtime = canvasRuntimeVersion(JSON.parse(pkgText)) || FALLBACK_RUNTIME;
    } catch {
      runtime = FALLBACK_RUNTIME;
    }
  }
  const robot = (robotText && parseRobotContract(robotText)) || FALLBACK_ROBOT;
  const props = linePropNames(robot);
  if (props.length !== speech.lines.length) return;

  let api;
  try {
    api = await loadRuntime(runtime);
  } catch (err) {
    if (runtime === FALLBACK_RUNTIME) throw err;
    api = await loadRuntime(FALLBACK_RUNTIME);
  }

  const { layer, canvas, hit, presence } = mountChrome();
  layer.dataset.storySha = sha;
  layer.dataset.card = cardId;

  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

  const ratio = () => Math.min(window.devicePixelRatio || 1, 2);
  let instance = null;
  let settleTimer = null;

  const resize = () => instance?.resizeDrawingSurfaceToCanvas(ratio());
  const observer = new ResizeObserver(() => resize());
  observer.observe(layer);

  const settle = () => {
    if (!instance || !reducedMotion()) return;
    instance.play();
    if (settleTimer !== null) window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => instance?.pause(), HOST.settleMs);
  };

  const readPresence = () => {
    const value = safeVm(instance)?.enum(robot.props.presence)?.value;
    return value ? String(value) : "";
  };

  const sync = () => {
    const where = readPresence();
    presence.textContent = where || "—";
    placeHit(hit, robot, where);
    hit.hidden = false;
    hit.setAttribute("aria-label", where === "parked" ? "Bring the robot back" : "Tuck the robot into the corner");
  };

  hit.addEventListener("click", () => {
    const trigger = safeVm(instance)?.trigger(robot.props.poke);
    if (!trigger) return;
    trigger.trigger();
    instance?.play();
    if (reducedMotion()) settle();
  });

  hit.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      let dx = Number(event.deltaX);
      let dy = Number(event.deltaY);
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
      dx = Math.max(-2400, Math.min(2400, dx)) * unit;
      dy = Math.max(-2400, Math.min(2400, dy)) * unit;
      const root = document.scrollingElement || document.documentElement;
      const prev = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      root.scrollLeft += dx;
      root.scrollTop += dy;
      root.style.scrollBehavior = prev;
    },
    { passive: false },
  );

  instance = new api.Rive({
    canvas,
    buffer: riv,
    artboard: robot.name,
    stateMachine: robot.stateMachine,
    autoplay: true,
    autoBind: true,
    layout: new api.Layout({
      fit: api.Fit.Contain,
      alignment: api.Alignment.BottomRight,
    }),
    onLoad: () => {
      resize();
      const vm = safeVm(instance);
      props.forEach((name, index) => {
        const slot = vm?.string(name);
        if (slot) slot.value = speech.lines[index];
      });
      if (speech.sections?.length) followSections(instance, robot, props, speech, layer);
      const color = vm?.color(robot.props.accent);
      if (color) color.value = argb(speech.rgb[0], speech.rgb[1], speech.rgb[2]);
      if (!reducedMotion()) instance.play();
      else {
        vm?.trigger(robot.props.settle)?.trigger();
        settle();
      }
      sync();
      window.setInterval(sync, 200);
      window.addEventListener("resize", sync);
    },
    onLoadError: () => {
      removeChrome();
      console.warn("Field-card robot failed to load.");
    },
  });
}

if (typeof document !== "undefined" && !framed()) {
  const cardId = readCardId();
  if (cardId) {
    mount(cardId).catch((err) => {
      console.warn("Field-card robot unavailable.", err);
      removeChrome();
    });
  }
}
