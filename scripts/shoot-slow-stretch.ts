/**
 * Rasterise the slow-stretch approval stills. Not mounted in the film.
 * OUT defaults to /opt/cursor/artifacts.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { slowStretchScene, type StretchId } from "../src/components/onepager/slow-stretch";

async function main() {
  const OUT = process.env.OUT ?? "/opt/cursor/artifacts";
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  try {
    for (const id of ["now", "later", "pair"] as const satisfies readonly StretchId[]) {
      const scene = slowStretchScene(id);
      const html = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#f4efe4">${scene.svg}</body></html>`;
      const page = await browser.newPage({
        viewport: { width: scene.width, height: scene.height },
        deviceScaleFactor: 2,
      });
      await page.setContent(html, { waitUntil: "load" });
      const file = `${OUT}/slow-stretch-${id}.png`;
      await page.screenshot({ path: file, type: "png" });
      await writeFile(`${OUT}/slow-stretch-${id}.svg`, scene.svg);
      await page.close();
      console.log(file);
    }
  } finally {
    await browser.close();
  }
}

void main();
