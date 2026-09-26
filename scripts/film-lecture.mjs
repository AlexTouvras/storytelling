// Dev aid: record the lecture so the motion can be judged, not just the stills.
// `node scripts/film-lecture.mjs [outDir]`
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const out = process.argv[2] ?? "/tmp/lecture-film";
const base = process.env.BASE ?? "http://127.0.0.1:3100";
const width = 1280;
const height = 800;

mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width, height },
  colorScheme: "light",
  recordVideo: { dir: out, size: { width, height } },
});
const page = await context.newPage();
await page.goto(`${base}/lab/lectures/agentic-ai`);
await page.waitForSelector("[data-testid='lecture-board']");

// A reader's pass: ease down the track rather than jumping between beats.
const track = page.locator("[data-testid='lecture-track']");
const box = await track.boundingBox();
const total = (await track.evaluate((el) => el.offsetHeight)) - height;

await page.evaluate(() => (document.documentElement.style.scrollBehavior = "auto"));
const steps = 150;
for (let i = 0; i <= steps; i++) {
  const p = i / steps;
  await page.evaluate((top) => window.scrollTo(0, top), box.y + p * total);
  // Dwell on the beat changes, the way a reader stops to read.
  await page.waitForTimeout([12, 30, 48, 66, 84, 102, 120, 138].includes(i) ? 900 : 90);
}
await page.waitForTimeout(1200);

// The podium: clock-driven, with notes.
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
await page.click("[data-testid='present-button']");
await page.waitForSelector("[data-testid='lecture-podium']");
await page.waitForTimeout(2500);
for (let i = 0; i < 4; i++) {
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(2200);
}
await page.keyboard.press("Escape");
await page.waitForTimeout(1200);

await context.close();
await browser.close();
console.log(`video in ${out}`);
