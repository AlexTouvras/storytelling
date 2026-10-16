/**
 * Measures the four UX-kit rules that looked transferable, on the running app.
 *
 *   node scripts/ux-benefit-demo.mjs
 *
 * Writes /tmp/ux-benefit/report.json and annotated screenshots.
 * Contrast is composited (opacity is not ignored) and, where the backdrop is a
 * gradient, a canvas, or another layer, sampled from a screenshot with the
 * glyphs hidden. Target size uses the WCAG 2.5.8 spacing and inline exceptions.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { chromium } from "@playwright/test";

const BASE = process.env.UX_BASE ?? "http://127.0.0.1:3210";
const OUT = "/tmp/ux-benefit";

const PAGES = [
  {
    id: "desk",
    path: "/desk/which-model",
    ready: "[data-testid='recommendation-name']",
  },
  {
    id: "method",
    path: "/stories/how-much-fast-reserve/method",
    ready: "[data-testid='method-page']",
  },
  {
    id: "film-open",
    path: "/stories/how-much-fast-reserve/film",
    ready: "[data-testid='orientation-card']",
  },
  {
    id: "film-beat",
    path: "/stories/how-much-fast-reserve/film",
    ready: "[data-testid='grid-film']",
    scrub: { track: "grid-film", at: 0.195 },
  },
  {
    id: "cutoff-sleeve",
    path: "/stories/where-should-the-cutoff-sit/film",
    ready: "[data-testid='cutoff-instrument']",
    reveal: "[data-testid='cutoff-instrument']",
  },
];

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePNG(buf) {
  let o = 8;
  let width = 0;
  let height = 0;
  let colorType = 6;
  const idat = [];
  while (o + 8 <= buf.length) {
    const len = buf.readUInt32BE(o);
    o += 4;
    const type = buf.toString("ascii", o, o + 4);
    o += 4;
    const data = buf.subarray(o, o + len);
    o += len + 4;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
  }
  const inflated = inflateSync(Buffer.concat(idat));
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!channels) throw new Error(`unsupported png color type ${colorType}`);
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);
  let i = 0;
  for (let y = 0; y < height; y++) {
    const filter = inflated[i++];
    const row = Buffer.from(inflated.subarray(i, i + stride));
    i += stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? row[x - channels] : 0;
      const up = prev[x];
      const ul = x >= channels ? prev[x - channels] : 0;
      if (filter === 1) row[x] = (row[x] + left) & 255;
      else if (filter === 2) row[x] = (row[x] + up) & 255;
      else if (filter === 3) row[x] = (row[x] + ((left + up) >> 1)) & 255;
      else if (filter === 4) row[x] = (row[x] + paeth(left, up, ul)) & 255;
    }
    for (let x = 0; x < width; x++) {
      const s = x * channels;
      const d = (y * width + x) * 4;
      out[d] = row[s];
      out[d + 1] = channels > 1 ? row[s + 1] : row[s];
      out[d + 2] = channels > 2 ? row[s + 2] : row[s];
      out[d + 3] = channels === 4 ? row[s + 3] : 255;
    }
    prev = row;
  }
  return { width, height, data: out };
}

function relLum(r, g, b) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(a, b) {
  const L1 = relLum(a[0], a[1], a[2]);
  const L2 = relLum(b[0], b[1], b[2]);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function composite(fg, bg) {
  const a = fg[3] ?? 1;
  return [
    Math.round(fg[0] * a + bg[0] * (1 - a)),
    Math.round(fg[1] * a + bg[1] * (1 - a)),
    Math.round(fg[2] * a + bg[2] * (1 - a)),
  ];
}

function averagePNG(png) {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const a = png.data[i + 3] / 255;
    if (a < 0.05) continue;
    r += png.data[i];
    g += png.data[i + 1];
    b += png.data[i + 2];
    n++;
  }
  if (!n) return null;
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

async function scrub(page, track, at) {
  await page.evaluate(
    ({ track, at }) => {
      document.documentElement.style.scrollBehavior = "auto";
      const el = document.querySelector(`[data-testid='${track}']`);
      if (!(el instanceof HTMLElement)) throw new Error(`no ${track}`);
      const total = el.offsetHeight - window.innerHeight;
      window.scrollTo(0, el.offsetTop + total * at);
    },
    { track, at },
  );
  await page.waitForTimeout(400);
}

async function collect(page) {
  return page.evaluate(() => {
    const parse = (css) => {
      if (!css || css === "transparent" || css === "none") return null;
      const m = css.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\)/);
      if (!m) return null;
      let a = m[4] == null ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      if (a > 1) a = 1;
      return [Number(m[1]), Number(m[2]), Number(m[3]), a];
    };
    const over = (fg, bg) => {
      const a = fg[3];
      return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1];
    };
    const backdrop = (el) => {
      const layers = [];
      let node = el;
      let reliable = true;
      while (node && node.nodeType === 1) {
        const cs = getComputedStyle(node);
        if (cs.backgroundImage && cs.backgroundImage !== "none") reliable = false;
        const bg = parse(cs.backgroundColor);
        if (bg && bg[3] > 0) layers.push(bg);
        if (bg && bg[3] >= 0.98) break;
        node = node.parentElement;
      }
      let acc = [18, 20, 32, 1];
      for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc);
      return { rgb: [Math.round(acc[0]), Math.round(acc[1]), Math.round(acc[2])], reliable };
    };

    const contrastNodes = [];
    let n = 0;
    const seen = new Set();
    for (const el of document.querySelectorAll("h1,h2,h3,p,a,button,label,legend,th,td,dt,dd,span,li,text,caption")) {
      if (el.closest("[hidden], .sr-only")) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
      const direct =
        el.localName === "text"
          ? (el.textContent || "").replace(/\s+/g, " ").trim()
          : [...el.childNodes]
              .filter((node) => node.nodeType === 3)
              .map((node) => node.textContent || "")
              .join(" ")
              .replace(/\s+/g, " ")
              .trim();
      if (!direct || direct.length > 80) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) continue;
      const fgCss = el.localName === "text" || el.namespaceURI === "http://www.w3.org/2000/svg" ? cs.fill : cs.color;
      const fg = parse(fgCss);
      if (!fg) continue;
      const back = backdrop(el);
      const painted = over(fg, [...back.rgb, 1]);
      const fontSize = parseFloat(cs.fontSize);
      const weight = Number(cs.fontWeight) || 400;
      const large = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700);
      const need = large ? 3 : 4.5;
      const L = (c) => {
        const f = (v) => {
          const s = v / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
      };
      const l1 = L(painted);
      const l2 = L(back.rgb);
      const value = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const key = `${direct}|${Math.round(value * 10)}|${Math.round(fontSize)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const id = `ux-${n++}`;
      el.setAttribute("data-ux-id", id);
      contrastNodes.push({
        id,
        text: direct,
        tag: el.localName,
        fontSize: Math.round(fontSize * 10) / 10,
        weight,
        large,
        need,
        ratio: Math.round(value * 100) / 100,
        reliable: back.reliable,
        fg: fgCss,
        bg: back.rgb,
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      });
    }

    const controls = [];
    for (const el of document.querySelectorAll("a, button, input, summary, [role='button']")) {
      if (el.closest("[hidden]")) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
      const inline = Boolean(el.closest("p, h1, h2, h3, h4"));
      const userAgent = el.localName === "input" && ["range", "checkbox", "radio", "file"].includes(el.getAttribute("type") || "");
      controls.push({
        tag: el.localName,
        text: (el.getAttribute("aria-label") || el.textContent || el.getAttribute("type") || "").replace(/\s+/g, " ").trim().slice(0, 60),
        x: rect.x,
        y: rect.y,
        w: rect.width,
        h: rect.height,
        inline,
        userAgent,
      });
    }

    const pictures = [];
    for (const svg of document.querySelectorAll("svg")) {
      const rect = svg.getBoundingClientRect();
      if (rect.width < 40 || rect.height < 40) continue;
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
      const texts = [...svg.querySelectorAll("text")]
        .map((t) => (t.textContent || "").replace(/\s+/g, " ").trim())
        .filter(Boolean);
      pictures.push({
        kind: "svg",
        label: svg.getAttribute("aria-label") || svg.querySelector("title")?.textContent || "",
        texts: texts.slice(0, 12),
        textCount: texts.length,
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      });
    }
    const canvases = [...document.querySelectorAll("canvas")].filter((canvas) => {
      const rect = canvas.getBoundingClientRect();
      return rect.width > 40 && rect.height > 40 && rect.top < window.innerHeight && rect.bottom > 0;
    });

    return { contrastNodes, controls, pictures, canvasCount: canvases.length };
  });
}

function spacingSaves(control, all) {
  if (control.w >= 24 && control.h >= 24) return true;
  const cx = control.x + control.w / 2;
  const cy = control.y + control.h / 2;
  for (const other of all) {
    if (other === control) continue;
    const ox = other.x + other.w / 2;
    const oy = other.y + other.h / 2;
    const dist = Math.hypot(cx - ox, cy - oy);
    if (dist < 24) return false;
  }
  return true;
}

async function pixelCorrect(page, nodes) {
  const suspects = nodes.filter((node) => !node.reliable || node.ratio < node.need + 0.4);
  for (const node of suspects) {
    const handle = page.locator(`[data-ux-id="${node.id}"]`).first();
    if ((await handle.count()) === 0) continue;
    const box = await handle.boundingBox();
    if (!box || box.width < 2 || box.height < 2) continue;
    await handle.evaluate((el) => {
      el.dataset.uxColor = el.style.color;
      el.dataset.uxFill = el.style.fill;
      el.style.setProperty("color", "transparent", "important");
      el.style.setProperty("fill", "transparent", "important");
      el.style.setProperty("-webkit-text-fill-color", "transparent", "important");
    });
    const clip = {
      x: Math.max(0, box.x),
      y: Math.max(0, box.y),
      width: Math.max(1, Math.min(box.width, 280)),
      height: Math.max(1, Math.min(box.height, 64)),
    };
    const buf = await page.screenshot({ clip });
    await handle.evaluate((el) => {
      el.style.color = el.dataset.uxColor || "";
      el.style.fill = el.dataset.uxFill || "";
      el.style.webkitTextFillColor = "";
    });
    const bg = averagePNG(decodePNG(buf));
    if (!bg) continue;
    const fgMatch = node.fg.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\)/);
    if (!fgMatch) continue;
    let a = fgMatch[4] == null ? 1 : fgMatch[4].endsWith("%") ? parseFloat(fgMatch[4]) / 100 : parseFloat(fgMatch[4]);
    if (a > 1) a /= 255;
    const painted = composite([Number(fgMatch[1]), Number(fgMatch[2]), Number(fgMatch[3]), a], bg);
    node.computedRatio = node.ratio;
    node.ratio = Math.round(ratio(painted, bg) * 100) / 100;
    node.bg = bg;
    node.sampled = true;
    node.reliable = true;
  }
}

async function shot(page, name) {
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function openPage(page, spec) {
  await page.goto(BASE + spec.path, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForSelector(spec.ready, { timeout: 30_000 });
  if (spec.scrub) await scrub(page, spec.scrub.track, spec.scrub.at);
  if (spec.reveal) {
    await page.locator(spec.reveal).scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(250);
}

async function interactions(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
  const page = await context.newPage();
  const results = [];
  await page.goto(`${BASE}/desk/which-model`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid='recommendation-name']");
  const before = await page.getByTestId("recommendation-name").innerText();
  const fitBefore = await page.getByTestId("fit-score").innerText();
  await page.getByTestId("workload-translation").click();
  await page.waitForTimeout(200);
  const after = await page.getByTestId("recommendation-name").innerText();
  results.push({
    control: "Workload · Translation",
    changed: before !== after,
    detail: `${before.trim()} → ${after.trim()}`,
  });
  const slider = page.locator("#weight-cost");
  await slider.focus();
  for (let step = 0; step < 20; step++) await slider.press("ArrowRight");
  await page.waitForTimeout(150);
  const fitAfter = await page.getByTestId("fit-score").innerText();
  results.push({
    control: "Price weight",
    changed: fitBefore !== fitAfter,
    detail: `${fitBefore.trim()} → ${fitAfter.trim()}`,
  });
  const expand = page.getByRole("button", { name: /All \d+ models/ });
  await expand.click();
  const expanded = await page.getByRole("button", { name: "Top of the ranking" }).getAttribute("aria-expanded");
  const rows = await page.locator("table tbody tr").count();
  results.push({
    control: "All models",
    changed: expanded === "true" && rows > 8,
    detail: `aria-expanded ${expanded}, ${rows} rows in the table`,
  });
  await shot(page, "desk-after-translation");

  await page.goto(`${BASE}/stories/how-much-fast-reserve/film`, { waitUntil: "networkidle" });
  await page.getByTestId("terms-toggle").click();
  const drawerOpen = await page.getByTestId("terms-drawer").isVisible();
  await page.keyboard.press("Escape");
  const focusBack = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
  const drawerClosed = await page.getByTestId("terms-drawer").isHidden();
  results.push({
    control: "Terms drawer",
    changed: drawerOpen && drawerClosed && focusBack === "terms-toggle",
    detail: `opens (${drawerOpen}), Escape closes (${drawerClosed}), focus returns to ${focusBack}`,
  });

  await scrub(page, "grid-film", 0.195);
  const term = page.locator("[data-testid='term-button'][data-term='trip']");
  if (await term.count()) {
    await term.click();
    const expanded = await term.getAttribute("aria-expanded");
    const def = page.locator("[data-testid='term-definition']");
    results.push({
      control: "Term · trip",
      changed: expanded === "true" && (await def.isVisible()),
      detail: "the definition opens in the subtitle",
    });
    await shot(page, "term-open");
  } else {
    results.push({ control: "Term · trip", changed: false, detail: "term button was not on this beat" });
  }

  await page.goto(`${BASE}/stories/where-should-the-cutoff-sit/film`, { waitUntil: "networkidle" });
  await page.getByTestId("cutoff-instrument").scrollIntoViewIfNeeded();
  const gateBefore = await page.getByTestId("instrument-gate").innerText();
  const chartBefore = await page.locator("[data-testid='cutoff-instrument'] svg").getAttribute("aria-label");
  const gateSlider = page.getByTestId("cutoff-slider");
  await gateSlider.focus();
  for (let i = 0; i < 8; i++) await gateSlider.press("ArrowRight");
  await page.waitForTimeout(150);
  const gateAfter = await page.getByTestId("instrument-gate").innerText();
  const chartAfter = await page.locator("[data-testid='cutoff-instrument'] svg").getAttribute("aria-label");
  results.push({
    control: "Cut-off slider",
    changed: gateBefore !== gateAfter && chartBefore !== chartAfter,
    detail: `${gateBefore.trim()} → ${gateAfter.trim()}; chart name moved with the gate`,
  });
  await shot(page, "cutoff-sleeve");

  await context.close();

  const reduced = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  const quiet = await reduced.newPage();
  await quiet.goto(`${BASE}/stories/how-much-fast-reserve/film`, { waitUntil: "networkidle" });
  await quiet.waitForSelector("[data-testid='grid-film']");
  await scrub(quiet, "grid-film", 0.195);
  const line = (await quiet.getByTestId("subtitle-line").innerText().catch(() => "")).trim();
  const figure = (await quiet.getByTestId("hero-figure").innerText().catch(() => "")).trim();
  results.push({
    control: "Reduced motion, grid beat",
    changed: line.length > 0,
    detail: figure ? `subtitle “${line.slice(0, 72)}” and figure ${figure} still on screen` : `subtitle “${line.slice(0, 90)}” still on screen`,
  });
  await shot(quiet, "reduced-motion-beat");
  await reduced.close();
  return results;
}

async function auditViewport(browser, viewport, label) {
  const context = await browser.newContext({ viewport, colorScheme: "dark", deviceScaleFactor: 1 });
  const page = await context.newPage();
  const pages = [];
  for (const spec of PAGES) {
    if (label === "phone" && (spec.id === "film-beat" || spec.id === "cutoff-beat")) continue;
    await openPage(page, spec);
    const data = await collect(page);
    await pixelCorrect(page, data.contrastNodes);
    const failing = data.contrastNodes
      .filter((node) => node.ratio + 0.02 < node.need)
      .sort((a, b) => a.ratio / a.need - b.ratio / b.need);
    const passing = data.contrastNodes.filter((node) => node.ratio + 0.02 >= node.need);
    const targets = data.controls.map((control) => {
      const undersized = control.w < 24 || control.h < 24;
      const saved = control.inline || control.userAgent || spacingSaves(control, data.controls);
      return {
        ...control,
        w: Math.round(control.w * 10) / 10,
        h: Math.round(control.h * 10) / 10,
        undersized,
        passes: !undersized || saved,
        exception: control.inline ? "inline" : control.userAgent ? "user-agent" : undersized && saved ? "spacing" : null,
      };
    });
    const targetFails = targets.filter((t) => !t.passes);
    const strictUndersized = targets.filter((t) => t.undersized);
    const unlabeled = data.pictures.filter((pic) => pic.textCount === 0);
    if (failing.length) {
      await page.evaluate((ids) => {
        for (const id of ids) {
          const el = document.querySelector(`[data-ux-id="${id}"]`);
          if (!el) continue;
          el.style.outline = "2px solid #ff5a7a";
          el.style.outlineOffset = "2px";
        }
      }, failing.slice(0, 8).map((node) => node.id));
    }
    const file = await shot(page, `${label}-${spec.id}`);
    pages.push({
      id: spec.id,
      path: spec.path,
      screenshot: file,
      contrastFail: failing.slice(0, 12),
      contrastPass: passing.length,
      contrastChecked: data.contrastNodes.length,
      targetFails,
      strictUndersized: strictUndersized.map((t) => ({
        text: t.text,
        w: t.w,
        h: t.h,
        passes: t.passes,
        exception: t.exception,
      })),
      targetsChecked: targets.length,
      pictures: data.pictures,
      unlabeled,
      canvasCount: data.canvasCount,
    });
    console.log(
      `${label} ${spec.id}: contrast ${failing.length}/${data.contrastNodes.length} fail, targets ${targetFails.length} wcag-fail / ${strictUndersized.length} under-24 of ${targets.length}, svg ${data.pictures.length} (${unlabeled.length} unlabeled), canvas ${data.canvasCount}`,
    );
  }
  await context.close();
  return pages;
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const desktop = await auditViewport(browser, { width: 1280, height: 800 }, "desk");
const phone = await auditViewport(browser, { width: 390, height: 844 }, "phone");
const acts = await interactions(browser);
await browser.close();

const report = { base: BASE, ranAt: new Date().toISOString(), desktop, phone, interactions: acts };
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
for (const page of [...desktop, ...phone]) {
  if (!page.contrastFail.length && !page.targetFails.length) continue;
  console.log(`\n${page.id}`);
  for (const row of page.contrastFail.slice(0, 6)) {
    console.log(`  ${row.ratio}:1 need ${row.need} ${row.fontSize}px <${row.tag}> ${row.text}`);
  }
  for (const row of page.targetFails.slice(0, 4)) {
    console.log(`  target ${row.w}x${row.h} ${row.text}`);
  }
}
console.log("interactions", acts.map((a) => `${a.changed ? "ok" : "FAIL"} ${a.control}: ${a.detail}`).join("\n"));
console.log(`wrote ${OUT}/report.json`);
