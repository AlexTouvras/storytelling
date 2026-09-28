import type { Metadata } from "next";
import { GridFilm } from "@/components/film/GridFilm";
import { gridDecision, gridNarration } from "@/components/film/grid-copy";
import { gridFilmData } from "@/components/film/grid-film-data";
import { gridValues } from "@/illustrations/grid";
import { loadStoryManifest } from "@/lib/loadStory";

const SLUG = "how-much-fast-reserve";

export const metadata: Metadata = {
  title: "When the Spinning Stops",
  description:
    "A year of the Nordic grid at ten readings a second: how far the frequency falls when a plant drops out depends on how much mass is spinning, and a few hundred MW of fast reserve does what tens of GWs of spinning mass would.",
  robots: { index: false },
};

export default function GridFilmPage() {
  const manifest = loadStoryManifest(SLUG);
  if (!manifest.reader) throw new Error(`${SLUG} needs a reader block`);
  return (
    <GridFilm
      slug={SLUG}
      reader={manifest.reader}
      copy={gridNarration()}
      decision={gridDecision()}
      data={gridFilmData()}
      values={gridValues()}
    />
  );
}
