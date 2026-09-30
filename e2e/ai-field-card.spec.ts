import { test, expect, type Page } from "@playwright/test";
import { FIELD_CARDS, fieldCard } from "../src/illustrations/field-cards";

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

test("the bubble follows the section in view, and the cursor when there is one", async ({ page }, testInfo) => {
  const problems = watchConsole(page);
  const card = fieldCard("ai");
  const line = (heading: string) => card.sections.find((section) => section.heading === heading)!.line;
  await page.goto("/stories/ai-card");
  const frame = page.frameLocator('[data-testid="field-card-frame"]');
  const anti = frame.locator("section.antis");
  await expect(anti).toBeVisible({ timeout: 20000 });
  await anti.evaluate((el) => {
    const node = el as HTMLElement;
    document.documentElement.style.scrollBehavior = "auto";
    const band = window.innerHeight * 0.38;
    const top = node.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.max(0, top - band + 48));
  });
  await expect(page.getByTestId("robot-section-line")).toHaveText(line("Anti-patterns"));

  if (testInfo.project.name !== "chromium") {
    expect(problems).toEqual([]);
    return;
  }

  const always = frame.getByRole("heading", { name: "Always on" });
  const alwaysBox = await always.boundingBox();
  expect(alwaysBox).toBeTruthy();
  await page.mouse.move(alwaysBox!.x + 12, alwaysBox!.y + alwaysBox!.height / 2);
  await expect(page.getByTestId("robot-section-line")).toHaveText(line("Always on"));

  const antiHeading = frame.getByRole("heading", { name: "Anti-patterns" });
  const antiBox = await antiHeading.boundingBox();
  expect(antiBox).toBeTruthy();
  await page.mouse.move(antiBox!.x + 12, antiBox!.y + antiBox!.height / 2);
  await expect(page.getByTestId("robot-section-line")).toHaveText(line("Anti-patterns"));
  expect(problems).toEqual([]);
});
