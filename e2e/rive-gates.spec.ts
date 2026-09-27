import { test, expect, type Page } from "@playwright/test";

/** Console noise the Rive runtime prints on every load; anything else is a failure. */
const KNOWN = [/deprecated/i, /software WebGL/i, /GroupMarkerNotSet/i, /React DevTools/i];

function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(e.message));
  page.on("console", (m) => {
    if (m.type() !== "error" && m.type() !== "warning") return;
    if (KNOWN.some((re) => re.test(m.text()))) return;
    problems.push(`${m.type()}: ${m.text()}`);
  });
  return problems;
}

/** Counts requestAnimationFrame registrations, so a leaked render loop shows up. */
async function countFrames(page: Page, ms: number): Promise<number> {
  return page.evaluate(
    (ms) =>
      new Promise<number>((resolve) => {
        const w = window as unknown as { __rafCount: number };
        const start = w.__rafCount;
        setTimeout(() => resolve(w.__rafCount - start), ms);
      }),
    ms,
  );
}

test.describe("gate 1: a Rive illustration in the app", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __rafCount: number };
      w.__rafCount = 0;
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => {
        w.__rafCount++;
        return raf(cb);
      };
    });
  });

  test("renders the generated .riv beside the data canvas and drives its state machine", async ({ page }) => {
    const problems = watchConsole(page);
    await page.goto("/lab/rive");
    await expect(page.getByTestId("rive-status")).toHaveText("ready");
    await expect(page.getByTestId("loan-field").first()).toBeVisible();
    await expect(page.getByTestId("rive-household").locator("canvas")).toBeVisible();
    await expect(page.getByTestId("rive-states")).toContainText("calm");

    await page.getByTestId("fire-shock").click();
    await expect(page.getByTestId("rive-states")).toContainText(/shock|strained/);
    await expect(page.getByTestId("rive-states")).toContainText("strained", { timeout: 5000 });

    await page.getByTestId("reset").click();
    await expect(page.getByTestId("rive-states")).toContainText("calm");

    await page.getByTestId("set-constrained").click();
    await expect(page.getByTestId("rive-states")).toContainText("strained");
    expect(problems).toEqual([]);
  });

  test("unmounting frees the runtime: no render loop left behind, no context exhaustion", async ({ page }) => {
    const problems = watchConsole(page);
    await page.goto("/lab/rive");
    await expect(page.getByTestId("rive-status")).toHaveText("ready");
    const mounted = await countFrames(page, 1000);

    await page.getByTestId("toggle-mount").click();
    await expect(page.getByTestId("rive-status")).toHaveText("unmounted");
    await expect(page.getByTestId("rive-household")).toHaveCount(0);
    await page.waitForTimeout(300);
    const idle = await countFrames(page, 1000);
    expect(idle).toBeLessThan(mounted);

    // More cycles than Chrome's live WebGL context limit (16).
    for (let i = 0; i < 18; i++) {
      await page.getByTestId("toggle-mount").click();
      await expect(page.getByTestId("rive-status")).toHaveText("ready");
      await page.getByTestId("toggle-mount").click();
      await expect(page.getByTestId("rive-status")).toHaveText("unmounted");
    }
    await page.waitForTimeout(300);
    const after = await countFrames(page, 1000);
    expect(after).toBeLessThanOrEqual(idle + 5);
    expect(problems).toEqual([]);
  });
});

type Probe = {
  entity: { id: string; representation: string; highlighted: boolean };
  data: { x: number; y: number; width: number; height: number } | null;
  ill: { x: number; y: number; width: number; height: number } | null;
  camera: { x: number; y: number; zoom: number };
  trigger: string;
  fires: number;
  resets: number;
  states: string[];
  progress: number;
  beat: string | undefined;
  viewport: { width: number; height: number };
};

async function scrollTo(page: Page, p: number) {
  await page.evaluate(async (p) => {
    const el = document.querySelector("[data-testid='transition-track']");
    if (!(el instanceof HTMLElement)) throw new Error("no track");
    const total = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.offsetTop + total * p, behavior: "instant" });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, p);
}

/** Scroll there in steps, the way a reader arrives. */
async function walkTo(page: Page, from: number, to: number, steps = 8) {
  for (let i = 1; i <= steps; i++) await scrollTo(page, from + ((to - from) * i) / steps);
}

