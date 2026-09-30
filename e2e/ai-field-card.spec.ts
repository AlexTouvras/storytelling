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
  const problem = frame.locator("section", { has: frame.getByRole("heading", { name: "Problem → use → example" }) });
  await expect(problem).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("robot-section-line")).toHaveText(line("Agentic AI is a loop, not a menu"));

  // No pointer yet, so both layouts follow the reading band. The table is long
  // enough to reach that band; the short sections at the bottom of a desktop
  // window are not, because the page runs out of room.
  await problem.evaluate((el) => {
    const node = el as HTMLElement;
    const band = window.innerHeight * 0.38;
    const top = node.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.max(0, top - band + 80), left: 0, behavior: "instant" });
  });
  await expect(page.getByTestId("robot-section-line")).toHaveText(line("Problem → use → example"));

  if (testInfo.project.name === "chromium") {
    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();
    const x = viewport!.width / 2;
    const band = viewport!.height * 0.38;
    // Above the section that holds the band: the cursor, not the scroll, decides.
    await page.mouse.move(x, band - 140);
    await expect(page.getByTestId("robot-section-line")).toHaveText(line("Agentic AI is a loop, not a menu"));
    await page.mouse.move(x, band + 40);
    await expect(page.getByTestId("robot-section-line")).toHaveText(line("Problem → use → example"));
  }

  expect(problems).toEqual([]);
});
