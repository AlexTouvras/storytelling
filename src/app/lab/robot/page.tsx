import type { Metadata } from "next";
import { RobotLab } from "@/components/director/RobotLab";

export const metadata: Metadata = {
  title: "Robot character",
  robots: { index: false },
};

export default function RobotLabPage() {
  return <RobotLab />;
}