async function probe(page: Page): Promise<Probe> {
  return page.evaluate(() => {
    const t = window.__transition;
    if (!t) throw new Error("no transition probe");
    const stage = document.querySelector<HTMLElement>("[data-testid='transition-stage']");
    const entity = t.entity();
    return {
      entity: {
        id: entity?.id ?? "",
        representation: entity?.representation ?? "",
        highlighted: !!entity?.highlighted,
      },
      data: t.dataAnchor(),
      ill: t.illustrationAnchor(),
      camera: t.camera(),
      trigger: t.trigger(),
      fires: t.fires(),
      resets: t.resets(),
      states: t.riveStates(),
      progress: t.progress(),
      beat: stage?.dataset.beat,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });
}

async function openLab(page: Page) {
  await page.goto("/lab/transition");
  await expect.poll(() => page.evaluate(() => !!window.__transition)).toBe(true);
  await expect.poll(async () => (await probe(page)).states.length).toBeGreaterThan(0);
}

test.describe("gate 2: data → illustration → data", () => {
  test("focuses on the loan, opens the household on it, and closes it back into the same mark", async ({ page }) => {
    const problems = watchConsole(page);
    await openLab(page);

    const wide = await probe(page);
    expect(wide.camera.zoom).toBeCloseTo(1, 1);
    expect(wide.entity).toEqual({ id: expect.stringMatching(/^loan-\d+$/), representation: "data-point", highlighted: true });
    const id = wide.entity.id;

    await walkTo(page, 0, 0.3);
    const focused = await probe(page);
    const wideScreen = focused.viewport.width >= 768;
    expect(focused.camera.zoom).toBeGreaterThan(wideScreen ? 2.4 : 2);
    // The camera holds the loan where the layout keeps room for it.
    const target = wideScreen
      ? { x: focused.viewport.width * 0.66, y: focused.viewport.height * 0.5 }
      : { x: focused.viewport.width * 0.5, y: focused.viewport.height * 0.64 };
    expect(Math.abs(focused.data!.x - target.x)).toBeLessThan(focused.viewport.width * 0.05);
    expect(Math.abs(focused.data!.y - target.y)).toBeLessThan(focused.viewport.height * 0.05);

    // The illustration's ring starts exactly on the data mark.
    for (const p of [0.3, 0.33, 0.36, 0.4]) {
      await scrollTo(page, p);
      const s = await probe(page);
      expect(Math.abs(s.data!.x - s.ill!.x)).toBeLessThan(2);
      expect(Math.abs(s.data!.y - s.ill!.y)).toBeLessThan(2);
      if (p === 0.3) expect(Math.abs(s.data!.width - s.ill!.width)).toBeLessThan(2);
    }
    const open = await probe(page);
    expect(open.entity).toMatchObject({ id, representation: "illustration", highlighted: true });
    expect(open.ill!.width).toBeGreaterThan(open.data!.width * 5);

    await walkTo(page, 0.4, 0.55);
    await expect.poll(async () => (await probe(page)).fires).toBe(1);
    await expect.poll(async () => (await probe(page)).states.join(",")).toMatch(/shock|strained/);

    await walkTo(page, 0.55, 0.76);
    const closed = await probe(page);
    expect(closed.entity).toMatchObject({ id, representation: "data-point", highlighted: true });
    expect(Math.abs(closed.data!.x - closed.ill!.x)).toBeLessThan(2);
    expect(Math.abs(closed.data!.width - closed.ill!.width)).toBeLessThan(2);

    await walkTo(page, 0.76, 1);
    const back = await probe(page);
    expect(back.camera.zoom).toBeCloseTo(1, 1);
    expect(back.beat).toBe("5");
    expect(back.entity.id).toBe(id);
    expect(back.fires).toBe(1);
    expect(problems).toEqual([]);
  });

  test("reverses cleanly and never stacks the shock under rapid scrubbing", async ({ page }) => {
    const problems = watchConsole(page);
    await openLab(page);
    await walkTo(page, 0, 0.55);
    await expect.poll(async () => (await probe(page)).fires).toBe(1);

    // Back past the cue: the household returns to calm.
    await walkTo(page, 0.55, 0.3);
    let s = await probe(page);
    expect(s.trigger).toBe("armed");
    expect(s.resets).toBe(1);
    await walkTo(page, 0.3, 0.42);
    await expect.poll(async () => (await probe(page)).states.join(",")).toMatch(/calm/);

    // Scrubbing inside the played region does not replay it.
    await walkTo(page, 0.42, 0.55);
    for (let i = 0; i < 10; i++) await scrollTo(page, i % 2 ? 0.5 : 0.9);
    s = await probe(page);
    expect(s.fires).toBe(2);

    // Hammering across the cue: every fire is paired with a reset.
    for (let i = 0; i < 24; i++) await scrollTo(page, i % 2 ? 0.52 : 0.36);
    s = await probe(page);
    expect(s.fires - s.resets).toBeGreaterThanOrEqual(0);
    expect(s.fires - s.resets).toBeLessThanOrEqual(1);
    expect(s.states.length).toBeLessThanOrEqual(2);
    expect(problems).toEqual([]);
  });

  test("reduced motion cuts to each framing and settles the household instead of animating it", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const problems = watchConsole(page);
    await openLab(page);
    await scrollTo(page, 0.55);
    await expect.poll(async () => (await probe(page)).trigger).toBe("settled");
    const s = await probe(page);
    expect(s.fires).toBe(0);
    expect(s.camera.zoom).toBeCloseTo(s.viewport.width >= 768 ? 2.6 : 2.2, 5);
    expect(s.entity.representation).toBe("illustration");
    await expect.poll(async () => (await probe(page)).states.join(",")).toMatch(/strained/);

    await scrollTo(page, 0.3);
    await expect.poll(async () => (await probe(page)).trigger).toBe("armed");
    await expect(page.getByTestId("transition-copy")).toBeVisible();
    expect(problems).toEqual([]);
  });
});
