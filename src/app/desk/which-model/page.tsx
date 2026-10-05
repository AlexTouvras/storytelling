import type { Metadata } from "next";
import { WhichModel } from "@/components/model-choice/WhichModel";

export const metadata: Metadata = {
  title: "Which model?",
  description:
    "Which model should you use for this job? Engine preview of the live desk. The public page is Orbit /portfolio/live/which-model.",
  robots: { index: false, follow: false },
};

/** Engine preview. stories:sync does not copy src/app/desk, so this is not a flagship route. */
export default function WhichModelPage() {
  return <WhichModel />;
}
