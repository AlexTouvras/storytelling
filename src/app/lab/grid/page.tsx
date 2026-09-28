import type { Metadata } from "next";
import { gridValues } from "@/illustrations/grid";
import { GridLab } from "@/components/director/GridLab";

export const metadata: Metadata = {
  title: "Grid illustration",
  robots: { index: false },
};

export default function GridLabPage() {
  return <GridLab values={gridValues()} />;
}
