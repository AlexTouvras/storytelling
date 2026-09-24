import type { Metadata } from "next";
import { buildField } from "@/lib/sim/book-field";
import { RateFilm } from "@/components/film/RateFilm";

export const metadata: Metadata = {
  title: "When Rates Rise",
  description:
    "Where a portfolio manager should cut when the policy rate moves: one floating mortgage, then the book, then the sleeve you can actually watch.",
};

export default function WhenRatesRiseFilmPage() {
  const model = buildField();
  return <RateFilm model={model} />;
}
