import { test, expect, type Page } from "@playwright/test";
import { phoneReadAt } from "../src/lib/director/jam-film";

/**
 * The reader kit, on every reference story: an orientation card before the
 * film, terms taught where they are first used, a Terms drawer, badges that
 * link to their label on the method page, and the method page with its pack.
 */
const STORIES = [
  { slug: "when-rates-rise", track: "rate-film", at: 0.25, beat: "1", term: "buffer", terms: 8, kind: "modelled" },
  { slug: "where-should-the-cutoff-sit", track: "cutoff-film", at: 0.22, beat: "2", term: "pd", terms: 13, kind: "modelled" },
  { slug: "where-should-the-recovery-time-sit", track: "recovery-film", at: 0.66, beat: "7", term: "recovery-margin", terms: 8, kind: "calculated" },
  // 0.195 is inside beat 1 on a laptop and inside beat 1's reading span on a phone (`phoneReadAt`).
  { slug: "how-much-fast-reserve", track: "grid-film", at: 0.195, beat: "1", term: "trip", terms: 9, kind: "observed" },
  {
    slug: "where-should-the-speed-be-held",
    track: "jam-film",
    at: phoneReadAt(2),
    beat: "2",
    term: "pocket",
    terms: 4,
    kind: "calculated",
  },
] as const;

async function scrubTo(page: Page, track: string, at: number) {
  await page.evaluate(
    ({ track, at }) => {
      document.documentElement.style.scrollBehavior = "auto";
      const el = document.querySelector(`[data-testid='${track}']`);
      if (!(el instanceof HTMLElement)) throw new Error(`no ${track} track`);
      const total = el.offsetHeight - window.innerHeight;
      window.scrollTo(0, el.offsetTop + total * at);
    },
    { track, at },
  );
  await page.waitForTimeout(250);
}

for (const story of STORIES) {
  const film = `/stories/${story.slug}/film`;
  const method = `/stories/${story.slug}/method`;

  test.describe(`reader kit: ${story.slug}`, () => {
    test("orients the reader before the film and teaches a term in its beat", async ({ page }) => {
      await page.goto(film);
      await expect(page.getByTestId("orientation-card")).toBeVisible();
      await expect(page.getByTestId("orientation-card").getByTestId("method-link")).toHaveAttribute("href", method);

      await scrubTo(page, story.track, story.at);
      await expect(page.getByTestId("film-stage")).toHaveAttribute("data-beat", story.beat);
      const term = page.locator(`[data-testid='term-button'][data-term='${story.term}']`);
      await expect(term).toHaveAttribute("aria-expanded", "false");
      await term.click();
      await expect(term).toHaveAttribute("aria-expanded", "true");
      await expect(page.locator(`#${await term.getAttribute("aria-controls")}`)).toBeVisible();

      const badge = page.getByTestId("beat-badge").first();
      await expect(badge).toHaveText(story.kind);
      await expect(badge).toHaveAttribute("href", `${method}#kind-${story.kind}`);
    });

    test("lists every term in the drawer, which Escape closes", async ({ page }) => {
      await page.goto(film);
      await page.getByTestId("terms-toggle").click();
      const drawer = page.getByTestId("terms-drawer");
      await expect(drawer.getByTestId("drawer-term")).toHaveCount(story.terms);
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
    });

    test("ends on a method page generated from the pack", async ({ page, request }) => {
      await page.goto(film);
      await expect(page.getByTestId("end-method-link")).toHaveAttribute("href", method);

      await page.goto(method);
      await expect(page.getByTestId("method-page")).toBeVisible();
      await expect(page.locator(`#kind-${story.kind}`)).toBeVisible();
      await expect(page.getByTestId("method-terms")).toBeVisible();
      await expect(page.getByTestId("schema-table")).toBeVisible();

      const res = await request.get(`${method}/evidence.json`);
      expect(res.status()).toBe(200);
      expect(Object.keys(await res.json()).length).toBeGreaterThan(3);
    });
  });
}
