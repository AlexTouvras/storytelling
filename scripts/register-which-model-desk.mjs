#!/usr/bin/env node
/**
 * Register Which model? on Orbit's live desk.
 *
 * Storytelling cannot edit Orbit in a normal checkout. This runs in CI
 * with ORBIT_DISPATCH_TOKEN, copies the instrument, and patches the desk
 * registry. create-pull-request then opens the Orbit pull request.
 *
 *   STORYTELLING_ROOT=.. ORBIT_ROOT=/path/to/Orbit node scripts/register-which-model-desk.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DESK_ENTRY = `  {
    slug: "which-model",
    title: "Which model?",
    question: "Which model should I use for this job?",
    cadence: "Monthly · OpenRouter catalog",
    status: "live",
    kind: "native",
    source: "OpenRouter · Artificial Analysis",
  },
`;

const ROUTE = `  if (slug === "which-model") {
    return (
      <>
        <BackLink fallbackHref="/portfolio/live" label="Live dashboards" />
        <WhichModel frame="desk" />
      </>
    );
  }

`;

const DESCRIPTION_FROM =
  "One-page desks on Orbit: Nordic equity, EU Spot, Helsinki housing, and Europe power mix. Not Power BI.";
const DESCRIPTION_TO =
  "One-page desks on Orbit: Nordic equity, EU Spot, Helsinki housing, Europe power mix, and which model fits a job.";

const LEDE_FROM = `        Electricity, Helsinki flats, Nordic stocks, the euro area. One question
        on the card. The picture stays on the desk.`;
const LEDE_TO = `        Electricity, Helsinki flats, Nordic stocks, the euro area, and which
        model fits a job. One question on the card. The picture stays on the
        desk.`;

export function insertDesk(source) {
  if (source.includes('slug: "which-model"')) return source;
  const marker = "\n];\n\nexport function getLiveDesk";
  if (!source.includes(marker)) {
    throw new Error("live-desks.ts has no desk list to extend");
  }
  return source.replace(marker, `\n${DESK_ENTRY}];\n\nexport function getLiveDesk`);
}

export function insertRoute(source) {
  let next = source;
  if (!next.includes('from "@/components/model-choice/WhichModel"')) {
    const anchor = 'import { EconomyDesk } from "@/components/live/EconomyDesk";\n';
    if (!next.includes(anchor)) throw new Error("live desk page has no EconomyDesk import");
    next = next.replace(
      anchor,
      `${anchor}import { WhichModel } from "@/components/model-choice/WhichModel";\n`,
    );
  }
  if (!next.includes('from "@/components/ui/BackLink"')) {
    const anchor = 'import { WhichModel } from "@/components/model-choice/WhichModel";\n';
    next = next.replace(anchor, `${anchor}import { BackLink } from "@/components/ui/BackLink";\n`);
  }
  if (!next.includes('slug === "which-model"')) {
    const marker = "\n  notFound();\n}\n";
    const at = next.lastIndexOf(marker);
    if (at < 0) throw new Error("live desk page has no closing notFound()");
    next = `${next.slice(0, at)}\n${ROUTE}${next.slice(at)}`;
  }
  return next;
}

export function mentionModelDesk(source) {
  let next = source;
  if (next.includes(DESCRIPTION_FROM)) next = next.replace(DESCRIPTION_FROM, DESCRIPTION_TO);
  if (next.includes(LEDE_FROM)) next = next.replace(LEDE_FROM, LEDE_TO);
  if (!next.includes("which model fits a job")) {
    throw new Error("live desk index has neither the old lede nor the model sentence");
  }
  return next;
}

function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    if (ent.name.endsWith(".test.ts") || ent.name.endsWith(".test.tsx")) continue;
    const from = path.join(src, ent.name);
    const to = path.join(dest, ent.name);
    if (ent.isDirectory()) copyTree(from, to);
    else fs.copyFileSync(from, to);
  }
}

function patch(file, edit) {
  const before = fs.readFileSync(file, "utf8");
  const after = edit(before);
  if (after !== before) fs.writeFileSync(file, after);
}

function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const storytelling = path.resolve(process.env.STORYTELLING_ROOT ?? path.join(here, ".."));
  const orbit = process.env.ORBIT_ROOT;
  if (!orbit) {
    console.log("ORBIT_ROOT is unset. Patch functions are exported for tests.");
    return;
  }
  const orbitRoot = path.resolve(orbit);
  copyTree(
    path.join(storytelling, "src/components/model-choice"),
    path.join(orbitRoot, "src/components/model-choice"),
  );
  copyTree(
    path.join(storytelling, "src/lib/model-choice"),
    path.join(orbitRoot, "src/lib/model-choice"),
  );
  fs.mkdirSync(path.join(orbitRoot, "data/figures"), { recursive: true });
  fs.copyFileSync(
    path.join(storytelling, "data/figures/which-model.v1.json"),
    path.join(orbitRoot, "data/figures/which-model.v1.json"),
  );
  patch(path.join(orbitRoot, "src/content/live-desks.ts"), insertDesk);
  patch(path.join(orbitRoot, "src/app/portfolio/live/[slug]/page.tsx"), insertRoute);
  patch(path.join(orbitRoot, "src/app/portfolio/live/page.tsx"), mentionModelDesk);
  console.log(`registered which-model on ${orbitRoot}`);
}

const isDirect =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
