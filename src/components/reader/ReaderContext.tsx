"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Term } from "@/lib/reader/terms";

export type ReaderKit = {
  slug: string;
  beats: readonly string[];
  terms: readonly Term[];
};

const ReaderContext = createContext<ReaderKit | null>(null);

export function ReaderProvider({ kit, children }: { kit: ReaderKit; children: ReactNode }) {
  return <ReaderContext.Provider value={kit}>{children}</ReaderContext.Provider>;
}

export function useReader(): ReaderKit {
  const kit = useContext(ReaderContext);
  if (!kit) throw new Error("Reader components need a <ReaderProvider>");
  return kit;
}
