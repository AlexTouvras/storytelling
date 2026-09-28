import { test, expect, type Page } from "@playwright/test";

const FILM = "/stories/how-much-fast-reserve/film";
const METHOD = "/stories/how-much-fast-reserve/method";

async function scrubTo(page: Page, at: number) {
  await page.evaluate((at) => {
    document.documentElement.style.scrollBehavior = "auto";
    const el = document.querySelector("[data-testid='grid-film']");
    if (!(el instanceof HTMLElement)) throw new Error("no grid-film track");
    const total = el.offsetHeight - window.innerHeight;
    window.scrollTo(0, el.offsetTop + total * at);
  }, at);
  await page.waitForTimeout(250);
}

test.describe("when the spinning stops film", () => {
  test("landing does not list the grid story before sign-off", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Stories" })).toBeVisible();
    await expect(page.getByRole("link", { name: /spinning stops/i })).toHaveCount(0);
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
    await scrubTo(page, 0.3);
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
    await scrubTo(page, 0.08);
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
    await scrubTo(page, 0.67);
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
