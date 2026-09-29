import type { Metadata } from "next";
import { AiFieldCard } from "@/components/director/AiFieldCard";

export const metadata: Metadata = {
  title: "Agentic AI field card",
  robots: { index: false },
};

export default function AiFieldCardPage() {
  return (
    <>
      <style>{`body > div > header, body > div > footer { display: none !important; }`}</style>
      <AiFieldCard />
    </>
  );
}
