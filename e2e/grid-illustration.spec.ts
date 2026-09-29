import { test, expect } from "@playwright/test";

const KNOWN = [/software WebGL/i, /GroupMarkerNotSet/i, /React DevTools/i];

test("grid.riv loads and plays each variant of the trip", async ({ page }) => {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(e.message));
  page.on("console", (m) => {
    if ((m.type() === "error" || m.type() === "warning") && !KNOWN.some((re) => re.test(m.text()))) {
      problems.push(`${m.type()}: ${m.text()}`);
    }
  });

  await page.goto("/lab/grid");
  const states = page.getByTestId("rive-states");
  await expect(page.getByTestId("rive-status")).toHaveText("ready");
  await expect(page.getByTestId("rive-grid").locator("canvas")).toBeVisible();
  await expect(states).toContainText("steady");
  await expect(states).toContainText("heavy");

  await page.getByTestId("fire-trip").click();
  await expect(states).toContainText("trip heavy");
  await expect(states).toContainText("held heavy", { timeout: 8000 });

  await page.getByTestId("toggle-light").click();
  await page.getByTestId("toggle-reserve").click();
  await page.getByTestId("reset").click();
  await expect(states).toContainText("steady");
  await expect(states).toContainText("reserve on");
  await page.getByTestId("fire-trip").click();
  await expect(states).toContainText("trip lightReserve");
  await expect(states).toContainText("held lightReserve", { timeout: 8000 });

  await page.getByTestId("reset").click();
  await expect(states).toContainText("steady");
  await page.getByTestId("set-tripped").click();
  await expect(states).toContainText("held lightReserve");
  expect(problems).toEqual([]);
});
