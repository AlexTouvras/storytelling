import type { Metadata } from "next";
import { FieldCardStage } from "@/components/director/FieldCardStage";
import { fieldCard } from "@/illustrations/field-cards";

const card = fieldCard("sdlc");

export const metadata: Metadata = {
  title: card.title,
  robots: { index: false },
};

export default function SdlcFieldCardPage() {
  return <FieldCardStage card="sdlc" />;
}
