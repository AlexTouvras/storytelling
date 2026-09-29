import { test, expect, type Page } from "@playwright/test";

const FILM = "/stories/how-much-fast-reserve/film";
const METHOD = "/stories/how-much-fast-reserve/method";

async function scrollTrack(page: Page, at: number) {
  await page.evaluate((at) => {
    document.documentElement.style.scrollBehavior = "auto";
    const el = document.querySelector("[data-testid='grid-film']");
    if (!(el instanceof HTMLElement)) throw new Error("no grid-film track");
    const total = el.offsetHeight - window.innerHeight;
    window.scrollTo(0, el.offsetTop + total * at);
  }, at);
  await page.waitForTimeout(250);
}

/** Scroll to a moment on the film's own timeline, with the phone narration lowered. */
async function scrubTo(page: Page, film: number) {
  await page.waitForFunction(() => Boolean(window.__gridFilm));
  await scrollTrack(page, await page.evaluate((film) => window.__gridFilm!.trackAt(film), film));
}

/** Scroll to where a beat's narration is up to read. */
async function scrubToRead(page: Page, beat: number) {
  await page.waitForFunction(() => Boolean(window.__gridFilm));
  await scrollTrack(page, await page.evaluate((beat) => window.__gridFilm!.readAt(beat), beat));
}

