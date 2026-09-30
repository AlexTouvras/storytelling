import { test, expect, type FrameLocator, type Page } from "@playwright/test";
import { speechLine, type SectionReport } from "../src/components/director/card-frame";
import { FIELD_CARDS, fieldCard, type FieldCard } from "../src/illustrations/field-cards";

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

test("scrolling through rows of one section keeps that section's line", async ({ page }, testInfo) => {
  const problems = watchConsole(page);
  const card = fieldCard("ai");
  const line = (heading: string) => card.sections.find((section) => section.heading === heading)!.line;
  const problem = line("Problem → use → example");
  await page.goto("/stories/ai-card");
  const frame = page.frameLocator('[data-testid="field-card-frame"]');
  const mcp = frame.locator("tr", { hasText: "Need live reads" });
  await expect(mcp).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("robot-section-line")).toHaveText(line("Agentic AI is a loop, not a menu"));

  await mcp.evaluate((el) => {
    const node = el as HTMLElement;
    const band = window.innerHeight * 0.38;
    const box = node.getBoundingClientRect();
    const center = box.top + box.height / 2 + window.scrollY;
    window.scrollTo({ top: Math.max(0, center - band), left: 0, behavior: "instant" });
  });
  await expectBubble(page, frame, card);
  await expect(page.getByTestId("robot-section-line")).toHaveText(problem);

  if (testInfo.project.name === "chromium") {
    const rag = frame.locator("tr", { hasText: "Answers ignore our docs" });
    const box = await rag.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + 48, box!.y + box!.height / 2);
    await expect(page.getByTestId("robot-section-line")).toHaveText(problem);
  }

  expect(problems).toEqual([]);
});

test("scrolling changes the bubble when the pointer sits in the margin", async ({ page }, testInfo) => {
  const problems = watchConsole(page);
  const card = fieldCard("ai");
  const line = (heading: string) => card.sections.find((section) => section.heading === heading)!.line;
  await page.goto("/stories/ai-card");
  const frame = page.frameLocator('[data-testid="field-card-frame"]');
  const problem = frame.locator("section", { has: frame.getByRole("heading", { name: "Problem → use → example" }) });
  await expect(problem).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("robot-section-line")).toHaveText(line("Agentic AI is a loop, not a menu"));

  const viewport = page.viewportSize();
  expect(viewport).toBeTruthy();
  const pointer = { x: viewport!.width - 6, y: 520 };
  await page.mouse.move(pointer.x, pointer.y);
  if (testInfo.project.name === "chromium") {
    await expect(page.getByTestId("robot-section-line")).not.toHaveText(line("Agentic AI is a loop, not a menu"));
  }

  const rules = frame.locator("section", { has: frame.getByRole("heading", { name: "Rules vs skills" }) });
  await rules.evaluate((el) => {
    const node = el as HTMLElement;
    const band = window.innerHeight * 0.38;
    const top = node.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.max(0, top - band + 48), left: 0, behavior: "instant" });
  });
  const samples = await frame.locator("body").evaluate(({ x, y }) => {
    const headingAt = (px: number, py: number) => {
      const nodes = [...document.querySelectorAll("header.hero, section")];
      let best = "";
      let bestScore = -Infinity;
      for (const node of nodes) {
        const box = node.getBoundingClientRect();
        if (py < box.top || py > box.bottom || box.height < 1) continue;
        const containsX = px >= box.left && px <= box.right;
        const dist = containsX ? 0 : Math.min(Math.abs(px - box.left), Math.abs(px - box.right));
        const score = (containsX ? 1e9 : 0) - dist;
        if (score > bestScore) {
          bestScore = score;
          const heading = node.querySelector("h1, h2");
          best = heading ? (heading.textContent ?? "").replace(/\s+/g, " ").trim() : "";
        }
      }
      return best;
    };
    return {
      band: headingAt(window.innerWidth / 2, window.innerHeight * 0.38),
      pointer: headingAt(x, y),
    };
  }, pointer);
  expect(samples.band).toBeTruthy();
  if (testInfo.project.name === "chromium") expect(samples.pointer).not.toBe(samples.band);
  await expectBubble(page, frame, card);
  await expect(page.getByTestId("robot-section-line")).not.toHaveText(line("Agentic AI is a loop, not a menu"));
  expect(problems).toEqual([]);
});

test("a wheel on the robot scrolls the sheet and the bubble follows", async ({ page }, testInfo) => {
  testInfo.skip(testInfo.project.name !== "chromium", "The hit target sits under a fine pointer.");
  const problems = watchConsole(page);
  const card = fieldCard("ai");
  const line = (heading: string) => card.sections.find((section) => section.heading === heading)!.line;
  await page.goto("/stories/ai-card");
  const frame = page.frameLocator('[data-testid="field-card-frame"]');
  await expect(frame.locator("h1").first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("robot-presence")).toHaveText("present", { timeout: 5000 });
  await expect(page.getByTestId("robot-section-line")).toHaveText(line("Agentic AI is a loop, not a menu"));
  const box = await page.getByTestId("robot-hit").boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.wheel(0, 480);
  await expect
    .poll(() => frame.locator("body").evaluate(() => Math.round(window.scrollY)))
    .toBeGreaterThan(200);
  await expectBubble(page, frame, card);
  await expect(page.getByTestId("robot-section-line")).not.toHaveText(line("Agentic AI is a loop, not a menu"));
  expect(problems).toEqual([]);
});

async function expectBubble(page: Page, frame: FrameLocator, card: FieldCard, x?: number) {
  const report = await frame.locator("body").evaluate((body, x) => {
    const y = window.innerHeight * 0.38;
    const px = typeof x === "number" ? x : window.innerWidth / 2;
    const clip = (value: string | null) => (value ?? "").replace(/\s+/g, " ").trim();
    const nodes = [...document.querySelectorAll("header.hero, section")];
    let heading = "";
    let bestScore = -Infinity;
    for (const node of nodes) {
      const box = node.getBoundingClientRect();
      if (y < box.top || y > box.bottom || box.height < 1) continue;
      const containsX = px >= box.left && px <= box.right;
      const dist = containsX ? 0 : Math.min(Math.abs(px - box.left), Math.abs(px - box.right));
      const score = (containsX ? 1e9 : 0) - dist;
      if (score > bestScore) {
        bestScore = score;
        heading = clip(node.querySelector("h1, h2")?.textContent ?? "");
      }
    }
    return { heading };
  }, x ?? null);
  const expected = speechLine(card, report as SectionReport);
  expect(expected).toBeTruthy();
  await expect(page.getByTestId("robot-section-line")).toHaveText(expected!);
}
