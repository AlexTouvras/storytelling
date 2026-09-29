import { test, expect } from "@playwright/test";

const FILM = "/stories/where-should-the-speed-be-held/film";

test.describe("why is the road ahead already moving", () => {
  // Listed 2026-09-29 and unlisted the same day. The film stays at its route.
  // The index must not link it.
  test("landing does not link the US-101 story", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Stories" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Why is the road ahead already moving?" })).toHaveCount(0);
  });

  test("the film route still opens", async ({ page }) => {
    await page.goto(FILM);
    await expect(page.getByTestId("film-title")).toContainText(/road ahead already moving/i);
  });
});
