/**
 * Report the dead-air probe's numbers rather than just its pass/fail.
 *
 * The gate in `e2e/dead-air.spec.ts` is the contract; this is for reading how
 * much room a held frame actually has above the floor, which is what tells you
 * whether a change fixed the picture or merely cleared the bar. Same probe
 * geometry and threshold as the gate — if those two ever drift apart, the gate
 * wins.
 *
 * Usage: node scripts/measure-dead-air.mjs [baseURL]
 */
import { chromium, devices } from "playwright";
import { RATE_HOLDS } from "../src/components/film/frame.ts";
import { CUTOFF_HOLDS } from "../src/components/film/cutoff-frame.ts";
import { RECOVERY_HOLDS } from "../src/components/film/recovery-frame.ts";

const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const FLOOR = 0.002;

const FILMS = [
  { name: "when-rates-rise", path: "/stories/when-rates-rise/film", track: "rate-film", holds: RATE_HOLDS },
  { name: "where-should-the-cutoff-sit", path: "/stories/where-should-the-cutoff-sit/film", track: "cutoff-film", holds: CUTOFF_HOLDS },
  { name: "why-dont-delays-die", path: "/stories/where-should-the-recovery-time-sit/film", track: "recovery-film", holds: RECOVERY_HOLDS },
];

const browser = await chromium.launch();
const asPhone = process.argv.includes("--phone");
const page = await browser.newPage(
  asPhone
    ? { ...devices["Pixel 7"], colorScheme: "dark" }
    : { viewport: { width: 1280, height: 720 }, colorScheme: "dark" },
);
console.log(asPhone ? "Pixel 7 viewport" : "1280x720 viewport");

for (const film of FILMS) {
  await page.goto(BASE + film.path);
  await page.waitForSelector("[data-testid='film-stage'] canvas");
  console.log(`\n${film.name}`);
  for (const hold of film.holds) {
    const mid = (hold.from + hold.to) / 2;
    await page.evaluate(
      ({ track, at }) => {
        document.documentElement.style.scrollBehavior = "auto";
        const el = document.querySelector(`[data-testid='${track}']`);
        const total = el.offsetHeight - window.innerHeight;
        window.scrollTo(0, el.offsetTop + total * at);
      },
      { track: film.track, at: mid },
    );
    await page.waitForTimeout(300);
    const { mean, identical } = await page.evaluate(async () => {
      const canvas = document.querySelector("[data-testid='film-stage'] canvas");
      const scratch = document.createElement("canvas");
      scratch.width = 320;
      scratch.height = 200;
      const ctx = scratch.getContext("2d", { willReadFrequently: true });
      const shots = [];
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        ctx.clearRect(0, 0, 320, 200);
        ctx.drawImage(canvas, 0, 0, 320, 200);
        shots.push(ctx.getImageData(0, 0, 320, 200).data);
      }
      let total = 0;
      let identical = 0;
      for (let f = 1; f < shots.length; f++) {
        const a = shots[f - 1];
        const b = shots[f];
        let changed = 0;
        for (let i = 0; i < a.length; i += 4) {
          if (Math.abs(a[i] - b[i]) > 4 || Math.abs(a[i + 1] - b[i + 1]) > 4 || Math.abs(a[i + 2] - b[i + 2]) > 4) changed++;
        }
        if (changed === 0) identical++;
        total += changed / (320 * 200);
      }
      return { mean: total / (shots.length - 1), identical };
    });
    const x = (mean / FLOOR).toFixed(1);
    console.log(
      `  beat ${String(hold.beat).padStart(2)} at ${(mid * 100).toFixed(0).padStart(3)}%  ` +
        `mean ${(mean * 100).toFixed(3)}%  ${x}x floor  identical ${identical}`,
    );
  }
}

await browser.close();
