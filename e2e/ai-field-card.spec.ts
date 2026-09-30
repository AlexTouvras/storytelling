import { test, expect, type Page } from "@playwright/test";
import { FIELD_CARDS } from "../src/illustrations/field-cards";

const KNOWN = [/software WebGL/i, /GroupMarkerNotSet/i, /React DevTools/i];

function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(e.message));
  page.on("console", (m) => {
    if ((m.type() === "error" || m.type() === "warning") && !KNOWN.some((re) => re.test(m.text()))) {
      problems.push(`${m.type()}: ${m.text()}`);
    }
  });
  return problems;
}

for (const card of FIELD_CARDS) {
  for (const path of [`/stories/${card.route}`, `/lab/${card.route}`]) {
test(`the robot appears on the ${card.label} field card and tucks into the corner (${path})`, async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto(path);
  await expect(page.getByTestId("field-card-frame")).toBeVisible();
  await expect(page.getByTestId("rive-robot").locator("canvas")).toBeVisible();
  await expect(page.getByTestId("robot-presence")).toHaveText("present", { timeout: 5000 });
  await page.getByTestId("robot-hit").click();
  await expect(page.getByTestId("robot-presence")).toHaveText("parked", { timeout: 3000 });
  await expect(page.getByTestId("robot-hit")).toHaveAttribute("aria-label", "Bring the robot back");
  await page.getByTestId("robot-hit").click();
  await expect(page.getByTestId("robot-presence")).toHaveText("present", { timeout: 3000 });
  expect(problems).toEqual([]);
});
  }
}