test.describe("when the spinning stops film", () => {
  test("landing lists the grid story to its film", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "When the Spinning Stops" })).toHaveAttribute("href", FILM);
  });

  test("opens with the orientation card and a way into the method", async ({ page }) => {
    await page.goto(FILM);
    const card = page.getByTestId("orientation-card");
    await expect(card).toBeVisible();
    await expect(card).not.toContainText(/inertia|FFR|FCR/);
    await expect(card.getByTestId("method-link")).toHaveAttribute("href", METHOD);
  });

  test("a term opens its definition in place, in the beat that teaches it", async ({ page }) => {
    await page.goto(FILM);
    await scrubToRead(page, 1);
    await expect(page.getByTestId("film-stage")).toHaveAttribute("data-beat", "1");
    const trip = page.getByTestId("term-button").and(page.locator("[data-term='trip']"));
    await expect(trip).toHaveAttribute("aria-expanded", "false");
    await trip.click();
    await expect(trip).toHaveAttribute("aria-expanded", "true");
    const definition = page.locator(`#${await trip.getAttribute("aria-controls")}`);
    await expect(definition).toBeVisible();
    await trip.click();
    await expect(definition).toBeHidden();

    // Terms from other beats stay plain text here.
    await expect(page.locator("[data-testid='term-button'][data-term='fast-reserve']")).toHaveCount(0);
  });

  test("the terms drawer lists every term and closes on Escape", async ({ page }) => {
    await page.goto(FILM);
    await scrubToRead(page, 0);
    const toggle = page.getByTestId("terms-toggle");
    await toggle.click();
    const drawer = page.getByTestId("terms-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByTestId("drawer-term")).toHaveCount(9);
    await expect(drawer).toContainText(/still to come/i);
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test("each beat's label links to its entry on the method page", async ({ page }) => {
    await page.goto(FILM);
    await scrubToRead(page, 3);
    await expect(page.getByTestId("film-stage")).toHaveAttribute("data-beat", "3");
    const badge = page.getByTestId("beat-badge").first();
    await expect(badge).toHaveText(/modelled/i);
    await expect(badge).toHaveAttribute("href", `${METHOD}#kind-modelled`);
  });

  test("the machine resets into each run and its trip fires or settles", async ({ page }) => {
    await page.goto(FILM);
    const stage = page.getByTestId("film-stage");
    await scrubTo(page, 0.4);
    await scrubTo(page, 0.53);
    await expect(stage).toHaveAttribute("data-run", "typical");
    await expect(stage).toHaveAttribute("data-trigger", /played|settled/);

    await scrubTo(page, 0.7);
    await expect(stage).toHaveAttribute("data-run", "light");
    await expect(stage).toHaveAttribute("data-trigger", /played|settled/);

    await scrubTo(page, 0.78);
    await expect(stage).toHaveAttribute("data-run", "light-reserve");
    await expect(stage).toHaveAttribute("data-trigger", /played|settled/);

    // Scrubbing back before a run's cue re-arms it rather than replaying it.
    await scrubTo(page, 0.742);
    await expect(stage).toHaveAttribute("data-run", "light-reserve");
    await expect(stage).toHaveAttribute("data-trigger", "armed");
  });

  test("the pullback ends on the decision with its trend kind-labelled", async ({ page }) => {
    await page.goto(FILM);
    await scrubTo(page, 0.96);
    await expect(page.getByTestId("film-stage")).toHaveAttribute("data-beat", "4");
    await expect(page.getByTestId("hero-figure")).toHaveText("873");
    await expect(page.getByTestId("light-line")).toHaveAttribute("opacity", /^(0\.9|1)/);

    const decision = page.getByTestId("the-decision");
    await decision.scrollIntoViewIfNeeded();
    await expect(decision).toContainText(/Size fast reserve to the hour's spinning mass/i);
    await expect(decision.getByTestId("trend-table")).toContainText("584");
    await expect(decision.getByTestId("end-method-link")).toHaveAttribute("href", METHOD);
  });

  test("the trip falls in frame, with the floor already on screen", async ({ page }) => {
    await page.goto(FILM);
    const height = page.viewportSize()!.height;
    for (const at of [0.23, 0.27, 0.31, 0.34]) {
      await scrubTo(page, at);
      const path = await page.getByTestId("trace-path").boundingBox();
      expect(path!.y + path!.height, `trace at ${at}`).toBeLessThan(height);
    }
    await scrubTo(page, 0.24);
    const floor = await page.getByTestId("trace-floor").getAttribute("opacity");
    expect(Number(floor)).toBeGreaterThan(0.99);
    const [floorBox, path] = await Promise.all([
      page.getByTestId("trace-floor").boundingBox(),
      page.getByTestId("trace-path").boundingBox(),
    ]);
    expect(floorBox!.y + floorBox!.height).toBeLessThan(height);
    expect(path!.y + path!.height).toBeLessThan(floorBox!.y + floorBox!.height);
  });

  test("the pullback keeps the trip's hour on screen until it sits among the year", async ({ page }) => {
    await page.goto(FILM);
    const { width, height } = page.viewportSize()!;
    for (const at of [0.87, 0.88, 0.89, 0.9, 0.91, 0.93]) {
      await scrubTo(page, at);
      const ring = await page.locator("[data-testid='featured-hour'] circle").last().boundingBox();
      const cx = ring!.x + ring!.width / 2;
      const cy = ring!.y + ring!.height / 2;
      expect(cx, `hour x at ${at}`).toBeGreaterThan(0);
      expect(cx, `hour x at ${at}`).toBeLessThan(width - 8);
      expect(cy, `hour y at ${at}`).toBeLessThan(height);
    }
  });

  test("the method page shows labels, every event, the schema and a download", async ({ page, request }) => {
    await page.goto(METHOD);
    await expect(page.locator("#kind-modelled")).toBeVisible();
    await expect(page.getByTestId("schema-table")).toBeVisible();
    await expect(page.getByText(/1\.7×/).first()).toBeVisible();

    const res = await request.get(`${METHOD}/evidence.json`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/application\/json/);
    const pack = await res.json();
    expect(pack.id).toMatch(/how-much-fast-reserve/);
    expect(pack.years.months.length).toBeGreaterThan(0);
  });
});

test.describe("when the spinning stops film, on a small phone", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  const PICTURE = ["machine", "legend-caption", "model-chart", "trace-panel"];

  async function shown(page: Page) {
    return page.evaluate((ids) => {
      const card = document.querySelector("[data-testid='beat-copy']") as HTMLElement;
      const boxes = ids
        .map((id) => document.querySelector(`[data-testid='${id}']`) as HTMLElement | null)
        .filter((el): el is HTMLElement => {
          if (!el) return false;
          for (let node: HTMLElement | null = el; node; node = node.parentElement) {
            const cs = getComputedStyle(node);
            if (cs.visibility === "hidden" || Number(cs.opacity) < 0.05) return false;
          }
          return true;
        })
        .map((el) => ({ id: el.dataset.testid, bottom: el.getBoundingClientRect().bottom }));
      return { card: card.dataset.card, cardTop: card.getBoundingClientRect().top, height: window.innerHeight, boxes };
    }, PICTURE);
  }

  test("the subtitle stays at the bottom and the picture plays above it", async ({ page }) => {
    await page.goto(FILM);
    for (const beat of [1, 2, 3, 4]) {
      await scrubToRead(page, beat);
      const read = await shown(page);
      expect(read.card, `beat ${beat} read`).toBe("up");
      await expect(page.getByTestId("film-stage")).toHaveAttribute("data-beat", String(beat));
      await expect(page.getByTestId("beat-copy").locator("h2")).toBeInViewport({ ratio: 1 });
      await expect(page.getByTestId("subtitle-line")).toBeInViewport({ ratio: 1 });
      const line = await page.getByTestId("subtitle-line").innerText();
      expect(line.length, `beat ${beat} line`).toBeLessThanOrEqual(80);
    }
    for (const film of [0.3, 0.5, 0.57, 0.6, 0.62, 0.7, 0.8, 0.93]) {
      await scrubTo(page, film);
      await page.waitForTimeout(150);
      const play = await shown(page);
      expect(play.card, `card at ${film}`).toBe("up");
      expect(play.height - play.cardTop, `subtitle at ${film}`).toBeLessThanOrEqual(170);
      for (const box of play.boxes) expect(box.bottom, `${box.id} at ${film}`).toBeLessThanOrEqual(play.cardTop + 40);
    }
  });
});
