import { test, expect, type Page } from "@playwright/test";
import { loadLecture } from "../src/lectures/load";
import { buildLectureTimeline } from "../src/components/lecture/lecture-frame";

const LECTURE = "/lab/lectures/agentic-ai";

const lecture = loadLecture("agentic-ai");
if (!lecture) throw new Error("agentic-ai lecture failed to load");
const { manifest } = lecture;
const timeline = buildLectureTimeline(manifest);

async function scrubTo(page: Page, at: number) {
  await page.evaluate((at) => {
    document.documentElement.style.scrollBehavior = "auto";
    const el = document.querySelector("[data-testid='lecture-track']");
    if (!(el instanceof HTMLElement)) throw new Error("no lecture track");
    const total = el.offsetHeight - window.innerHeight;
    window.scrollTo(0, el.offsetTop + total * at);
  }, at);
  await page.waitForTimeout(250);
}

test.describe("field card lecture", () => {
  test("scrolls through every exhibit, in order", async ({ page }) => {
    await page.goto(LECTURE);
    await expect(page.getByTestId("lecture-board")).toBeVisible();
    await expect(page.getByTestId("lecture-title")).toBeVisible();

    const order = [...manifest.beats].sort((a, b) => a.beat - b.beat);
    for (const [index, beat] of order.entries()) {
      await scrubTo(page, timeline.beatStarts[beat.beat] + 0.01);
      await expect(page.getByTestId("film-stage")).toHaveAttribute(
        "data-beat",
        String(beat.beat),
      );
      // An action title above the exhibit, a captioned exhibit, and a so-what.
      await expect(page.getByTestId("beat-title")).toHaveText(beat.title);
      await expect(page.getByTestId("beat-copy")).toContainText(beat.takeaway);
      const slide = page.getByTestId("lecture-slide");
      await expect(slide).toContainText(beat.exhibit);
      await expect(slide).toContainText(`Exhibit ${index + 1}`);
      // The source line names the card rows this slide is allowed to teach.
      await expect(slide).toContainText(beat.cardRefs[0]);
    }
  });

  test("prints the card's own list rather than drawing it", async ({ page }) => {
    await page.goto(LECTURE);
    const ladder = manifest.beats.find((b) => b.listRef);
    if (!ladder) throw new Error("no beat declares a listRef");
    await scrubTo(page, timeline.beatStarts[ladder.beat] + 0.01);
    const list = page.getByTestId("beat-list");
    await expect(list.locator("li")).toHaveCount(lecture.card.ladder.length);
    await expect(list).toContainText(lecture.card.ladder[0]);
  });

  test("reprints the card it teaches, from the frozen source", async ({ page }) => {
    await page.goto(LECTURE);
    const sheet = page.getByTestId("field-card-sheet");
    await sheet.scrollIntoViewIfNeeded();
    await expect(sheet).toContainText(lecture.card.killSwitch);
    for (const layer of lecture.card.layers) {
      await expect(sheet).toContainText(layer.code);
    }
    // Every problem row survives the trip from JSON to the page.
    await expect(sheet.locator("tbody tr")).toHaveCount(
      lecture.card.decisions.length,
    );
  });

  test("the same manifest drives a live talk", async ({ page }) => {
    await page.goto(LECTURE);
    await page.getByTestId("present-button").click();

    const podium = page.getByTestId("lecture-podium");
    await expect(podium).toBeVisible();
    await expect(page.getByTestId("speaker-notes")).toContainText(
      manifest.beats[0].notes[0],
    );

    // A clock drives it, so the board advances without any scrolling.
    await expect(page.getByTestId("podium-play")).toHaveText(/pause/i);

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("film-stage")).toHaveAttribute("data-beat", "2");
    await expect(page.getByTestId("speaker-notes")).toContainText(
      manifest.beats[2].notes[0],
    );

    await page.keyboard.press("n");
    await expect(page.getByTestId("speaker-notes")).toBeHidden();

    await page.keyboard.press("Escape");
    await expect(podium).toBeHidden();
    // Back on the page, at the beat that was on the screen.
    await expect(page.getByTestId("film-stage")).toHaveAttribute("data-beat", "2");
  });

  test("reduced motion reads without autoplay", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(LECTURE);
    await page.getByTestId("present-button").click();
    await expect(page.getByTestId("podium-play")).toHaveText(/play/i);

    // Stepping beats still reaches the closing frame.
    for (let i = 0; i < manifest.beats.length; i++) {
      await page.keyboard.press("ArrowRight");
    }
    await expect(page.getByTestId("film-stage")).toHaveAttribute(
      "data-beat",
      String(manifest.beats[manifest.beats.length - 1].beat),
    );
  });
});
