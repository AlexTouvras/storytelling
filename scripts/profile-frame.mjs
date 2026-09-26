/**
 * Self-time per function for one film frame, via the V8 sampling profiler.
 *
 * The frame-cost gate says which frames are dear. This says why: it parks the
 * film on a progress, samples, and aggregates self time by function so the draw
 * can be cut where the time actually is rather than where it looks expensive.
 *
 * Usage: node scripts/profile-frame.mjs <path> <track> <at> [baseURL]
 */
import { chromium } from "playwright";

const [path, track, at, base = "http://127.0.0.1:3100"] = process.argv.slice(2);
if (!path) throw new Error("usage: profile-frame.mjs <path> <track> <at> [baseURL]");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, colorScheme: "dark" });
await page.goto(base + path);
await page.waitForSelector("[data-testid='film-stage'] canvas");
await page.evaluate(
  ({ track, at }) => {
    document.documentElement.style.scrollBehavior = "auto";
    const el = document.querySelector(`[data-testid='${track}']`);
    window.scrollTo(0, el.offsetTop + (el.offsetHeight - window.innerHeight) * at);
  },
  { track, at: Number(at) },
);
await page.waitForTimeout(400);

const cdp = await page.context().newCDPSession(page);
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
await cdp.send("Profiler.start");
await page.waitForTimeout(3000);
const { profile } = await cdp.send("Profiler.stop");

const self = new Map();
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
for (const node of profile.nodes) {
  const f = node.callFrame;
  const name = `${f.functionName || "(anonymous)"}`;
  self.set(name, (self.get(name) ?? 0) + (node.hitCount ?? 0));
}
const total = [...self.values()].reduce((a, b) => a + b, 0);
const ranked = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22);

console.log(`\n${path} at ${at} — ${total} samples over 3s\n`);
for (const [name, hits] of ranked) {
  if (hits / total < 0.004) continue;
  console.log(`  ${((hits / total) * 100).toFixed(1).padStart(5)}%  ${hits.toString().padStart(6)}  ${name}`);
}

await browser.close();
void byId;
