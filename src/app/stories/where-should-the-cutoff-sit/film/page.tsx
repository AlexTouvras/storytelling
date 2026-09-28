import type { Metadata } from "next";
import { buildAppField } from "@/lib/sim/app-field";
import { CutoffFilm } from "@/components/film/CutoffFilm";
import { loadStoryManifest } from "@/lib/loadStory";

const SLUG = "where-should-the-cutoff-sit";

export const metadata: Metadata = {
  title: "Where Should the Cut-Off Sit?",
  description:
    "Under a volume need and a bad-rate appetite, the PD gate is a policy point on an acceptance frontier — paid for on out-of-time data.",
};

export default function CutoffFilmPage() {
  const manifest = loadStoryManifest(SLUG);
  if (!manifest.reader) throw new Error(`${SLUG} needs a reader block`);
  const model = buildAppField();
  return <CutoffFilm slug={SLUG} reader={manifest.reader} model={model} />;
}
