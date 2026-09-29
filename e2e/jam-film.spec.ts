import { test, expect } from "@playwright/test";

const FILM = "/stories/where-should-the-speed-be-held/film";

test.describe("why is the road ahead already moving", () => {
  test("landing lists the US-101 story to its film", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Stories" })).toBeVisible();
    const link = page.getByRole("link", { name: "Why is the road ahead already moving?" });
    await expect(link).toHaveAttribute("href", FILM);
    await link.click();
    await expect(page).toHaveURL(FILM);
    await expect(page.getByTestId("film-title")).toContainText(/road ahead already moving/i);
  });
});
