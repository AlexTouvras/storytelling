#!/usr/bin/env tsx
/**
 * Freeze the Which model? pack from the trimmed OpenRouter extract.
 * Output: data/figures/which-model.v1.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { freezePack, type SourceCatalog } from "../src/lib/model-choice/normalize";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(root, "data/sources/openrouter-which-model.json");
const outPath = join(root, "data/figures/which-model.v1.json");

const source = JSON.parse(readFileSync(sourcePath, "utf8")) as SourceCatalog;
const pack = freezePack(source);
writeFileSync(outPath, `${JSON.stringify(pack, null, 2)}\n`);
console.log(`wrote ${outPath} (${pack.models.length} models, fetched ${pack.fetchedAt})`);
