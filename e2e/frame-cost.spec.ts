import { test, expect, type Page } from "@playwright/test";
import { RATE_HOLDS } from "../src/components/film/frame";
import { CUTOFF_HOLDS } from "../src/components/film/cutoff-frame";
import { RECOVERY_HOLDS } from "../src/components/film/recovery-frame";

/**
 * What the craft layer costs per frame.
 *
 * `docs/ANIMATION_CRAFT.md` shipped with this as an admitted gap: per-mark life and
 * camera creep added a handful of `sin` calls across ~2,400 marks, and nobody had
 * measured the result on any device. The dead-air gate proves the canvas moves; it
 * says nothing about whether it moves smoothly.
 *
 * So this measures frame intervals at the *densest* held beat of each film — the
 * worst case, where the whole field is on screen and the camera is creeping — and
 * again under CPU throttling, which is the honest stand-in for a mid-range phone.
 * Budgets are deliberately loose: this is a floor against a regression that would
 * be visible, not a benchmark to optimise against.
 */

/** Frames sampled per probe. */
const FRAMES = 120;
/**
 * Throttle factor standing in for a mid-range phone. Chromium's own guidance for
 * emulating low-end mobile on a desktop CPU is 4x.
 */
const PHONE_CPU = 4;
/**
 * A dropped frame at 60 Hz. The budget is on the 95th percentile rather than the
 * worst frame, because one long frame is scheduling noise on a shared CI box.
 */
const P95_BUDGET_MS = 34;
/**
 * Under throttling the films measured 33–50 ms at the median — a deliberate 30 Hz
 * rather than 60. That is the cost of the feature, not a defect: a held beat now
 * produces a genuinely new bitmap every frame, so every frame is composited. The
 * ceiling here is a regression guard against something an order worse, not an
 * endorsement of the number. Tightening it means reducing the work, not the budget.
 */
const THROTTLED_P50_CEILING_MS = 67;

type Cost = {
  p50: number;
  p95: number;
  worst: number;
  dropped: number;
  frames: number;
};

async function frameCost(page: Page): Promise<Cost> {
  return page.evaluate(async (frames) => {
    const deltas: number[] = [];
    let last = await new Promise<number>((r) => requestAnimationFrame(r));
    for (let i = 0; i < frames; i++) {
      const now = await new Promise<number>((r) => requestAnimationFrame(r));
      deltas.push(now - last);
      last = now;
    }
    deltas.sort((a, b) => a - b);
    const at = (q: number) =>
      deltas[Math.min(deltas.length - 1, Math.floor(q * deltas.length))];
    return {
      p50: at(0.5),
      p95: at(0.95),
      worst: deltas[deltas.length - 1],
      dropped: deltas.filter((d) => d > 20).length,
      frames: deltas.length,
    };
  }, FRAMES);
}

async function scrubTo(page: Page, track: string, at: number) {
  await page.evaluate(
    ({ track, at }) => {
      document.documentElement.style.scrollBehavior = "auto";
      const el = document.querySelector(`[data-testid='${track}']`);
      if (!(el instanceof HTMLElement)) throw new Error(`no track ${track}`);
      window.scrollTo(0, el.offsetTop + (el.offsetHeight - window.innerHeight) * at);
    },
    { track, at },
  );
  await page.waitForTimeout(300);
}

/** The hold with the most marks on screen: the closing beat of each film. */
const FILMS = [
  {
    name: "when-rates-rise",
    path: "/stories/when-rates-rise/film",
    track: "rate-film",
    hold: RATE_HOLDS[RATE_HOLDS.length - 1],
  },
  {
    name: "where-should-the-cutoff-sit",
    path: "/stories/where-should-the-cutoff-sit/film",
    track: "cutoff-film",
    hold: CUTOFF_HOLDS[CUTOFF_HOLDS.length - 1],
  },
  {
    name: "why-dont-delays-die",
    path: "/stories/where-should-the-recovery-time-sit/film",
    track: "recovery-film",
    hold: RECOVERY_HOLDS[RECOVERY_HOLDS.length - 1],
  },
];

const report = (label: string, c: Cost) =>
  `${label}: p50 ${c.p50.toFixed(1)}ms p95 ${c.p95.toFixed(1)}ms ` +
  `worst ${c.worst.toFixed(1)}ms dropped ${c.dropped}/${c.frames}`;

for (const film of FILMS) {
  /**
   * Reduced motion sets `life: 0`, which short-circuits `markLife` and `cameraCreep`
   * while the host still repaints every frame over the same marks. That makes it an
   * A/B for the craft layer's own cost rather than the draw's.
   */
  for (const craft of [true, false]) {
    const label = craft ? "craft on" : "craft off (reduced motion)";

    test(`${film.name} frame budget, ${label}`, async ({ page, browserName }) => {
      test.skip(browserName !== "chromium", "CPU throttling needs CDP");

      if (!craft) await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(film.path);
      await expect(page.locator("[data-testid='film-stage'] canvas")).toBeVisible();
      await scrubTo(page, film.track, (film.hold.from + film.hold.to) / 2);

      const plain = await frameCost(page);

      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: PHONE_CPU });
      const throttled = await frameCost(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      await cdp.detach();

      console.log(`\n  ${film.name} beat ${film.hold.beat} hold — ${label}`);
      console.log(`    ${report("unthrottled", plain)}`);
      console.log(`    ${report(`${PHONE_CPU}x CPU throttle`, throttled)}`);

      expect(plain.p95, `unthrottled: ${report("", plain)}`).toBeLessThan(P95_BUDGET_MS);
      expect(
        throttled.p50,
        `${PHONE_CPU}x throttled: ${report("", throttled)}`,
      ).toBeLessThan(THROTTLED_P50_CEILING_MS);
    });
  }
}
