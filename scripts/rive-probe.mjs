/**
 * Loads a generated `.riv` in the pinned Rive web runtime, in headless
 * Chromium, with no app around it. The decoder in `riv-writer` can only prove
 * a file says what the builder meant; this proves the runtime reads it the same
 * way — a type it does not know, or an object in the wrong place, shows up
 * here as "Failed to import object of type N" or as a property that is missing.
 *
 *   node scripts/rive-probe.mjs src/illustrations/robot.riv [--artboard Robot] [--machine Robot] [--shot out.png]
 *
 * Prints the artboards, the view model and its properties, and the runtime's
 * own console output. `probe()` is exported for scripts that drive the file.
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const RUNTIME = join(process.cwd(), "node_modules", "@rive-app", "canvas");

const PAGE = (width, height) => `<!doctype html><html><body style="margin:0;background:#03050f">
<canvas id="c" width="${width}" height="${height}" style="width:${width}px;height:${height}px"></canvas>
<script src="/rive.js"></script>
<script>
  window.boot = (opts) => new Promise((resolve, reject) => {
    rive.RuntimeLoader.setWasmUrl("/rive.wasm");
    const r = new rive.Rive({
      src: "/file.riv",
      canvas: document.getElementById("c"),
      artboard: opts.artboard,
      stateMachine: opts.machine,
      autoplay: true,
      autoBind: true,
      layout: new rive.Layout({ fit: rive.Fit.Contain, alignment: rive.Alignment.Center }),
      onLoad: () => { window.R = r; resolve(true); },
      onLoadError: (e) => reject(String(e)),
    });
  });
  window.describe = () => {
    const r = window.R;
    const vmi = r.viewModelInstance;
    return {
      artboards: r.contents?.artboards?.map((a) => ({ name: a.name, machines: a.stateMachines.map((s) => s.name) })) ?? [],
      viewModel: vmi ? { name: vmi.viewModelName, properties: vmi.properties.map((p) => p.name + ":" + p.type) } : null,
    };
  };
</script></body></html>`;

export async function probe(rivBytes, { artboard, machine, width = 400, height = 400, scale = 1 } = {}, drive) {
  const files = {
    "/rive.js": [readFileSync(join(RUNTIME, "rive.js")), "text/javascript"],
    "/rive.wasm": [readFileSync(join(RUNTIME, "rive.wasm")), "application/wasm"],
    "/file.riv": [Buffer.from(rivBytes), "application/octet-stream"],
    "/": [Buffer.from(PAGE(width, height)), "text/html"],
  };
  const server = createServer((req, res) => {
    const f = files[req.url.split("?")[0]];
    if (!f) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": f[1] }).end(f[0]);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const logs = [];
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
    page.on("console", (m) => logs.push(`${m.type()}: ${m.text()}`));
    page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
    await page.goto(url);
    await page.evaluate((o) => window.boot(o), { artboard, machine });
    const info = await page.evaluate(() => window.describe());
    const result = drive ? await drive(page, info) : undefined;
    return { info, logs, result };
  } finally {
    await browser.close();
    server.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (name) => {
    const i = args.indexOf(`--${name}`);
    return i < 0 ? undefined : args[i + 1];
  };
  const file = args[0];
  const shot = opt("shot");
  const { info, logs } = await probe(
    readFileSync(file),
    { artboard: opt("artboard"), machine: opt("machine") },
    async (page) => {
      await page.waitForTimeout(600);
      if (shot) await page.locator("#c").screenshot({ path: shot });
    },
  );
  console.log(JSON.stringify(info, null, 2));
  for (const l of logs) console.log(l);
  if (logs.some((l) => /Failed to import|pageerror|error:/i.test(l))) process.exit(1);
}
