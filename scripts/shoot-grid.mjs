/**
 * Shoot one frame per beat of the grid film, on a laptop and a phone, for
 * reviewing the picture rather than asserting on it. Point BASE at a running
 * server and OUT at a scratch directory.
 */

import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3200";
const OUT = process.env.OUT ?? "/tmp/grid-shots";
const AT = (process.env.AT ?? "0,0.08,0.15,0.22,0.3,0.35,0.39,0.44,0.52,0.6,0.67,0.77,0.84,0.9,0.96,0.99")
  .split(",")
  .map(Number);
const SIZES = [
  { name: "laptop", width: 1280, height: 800 },
  { name: "phone", width: 390, height: 844 },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
for (const size of SIZES) {
  const page = await browser.newPage({ viewport: size, colorScheme: "dark", deviceScaleFactor: 2 });
  await page.goto(`${BASE}/stories/how-much-fast-reserve/film`);
  await page.waitForSelector("[data-testid='grid-film']");
  await page.screenshot({ path: `${OUT}/${size.name}_prologue.png` });
  for (const at of AT) {
    await page.evaluate((at) => {
      document.documentElement.style.scrollBehavior = "auto";
      const el = document.querySelector("[data-testid='grid-film']");
      const total = el.offsetHeight - window.innerHeight;
      window.scrollTo(0, el.offsetTop + total * at);
    }, at);
    await page.waitForTimeout(900);
    const beat = await page.getByTestId("film-stage").getAttribute("data-beat");
    const name = `${size.name}_${String(Math.round(at * 100)).padStart(3, "0")}_beat${beat}.png`;
    await page.screenshot({ path: `${OUT}/${name}` });
    console.log(name);
  }
  await page.close();
}
await browser.close();
