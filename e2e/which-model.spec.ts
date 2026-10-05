import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { recommendationCopy } from "../src/lib/model-choice/copy";
import { WHICH_MODEL_PACK } from "../src/lib/model-choice/pack";
import { retargetWeight, scoreWorkload } from "../src/lib/model-choice/score";
import { WORKLOADS, workloadById } from "../src/lib/model-choice/workloads";

const pack = WHICH_MODEL_PACK;
const opening = scoreWorkload(pack.models, WORKLOADS[0], WORKLOADS[0].weights);
const reasoningJob = workloadById("reasoning");
const reasoning = scoreWorkload(pack.models, reasoningJob, reasoningJob.weights);
const qualityWeights = retargetWeight(reasoningJob.weights, "quality", 100);
const quality = scoreWorkload(pack.models, reasoningJob, qualityWeights);
const reasoningCopy = recommendationCopy(reasoning);

test.describe("which model one-pager", () => {
  test("the recommendation follows the job, then the quality weight", async ({ page }) => {
    await page.goto("/desk/which-model");
    const name = page.getByTestId("recommendation-name");
    await expect(page.getByRole("heading", { name: "Which model?" })).toBeVisible();
    await expect(name).toHaveText(opening.winner?.model.name ?? "No model fits");

    await page.getByRole("button", { name: "Reasoning" }).click();
    await expect(name).toHaveText(reasoning.winner?.model.name ?? "No model fits");
    const leaderLine = reasoningCopy.comparisons.find((line) => line.includes("leads the"));
    if (leaderLine) await expect(page.getByText(leaderLine)).toBeVisible();

    await page.getByRole("slider", { name: "Quality" }).fill("100");
    await expect(name).toHaveText(quality.winner?.model.name ?? "No model fits");
  });

  test("the flagship index does not list the one-pager", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a[href="/stories/which-model"]')).toHaveCount(0);
    await expect(page.locator('a[href="/desk/which-model"]')).toHaveCount(0);
    const response = await page.goto("/stories/which-model");
    expect(response?.status()).toBe(404);
  });

  test("has no serious axe violations", async ({ page }) => {
    await page.goto("/desk/which-model");
    await expect(page.getByTestId("recommendation-name")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});
