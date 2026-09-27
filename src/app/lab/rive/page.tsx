import type { Metadata } from "next";
import { buildField } from "@/lib/sim/book-field";
import { RiveGate } from "@/components/director/RiveGate";

export const metadata: Metadata = {
  title: "Rive gate",
  robots: { index: false },
};

export default function RiveGatePage() {
  return <RiveGate model={buildField()} />;
}
