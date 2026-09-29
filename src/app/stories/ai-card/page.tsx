import type { Metadata } from "next";
import { AiFieldCard } from "@/components/director/AiFieldCard";

export const metadata: Metadata = {
  title: "Agentic AI field card",
  robots: { index: false },
};

/** Public path. Orbit serves `/stories/*`; `/lab/*` never reaches the website. */
export default function AiFieldCardPage() {
  return <AiFieldCard />;
}
