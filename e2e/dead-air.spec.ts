import { test, expect, type Page } from "@playwright/test";
import { RATE_HOLDS } from "../src/components/film/frame";
import { CUTOFF_HOLDS } from "../src/components/film/cutoff-frame";

/**
 * The dead-air gate, measured on pixels rather than on intent.
 *
 * Both cue tables contain spans where no drawn channel moves — a third of the
 * rate film and nearly half of the cut-off film, closing beats included. Those
 * are the spans a reader dwells in, because that is when they are reading. This
 * walks to the middle of each one, stops, and measures how much of the canvas
 * changes over the next second.
 */

/** Per-channel difference that counts as a changed pixel. */
const THRESHOLD = 4;
/** Every seventh pixel; the marks are far smaller than the stride's error. */
const STRIDE = 7;
/** Share of sampled pixels that must change while the reader holds still. */
const FLOOR = 0.001;
const WINDOW_MS = 1000;

async function changedFraction(page: Page, ms: number): Promise<number> {
  return page.evaluate(
    async ({ ms, threshold, stride }) => {
      const canvas = document.querySelector<HTMLCanvasElement>(
        "[data-testid='film-stage'] canvas",
      );
      if (!canvas) throw new Error("no film canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("no 2d context");
      const read = () => ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      const before = read();
      await new Promise((resolve) => setTimeout(resolve, ms));
      const after = read();

      let changed = 0;
      let total = 0;
      for (let i = 0; i < before.length; i += 4 * stride) {
        total++;
        if (
          Math.abs(before[i] - after[i]) > threshold ||
          Math.abs(before[i + 1] - after[i + 1]) > threshold ||
          Math.abs(before[i + 2] - after[i + 2]) > threshold ||
          Math.abs(before[i + 3] - after[i + 3]) > threshold
        ) {
          changed++;
        }
      }
      return total === 0 ? 0 : changed / total;
    },
    { ms, threshold: THRESHOLD, stride: STRIDE },
  );
}

async function scrubTo(page: Page, track: string, at: number) {
  await page.evaluate(
    ({ track, at }) => {
      document.documentElement.style.scrollBehavior = "auto";
      const el = document.querySelector(`[data-testid='${track}']`);
      if (!(el instanceof HTMLElement)) throw new Error(`no track ${track}`);
      const total = el.offsetHeight - window.innerHeight;
      window.scrollTo(0, el.offsetTop + total * at);
    },
    { track, at },
  );
  await page.waitForTimeout(300);
}

const FILMS = [
  {
    name: "when-rates-rise",
    path: "/stories/when-rates-rise/film",
    track: "rate-film",
    holds: RATE_HOLDS,
  },
  {
    name: "where-should-the-cutoff-sit",
    path: "/stories/where-should-the-cutoff-sit/film",
    track: "cutoff-film",
    holds: CUTOFF_HOLDS,
  },
];

for (const film of FILMS) {
  test.describe(`${film.name} dead air`, () => {
    test("the canvas keeps living through every held beat", async ({ page }) => {
      await page.goto(film.path);
      await expect(page.locator("[data-testid='film-stage'] canvas")).toBeVisible();

      for (const hold of film.holds) {
        const mid = (hold.from + hold.to) / 2;
        await scrubTo(page, film.track, mid);
        const fraction = await changedFraction(page, WINDOW_MS);
        expect(
          fraction,
          `beat ${hold.beat} at ${(mid * 100).toFixed(0)}% was still`,
        ).toBeGreaterThan(FLOOR);
      }
    });

    test("reduced motion holds a still frame", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(film.path);
      await expect(page.locator("[data-testid='film-stage'] canvas")).toBeVisible();

      const hold = film.holds[film.holds.length - 1];
      await scrubTo(page, film.track, (hold.from + hold.to) / 2);
      expect(await changedFraction(page, 600)).toBe(0);
    });
  });
}
