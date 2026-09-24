import { test, expect } from "@playwright/test";

test.describe("when rates rise film", () => {
  test("scrubs from the question to the sleeve", async ({ page }) => {
    await page.goto("/stories/when-rates-rise/film");
    await expect(page.getByTestId("film-title")).toContainText(
      /where do you cut/i,
    );
    await expect(page.getByTestId("loan-field").first()).toBeVisible();
    await expect(page.getByTestId("film-stage")).toHaveAttribute("data-beat", "0");

    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      const el = document.querySelector("[data-testid='rate-film']");
      if (!(el instanceof HTMLElement)) return;
      const total = el.offsetHeight - window.innerHeight;
      window.scrollTo(0, el.offsetTop + total * 0.95);
    });

    await expect(page.getByTestId("film-stage")).toHaveAttribute("data-beat", "6");
    await expect(page.getByTestId("hero-figure")).toContainText("21.0%");
  });

  test("slider recomputes the sleeve", async ({ page }) => {
    await page.goto("/stories/when-rates-rise/film");
    const sleeve = page.getByTestId("instrument-sleeve");
    await expect(sleeve).toHaveText("21.0%");

    await page.getByTestId("shock-slider").fill("0");
    await expect(sleeve).not.toHaveText("21.0%");

    await page.getByTestId("float-slider").fill("50");
    await page.getByTestId("shock-slider").fill("300");
    await expect(sleeve).toHaveText("28.8%");
  });
});
