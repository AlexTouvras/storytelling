import type { Metadata } from "next";
import { buildField } from "@/lib/sim/book-field";
import { RateFilm } from "@/components/film/RateFilm";
import { loadStoryManifest } from "@/lib/loadStory";

const SLUG = "when-rates-rise";

export const metadata: Metadata = {
  title: "When Rates Rise",
  description:
    "Where a portfolio manager should cut when the policy rate moves: one floating mortgage, then the book, then the sleeve you can actually watch.",
};

export default function WhenRatesRiseFilmPage() {
  const manifest = loadStoryManifest(SLUG);
  if (!manifest.reader) throw new Error(`${SLUG} needs a reader block`);
  const model = buildField();
  return <RateFilm slug={SLUG} reader={manifest.reader} model={model} />;
}
