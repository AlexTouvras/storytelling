import { test, expect } from "@playwright/test";

test.describe("reference decision story engine", () => {
  test("loads when-rates-rise with sticky visual + spine", async ({ page }) => {
    await page.goto("/stories/when-rates-rise");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /When Rates Rise/i,
    );

    const sticky = page.getByTestId("sticky-visual");
    await expect(sticky).toBeVisible();
    await expect(sticky).toHaveAttribute("data-visual-id", "cashflow-pressure");
    await expect(sticky).toHaveAttribute("data-visual-state", "dial");

    await expect(
      page.getByRole("list", { name: "Rate transmission chain" }),
    ).toBeVisible();
  });

  test("document scroll advances through multiple visual states", async ({
    page,
  }) => {
    await page.goto("/stories/when-rates-rise");
    const sticky = page.getByTestId("sticky-visual");
    await expect(sticky).toHaveAttribute("data-visual-state", "dial");

    const docHeight = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    expect(docHeight).toBeGreaterThan(2000);

    const seen: string[] = [];
    let last = "dial";
    seen.push(last);

    for (let i = 0; i < 60; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(200);
      const state = await sticky.getAttribute("data-visual-state");
      if (state && state !== last) {
        seen.push(state);
        last = state;
      }
      if (seen.includes("cut")) break;
    }

    const y = await page.evaluate(() => window.scrollY);
    expect(y, "page should have scrolled").toBeGreaterThan(400);

    expect(seen[0]).toBe("dial");
    expect(seen).toEqual(
      expect.arrayContaining(["transmission", "book", "cut"]),
    );
    expect(seen.indexOf("transmission")).toBeLessThan(seen.indexOf("book"));
    expect(seen.indexOf("book")).toBeLessThan(seen.indexOf("cut"));
  });

  test("unknown slug returns not-found", async ({ page }) => {
    const res = await page.goto("/stories/does-not-exist-slug");
    expect(res?.status()).toBe(404);
  });

  test("fixture story still mounts", async ({ page }) => {
    await page.goto("/stories/rates-and-defaults");
    await expect(page.getByTestId("sticky-visual")).toBeVisible();
    await expect(page.getByTestId("sticky-visual")).toHaveAttribute(
      "data-visual-id",
      "rate-risk-mechanism",
    );
  });
});
