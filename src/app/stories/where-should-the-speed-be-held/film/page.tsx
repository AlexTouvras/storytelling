import type { Metadata } from "next";
import { JamFilm } from "@/components/film/JamFilm";
import { jamDecision, jamNarration } from "@/components/film/jam-copy";
import { jamFilmData } from "@/components/film/jam-film-data";
import { loadStoryManifest } from "@/lib/loadStory";

const SLUG = "where-should-the-speed-be-held";

export const metadata: Metadata = {
  title: "Why is the road ahead already moving?",
  description:
    "Southbound US-101, one June morning. A pocket of slow cars walks back through the section while the far end is still moving, and the window to hold the speed is the first ten minutes.",
  robots: { index: false },
};

export default function JamFilmPage() {
  const manifest = loadStoryManifest(SLUG);
  if (!manifest.reader) throw new Error(`${SLUG} needs a reader block`);
  return (
    <JamFilm
      slug={SLUG}
      reader={manifest.reader}
      copy={jamNarration()}
      decision={jamDecision()}
      data={jamFilmData()}
      />
  );
}
