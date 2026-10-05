import type { Metadata } from "next";
import { WhichModel } from "@/components/model-choice/WhichModel";

export const metadata: Metadata = {
  title: "Which model?",
  description:
    "Which model should you use for this job? A one-page decision instrument over a frozen OpenRouter catalog.",
};

export default function WhichModelPage() {
  return <WhichModel />;
}
