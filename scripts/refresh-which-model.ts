#!/usr/bin/env tsx
/**
 * Replace the Which model? extract with the current OpenRouter catalog.
 * Writes data/sources/openrouter-which-model.json and data/figures/which-model.v1.json.
 * Fails if a curated id is gone, rather than dropping that model.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { trimCatalog, type OpenRouterCatalog } from "../src/lib/model-choice/extract";
import { freezePack } from "../src/lib/model-choice/normalize";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(root, "data/sources/openrouter-which-model.json");
const outPath = join(root, "data/figures/which-model.v1.json");
const sourceUrl = "https://openrouter.ai/api/v1/models";

async function main() {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`OpenRouter catalog responded ${response.status}`);
  }
  const payload = (await response.json()) as OpenRouterCatalog;
  const fetchedAt = new Date().toISOString().slice(0, 10);
  const source = trimCatalog(payload, fetchedAt);
  const pack = freezePack(source);

  writeFileSync(sourcePath, `${JSON.stringify(source, null, 2)}\n`);
  writeFileSync(outPath, `${JSON.stringify(pack, null, 2)}\n`);
  console.log(`wrote ${source.models.length} models fetched ${pack.fetchedAt}`);
}

main();
