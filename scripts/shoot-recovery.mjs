/**
 * Shoot one frame per beat of the delay film, for reviewing the picture rather
 * than asserting on it — the e2e specs do the asserting. Point BASE at a running
 * server and OUT at a scratch directory.
 */

import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const OUT = process.env.OUT ?? "/tmp/recovery-shots";
const AT = [0, 0.08, 0.19, 0.25, 0.28, 0.32, 0.4, 0.47, 0.58, 0.66, 0.75, 0.79, 0.86, 0.97];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  colorScheme: "dark",
});
await page.goto(`${BASE}/stories/where-should-the-recovery-time-sit/film`);
await page.waitForSelector("[data-testid='delay-field']");

for (const at of AT) {
  await page.evaluate((at) => {
    document.documentElement.style.scrollBehavior = "auto";
    const el = document.querySelector("[data-testid='recovery-film']");
    const total = el.offsetHeight - window.innerHeight;
    window.scrollTo(0, el.offsetTop + total * at);
  }, at);
  await page.waitForTimeout(500);
  const beat = await page
    .getByTestId("film-stage")
    .getAttribute("data-beat");
  const name = `${String(Math.round(at * 100)).padStart(3, "0")}_beat${beat}.png`;
  await page.screenshot({ path: `${OUT}/${name}` });
  console.log(name);
}

// Ring Rail is the limiting case: the least margin and the most negative legs, so
// it is the one shot that has to show the amber side of the profile.
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = "auto";
  const el = document.querySelector("[data-testid='recovery-film']");
  const total = el.offsetHeight - window.innerHeight;
  window.scrollTo(0, el.offsetTop + total * 0.75);
});
await page.waitForTimeout(400);
await page.getByTestId("line-picker").getByText("Ring Rail Line").click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/900_ring_rail_beat8.png` });
console.log("900_ring_rail_beat8.png");

await browser.close();
