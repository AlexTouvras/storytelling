// Dev aid: screenshot the lecture board at each beat so the drawing can be judged.
// Not part of the suite. `node scripts/shoot-lecture.mjs [outDir] [width] [height]`
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const out = process.argv[2] ?? "/tmp/lecture-shots";
const width = Number(process.argv[3] ?? 1440);
const height = Number(process.argv[4] ?? 900);
const base = process.env.BASE ?? "http://127.0.0.1:3100";

mkdirSync(out, { recursive: true });

const stops = [0.02, 0.09, 0.19, 0.26, 0.35, 0.46, 0.57, 0.69, 0.81, 0.93];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height }, colorScheme: "light" });
await page.goto(`${base}/lab/lectures/agentic-ai`);
await page.waitForSelector("[data-testid='lecture-board']");

const track = page.locator("[data-testid='lecture-track']");
const box = await track.boundingBox();

for (const p of stops) {
  const total = (await track.evaluate((el) => el.offsetHeight)) - height;
  await page.evaluate(
    ([top]) => window.scrollTo({ top, behavior: "instant" }),
    [box.y + p * total],
  );
  await page.waitForTimeout(700);
  const beat = await page.getAttribute("[data-testid='film-stage']", "data-beat");
  await page.screenshot({ path: `${out}/p${String(Math.round(p * 100)).padStart(2, "0")}-beat${beat}.png` });
}

// The podium, with speaker notes.
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await page.click("[data-testid='present-button']");
await page.waitForSelector("[data-testid='lecture-podium']");
await page.keyboard.press("ArrowRight");
await page.keyboard.press("ArrowRight");
await page.keyboard.press("ArrowRight");
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/podium-notes.png` });

await browser.close();
console.log(`shots in ${out}`);
