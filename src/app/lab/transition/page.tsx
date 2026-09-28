import type { Metadata } from "next";
import { buildField } from "@/lib/sim/book-field";
import { TransitionScene } from "@/components/director/TransitionScene";

export const metadata: Metadata = {
  title: "Transition gate",
  robots: { index: false },
};

export default function TransitionGatePage() {
  return <TransitionScene model={buildField()} />;
}
