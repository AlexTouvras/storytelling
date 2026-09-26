/**
 * Record the delay film scrubbing end to end, for review rather than assertion.
 *
 * `shoot-recovery.mjs` puts a still on disk per beat, which is how the drawing bugs
 * were found. Stills cannot show the things that only exist in time: whether a
 * transition dissolves or pops, whether a declared hold is alive, whether the
 * camera drifts or drags. This scrubs at roughly reading pace, dwells on each of
 * the three declared holds, and operates the picker.
 *
 * Watching this is how the 1280x720 collision between the margin strip and the
 * narration was found, after a dozen passing gates and fifteen screenshots shot
 * tall enough to miss it.
 *
 * Usage: node scripts/record-recovery.mjs [outDir]  (writes a .webm)
 */
import { chromium } from "@playwright/test";

const OUT = process.argv[2] ?? "/tmp/film-video";
const SIZE = { width: 1280, height: 720 };

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: SIZE,
  colorScheme: "dark",
  recordVideo: { dir: OUT, size: SIZE },
});
const page = await context.newPage();
await page.goto("http://127.0.0.1:3100/stories/where-should-the-recovery-time-sit/film");
await page.waitForSelector("[data-testid='delay-field']");
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = "auto";
});

const scrubTo = async (at) =>
  page.evaluate((at) => {
    const el = document.querySelector("[data-testid='recovery-film']");
    window.scrollTo(0, el.offsetTop + (el.offsetHeight - window.innerHeight) * at);
  }, at);

const ramp = async (from, to, seconds) => {
  const frames = Math.round(seconds * 30);
  for (let i = 0; i <= frames; i++) {
    await scrubTo(from + ((to - from) * i) / frames);
    await page.waitForTimeout(33);
  }
};

await scrubTo(0);
await page.waitForTimeout(2000);

// Acts 0-V: the open, the settle, the one run, the carry, the curve, the split.
await ramp(0, 0.5, 11);
// Act VI holds: the season panel rises over a canvas the camera is creeping through.
await ramp(0.5, 0.56, 2);
await page.waitForTimeout(3500);
// Act VII: margin.
await ramp(0.56, 0.7, 4);
await page.waitForTimeout(1500);
// Act VIII: the picker. Hold on it, then change the line.
await ramp(0.7, 0.75, 2);
await page.waitForTimeout(2500);
await page.getByTestId("line-picker").getByText("Ring Rail Line").click();
await page.waitForTimeout(3000);
await page.getByTestId("line-picker").getByText("Helsinki - Rovaniemi north main line").click();
await page.waitForTimeout(2000);
// Act IX: the counterfactual scrub, in its frozen steps.
await ramp(0.75, 0.9, 6);
// Act X: the decision, over the film's last declared hold.
await ramp(0.9, 0.97, 3);
await page.waitForTimeout(4000);

await context.close();
await browser.close();
console.log("recorded");
