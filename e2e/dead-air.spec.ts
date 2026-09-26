import { test, expect, type Page } from "@playwright/test";
import { RATE_HOLDS } from "../src/components/film/frame";
import { CUTOFF_HOLDS } from "../src/components/film/cutoff-frame";
import { RECOVERY_HOLDS } from "../src/components/film/recovery-frame";

/**
 * The dead-air gate, measured on pixels rather than on intent.
 *
 * Every cue table contains spans where no drawn channel moves — a third of the
 * rate film, nearly half of the cut-off film, and three declared holds in the
 * delay film, closing beats included. Those are the spans a reader dwells in,
 * because that is when they are reading. This walks to the middle of each one,
 * stops, and measures the canvas frame by frame.
 *
 * Frame by frame is the point. The first version of this gate compared two
 * reads a second apart, and a drift far too slow for anyone to perceive sailed
 * through it while a third of consecutive frames were bit-identical. anidoodle
 * warns about exactly that: a creeping camera changes every pixel and satisfies
 * the tool while the eye sees a still. So the floors here are its floors — no
 * identical consecutive frames, and no short window that is effectively still.
 */

/** Per-channel difference that counts as a changed pixel. */
const THRESHOLD = 4;
/** Frames sampled per probe: half a second at 60 Hz. */
const FRAMES = 30;
/** Downscale before comparing, as the reference metric does. */
const PROBE_W = 320;
const PROBE_H = 200;
/**
 * Mean share of pixels that must change from one frame to the next. The hard
 * rule is `identical === 0`; this floor is the backstop against a frame that
 * technically moves and visually does not. It is set by the sparsest frame
 * either film holds on — the rate film's beat-2 close-up, where one loan and a
 * rule are the only things on screen, and which measures about 0.3%.
 */
const FLOOR = 0.002;

type Probe = {
  /** Mean changed-pixel fraction between consecutive frames. */
  mean: number;
  /** Consecutive frames that were bit-identical. Must be zero. */
  identical: number;
};

async function probe(page: Page, frames = FRAMES): Promise<Probe> {
  return page.evaluate(
    async ({ frames, threshold, w, h }) => {
      const canvas = document.querySelector<HTMLCanvasElement>(
        "[data-testid='film-stage'] canvas",
      );
      if (!canvas) throw new Error("no film canvas");
      const scratch = document.createElement("canvas");
      scratch.width = w;
      scratch.height = h;
      const ctx = scratch.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("no 2d context");

      const shots: Uint8ClampedArray[] = [];
      for (let i = 0; i < frames; i++) {
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(canvas, 0, 0, w, h);
        shots.push(ctx.getImageData(0, 0, w, h).data);
      }

      let total = 0;
      let identical = 0;
      for (let f = 1; f < shots.length; f++) {
        const a = shots[f - 1];
        const b = shots[f];
        let changed = 0;
        for (let i = 0; i < a.length; i += 4) {
          if (
            Math.abs(a[i] - b[i]) > threshold ||
            Math.abs(a[i + 1] - b[i + 1]) > threshold ||
            Math.abs(a[i + 2] - b[i + 2]) > threshold
          ) {
            changed++;
          }
        }
        if (changed === 0) identical++;
        total += changed / (w * h);
      }
      return { mean: total / (shots.length - 1), identical };
    },
    { frames, threshold: THRESHOLD, w: PROBE_W, h: PROBE_H },
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
  {
    name: "why-dont-delays-die",
    path: "/stories/where-should-the-recovery-time-sit/film",
    track: "recovery-film",
    holds: RECOVERY_HOLDS,
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
        const where = `beat ${hold.beat} at ${(mid * 100).toFixed(0)}%`;
        const { mean, identical } = await probe(page);
        expect(identical, `${where} repeated a frame`).toBe(0);
        expect(mean, `${where} was effectively still`).toBeGreaterThan(FLOOR);
      }
    });

    test("reduced motion holds a still frame", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(film.path);
      await expect(page.locator("[data-testid='film-stage'] canvas")).toBeVisible();

      const hold = film.holds[film.holds.length - 1];
      await scrubTo(page, film.track, (hold.from + hold.to) / 2);
      const { mean, identical } = await probe(page, 12);
      expect(mean).toBe(0);
      expect(identical).toBe(11);
    });
  });
}
