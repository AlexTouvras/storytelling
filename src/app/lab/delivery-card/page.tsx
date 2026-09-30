import type { Metadata } from "next";
import { FieldCardStage } from "@/components/director/FieldCardStage";
import { fieldCard } from "@/illustrations/field-cards";

const card = fieldCard("delivery");

export const metadata: Metadata = {
  title: card.title,
  robots: { index: false },
};

export default function DeliveryFieldCardPage() {
  return <FieldCardStage card="delivery" />;
}
