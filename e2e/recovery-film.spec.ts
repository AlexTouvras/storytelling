import { test, expect, type Page } from "@playwright/test";

async function scrubTo(page: Page, at: number) {
  await page.evaluate((at) => {
    document.documentElement.style.scrollBehavior = "auto";
    const el = document.querySelector("[data-testid='recovery-film']");
    if (!(el instanceof HTMLElement)) throw new Error("no recovery-film track");
    const total = el.offsetHeight - window.innerHeight;
    window.scrollTo(0, el.offsetTop + total * at);
  }, at);
  await page.waitForTimeout(200);
}

test.describe("why don't delays die film", () => {
  test("opens on the reader's question, not the planner's", async ({ page }) => {
    await page.goto("/stories/where-should-the-recovery-time-sit/film");
    await expect(page.getByTestId("film-prologue")).toContainText(
      /recovery margin/i,
    );
    await expect(page.getByTestId("film-title")).toContainText(
      /why don.t delays die/i,
    );
    await expect(page.getByTestId("delay-field").first()).toBeVisible();
    await expect(page.getByTestId("film-stage")).toHaveAttribute("data-beat", "0");
    // The decision is held back to the close.
    await expect(page.getByTestId("film-title")).not.toContainText(
      /recovery time sit/i,
    );
  });

  test("the year panel is the whole of its beat", async ({ page }) => {
    await page.goto("/stories/where-should-the-recovery-time-sit/film");
    await expect(page.getByTestId("season-panel")).toBeHidden();

    await scrubTo(page, 0.535);
    await expect(page.getByTestId("film-stage")).toHaveAttribute("data-beat", "6");
    const panel = page.getByTestId("season-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(/carry-over stays 75%–85% all year/i);
    await expect(page.getByTestId("beat-caveat")).toContainText(/no weather/i);
  });

  test("the picker refits the line without ranking it", async ({ page }) => {
    await page.goto("/stories/where-should-the-recovery-time-sit/film");
    await scrubTo(page, 0.71);
    await expect(page.getByTestId("film-stage")).toHaveAttribute("data-beat", "8");

    const picker = page.getByTestId("line-picker");
    await expect(picker).toBeVisible();
    const focus = picker.getByRole("button", { pressed: true });
    await expect(focus).toHaveText(/Rovaniemi/);

    await scrubTo(page, 0.96);
    await expect(page.getByTestId("film-stage")).toHaveAttribute("data-beat", "10");
    await expect(page.getByTestId("hero-figure")).toHaveText("55.7%");

    await page.getByTestId("line-picker").getByText("Ring Rail Line").click();
    await expect(page.getByTestId("hero-figure")).toHaveText("81.5%");
  });

  test("the counterfactual is scrubbed in frozen steps and never called optimal", async ({
    page,
  }) => {
    await page.goto("/stories/where-should-the-recovery-time-sit/film");
    await scrubTo(page, 0.78);
    await expect(page.getByTestId("film-stage")).toHaveAttribute("data-beat", "9");
    await expect(page.getByTestId("beat-badge")).toHaveText("modelled");
    await expect(page.getByTestId("hero-figure")).toHaveText("74.6%");

    await scrubTo(page, 0.845);
    await expect(page.getByTestId("hero-figure")).toHaveText(/6\d\.\d%/);
    await expect(page.getByTestId("beat-copy")).not.toContainText(/optimal/i);
  });

  test("the decision names the commuter floor and the limits are on one panel", async ({
    page,
  }) => {
    await page.goto("/stories/where-should-the-recovery-time-sit/film");
    const decision = page.getByTestId("the-margin");
    await expect(decision).toContainText(/75%–81%/);
    await expect(decision).toContainText(/3 of 4/);

    await page.getByRole("group").getByText(/Method, limits and attribution/i).click();
    const panel = page.getByRole("group");
    await expect(panel).toContainText(/CC BY 4\.0/);
    await expect(panel).toContainText(/not endorsed by, Fintraffic/i);
    await expect(panel).toContainText(/5th-percentile proxy/i);
  });
});
