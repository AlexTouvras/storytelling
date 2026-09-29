import { test, expect, type Page } from "@playwright/test";

/** Console noise headless Chromium prints on every load; anything else, a Rive deprecation included, is a failure. */
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

async function open(page: Page) {
  await page.goto("/lab/robot");
  await expect(page.getByTestId("rive-status")).toHaveText("ready");
  await expect(page.getByTestId("rive-robot").locator("canvas")).toBeVisible();
  await expect(page.getByTestId("rive-states")).toHaveText("idle");
  await expect(page.getByTestId("robot-presence")).toHaveText("present", { timeout: 3000 });
}

/** A control below the card scrolls the canvas off a phone, and the runtime stops advancing while it is offscreen. */
async function poke(page: Page) {
  await page.getByTestId("poke").click();
  await page.getByTestId("rive-robot").scrollIntoViewIfNeeded();
}

test("the robot is driven by its view model and reports what it shows", async ({ page }) => {
  const problems = watchConsole(page);
  await open(page);
  for (const mode of ["thinking", "speaking", "happy", "idle"]) {
    await page.getByTestId(`mode-${mode}`).click();
    await expect(page.getByTestId("rive-states")).toHaveText(mode);
  }
  await poke(page);
  await expect(page.getByTestId("robot-reacting")).toHaveText("true");
  await expect(page.getByTestId("robot-reacting")).toHaveText("false", { timeout: 4000 });
  await expect(page.getByTestId("robot-presence")).toHaveText("parked");
  await poke(page);
  await expect(page.getByTestId("robot-presence")).toHaveText("present", { timeout: 3000 });

  await page.getByTestId("mode-speaking").click();
  await page.getByTestId("reset").click();
  await expect(page.getByTestId("rive-states")).toHaveText("idle");
  expect(problems).toEqual([]);
});

test("the robot answers the pointer with its own listeners", async ({ page, isMobile }) => {
  test.skip(isMobile, "hover needs a mouse");
  const problems = watchConsole(page);
  await open(page);
  const box = (await page.getByTestId("rive-robot").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.55);
  await expect(page.getByTestId("robot-hover")).toHaveText("true");
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.getByTestId("robot-reacting")).toHaveText("true");
  await page.mouse.move(box.x + box.width + 40, box.y - 40);
  await expect(page.getByTestId("robot-hover")).toHaveText("false");
  await expect(page.getByTestId("robot-presence")).toHaveText("parked", { timeout: 3000 });
  await page.mouse.click(box.x + box.width * 0.88, box.y + box.height * 0.76);
  await expect(page.getByTestId("robot-presence")).toHaveText("present", { timeout: 3000 });
  expect(problems).toEqual([]);
});

test("a tap on the robot makes it hop", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch only");
  const problems = watchConsole(page);
  await open(page);
  const box = (await page.getByTestId("rive-robot").boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.55);
  await expect(page.getByTestId("robot-reacting")).toHaveText("true");
  await expect(page.getByTestId("robot-presence")).toHaveText("parked", { timeout: 3000 });
  await page.touchscreen.tap(box.x + box.width * 0.88, box.y + box.height * 0.76);
  await expect(page.getByTestId("robot-presence")).toHaveText("present", { timeout: 3000 });
  expect(problems).toEqual([]);
});

test("under reduced motion the robot holds still but still takes a change", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const problems = watchConsole(page);
  await open(page);
  await expect(page.getByTestId("robot-motion")).toContainText("reduced");
  await expect(page.getByTestId("robot-presence")).toHaveText("present");
  await page.getByTestId("mode-happy").click();
  await expect(page.getByTestId("rive-states")).toHaveText("happy");
  expect(problems).toEqual([]);
});
