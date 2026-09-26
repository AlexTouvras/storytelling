import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LectureFilm } from "@/components/lecture/LectureFilm";
import { loadLecture } from "@/lectures/load";

export const metadata: Metadata = {
  title: "Agentic AI, taught — field card lecture (lab)",
  description:
    "Feasibility prototype: the Agentic AI field card paced as a briefing. Five layers built one at a time, readable by scroll or driven by a clock for a live talk.",
  robots: { index: false, follow: false },
};

/**
 * Lab route. Unlisted on purpose: publishing is a human gate, and this exists to
 * answer whether the storytelling engine can carry a teaching register at all.
 */
export default function AgenticAiLecturePage() {
  const lecture = loadLecture("agentic-ai");
  if (!lecture) notFound();
  return <LectureFilm lecture={lecture} />;
}
