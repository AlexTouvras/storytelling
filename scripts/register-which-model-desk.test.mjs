import assert from "node:assert/strict";
import test from "node:test";
import { insertDesk, insertRoute, mentionModelDesk } from "./register-which-model-desk.mjs";

const desks = `export const liveDesks: LiveDesk[] = [
  {
    slug: "economy",
    title: "Europe Economy Pulse",
    question: "How is the euro area economy doing?",
    cadence: "Monthly · Eurostat + ECB",
    status: "live",
    kind: "native",
    source: "Eurostat · ECB Data Portal",
  },
];

export function getLiveDesk(slug: string): LiveDesk | undefined {
  return liveDesks.find((d) => d.slug === slug);
}
`;

const route = `import { EconomyDesk } from "@/components/live/EconomyDesk";
import { DeskMissing } from "@/components/story/DeskMissing";

export default async function LiveDeskPage() {
  if (slug === "economy") {
    return <EconomyDesk view={toEconomyView(snap)} />;
  }

  notFound();
}
`;

const index = `export const metadata: Metadata = {
  title: "Live dashboards",
  description:
    "One-page desks on Orbit: Nordic equity, EU Spot, Helsinki housing, and Europe power mix. Not Power BI.",
};

export default function LiveDesksPage() {
  return (
    <p className="max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
        Electricity, Helsinki flats, Nordic stocks, the euro area. One question
        on the card. The picture stays on the desk.
    </p>
  );
}
`;

test("adds the which-model desk once", () => {
  const once = insertDesk(desks);
  assert.match(once, /slug: "which-model"/);
  assert.match(once, /Monthly · OpenRouter catalog/);
  assert.equal(insertDesk(once), once);
  assert.equal(once.split('slug: "which-model"').length, 2);
});

test("renders Which model inside the live desk page once", () => {
  const once = insertRoute(route);
  assert.match(once, /import \{ WhichModel \}/);
  assert.match(once, /import \{ BackLink \}/);
  assert.match(once, /frame="desk"/);
  assert.ok(once.indexOf('slug === "which-model"') < once.lastIndexOf("notFound()"));
  assert.equal(insertRoute(once), once);
});

test("names the model desk on the live index once", () => {
  const once = mentionModelDesk(index);
  assert.match(once, /which model fits a job/);
  assert.doesNotMatch(once, /Not Power BI/);
  assert.equal(mentionModelDesk(once), once);
});
