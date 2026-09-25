import type { Metadata } from "next";
import { buildAppField } from "@/lib/sim/app-field";
import { CutoffFilm } from "@/components/film/CutoffFilm";

export const metadata: Metadata = {
  title: "Where Should the Cut-Off Sit?",
  description:
    "Under a volume need and a bad-rate appetite, the PD gate is a policy point on an acceptance frontier — paid for on out-of-time data.",
};

export default function CutoffFilmPage() {
  const model = buildAppField();
  return <CutoffFilm model={model} />;
}
