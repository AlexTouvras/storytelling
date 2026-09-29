import type { Metadata } from "next";
import { JamCard } from "@/components/onepager/JamCard";

export const metadata: Metadata = {
  title: "The jam grows backward",
  description:
    "One lane of US-101, one minute. The cars move forward. The slow stretch moves back.",
  robots: { index: false },
};

export default function JamCardPage() {
  return (
    <div className="flex min-h-[calc(100dvh-5rem)] items-center bg-void">
      <JamCard />
    </div>
  );
}
