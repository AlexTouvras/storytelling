import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, colorScheme: "dark" });
await page.goto("http://127.0.0.1:3100/stories/where-should-the-recovery-time-sit/film");
await page.waitForSelector("[data-testid='delay-field']");
for (const at of [0.66, 0.86, 0.97]) {
  await page.evaluate((at) => {
    document.documentElement.style.scrollBehavior = "auto";
    const el = document.querySelector("[data-testid='recovery-film']");
    window.scrollTo(0, el.offsetTop + (el.offsetHeight - window.innerHeight) * at);
  }, at);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `/tmp/recovery-shots/720_${Math.round(at * 100)}.png` });
}
await browser.close();
