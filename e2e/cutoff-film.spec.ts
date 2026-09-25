import { test, expect } from "@playwright/test";

test.describe("where should the cut-off sit film", () => {
  test("landing lists the cut-off story to its film", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Where Should the Cut-Off Sit?" }),
    ).toHaveAttribute("href", "/stories/where-should-the-cutoff-sit/film");
  });

  test("scrubs from the question to the operating gate", async ({ page }) => {
    await page.goto("/stories/where-should-the-cutoff-sit/film");
    await expect(page.getByTestId("film-prologue")).toContainText(/cut-off|gate|Gini/i);
    await expect(page.getByTestId("film-title")).toContainText(
      /where should the cut-off sit/i,
    );
    await expect(page.getByTestId("app-field").first()).toBeVisible();
    await expect(page.getByTestId("film-stage")).toHaveAttribute("data-beat", "0");

    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      const el = document.querySelector("[data-testid='cutoff-film']");
      if (!(el instanceof HTMLElement)) return;
      const total = el.offsetHeight - window.innerHeight;
      window.scrollTo(0, el.offsetTop + total * 0.96);
    });

    await expect(page.getByTestId("film-stage")).toHaveAttribute("data-beat", "7");
    await expect(page.getByTestId("hero-figure")).toContainText("74.4%");
    await expect(page.getByTestId("beat-copy")).toContainText(/Train Gini|PSI|OOT/i);
  });

  test("instrument moves the live cloud gate", async ({ page }) => {
    await page.goto("/stories/where-should-the-cutoff-sit/film");
    const gate = page.getByTestId("instrument-gate");
    await expect(gate).toHaveText("7.5%");
    await expect(page.getByTestId("cutoff-horizon")).toBeVisible();
    await expect(page.getByTestId("horizon-readout")).toContainText(/7\.5%/);
    await expect(page.getByTestId("horizon-readout")).toContainText(/OOT bad/i);

    await page.getByTestId("cutoff-slider").fill("0.15");
    await expect(gate).toHaveText("15.0%");
    // Top cards and chart readout share the same OOT frontier (~5.8% bad).
    await expect(page.getByTestId("instrument-bad")).toHaveText(/5\.[78]%/);
    await expect(page.getByTestId("horizon-readout")).toContainText(/15\.0%/);
    await expect(page.getByTestId("horizon-readout")).toContainText(/5\.[78]%/);
  });

  test("decision section states the operating cut", async ({ page }) => {
    await page.goto("/stories/where-should-the-cutoff-sit/film");
    await expect(page.getByTestId("the-cut")).toContainText(/PD ≤ 7\.5%/i);
    await expect(page.getByTestId("cutoff-evidence")).toContainText(/55\.3%/);
  });
});
