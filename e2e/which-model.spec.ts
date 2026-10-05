import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("which model one-pager", () => {
  test("the recommendation follows the job, then the quality weight", async ({ page }) => {
    await page.goto("/stories/which-model");
    const name = page.getByTestId("recommendation-name");
    await expect(page.getByRole("heading", { name: "Which model?" })).toBeVisible();
    await expect(name).toHaveText("GLM 5.3 Flash");

    await page.getByRole("button", { name: "Reasoning" }).click();
    await expect(name).toHaveText("Claude Sonnet 5.5");
    await expect(page.getByText(/Claude Opus 5.5 leads the intelligence index/)).toBeVisible();

    await page.getByRole("slider", { name: "Quality" }).fill("100");
    await expect(name).toHaveText("Claude Opus 5.5");
  });

  test("the flagship index does not list the one-pager", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a[href="/stories/which-model"]')).toHaveCount(0);
  });

  test("has no serious axe violations", async ({ page }) => {
    await page.goto("/stories/which-model");
    await expect(page.getByTestId("recommendation-name")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});
