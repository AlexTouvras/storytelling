import type { Metadata } from "next";
import { buildDelayField } from "@/lib/sim/delay-field";
import { RecoveryFilm } from "@/components/film/RecoveryFilm";

export const metadata: Metadata = {
  title: "Why Don't Delays Die?",
  description:
    "A year of Finnish rail arrivals: a delay survives to the next stop 81% of the time, and the minutes of recovery margin in the timetable decide whether it dies. So where should the recovery time sit?",
};

export default function RecoveryFilmPage() {
  const model = buildDelayField();
  return <RecoveryFilm model={model} />;
}
