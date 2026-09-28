"use client";

import { useMemo, type ReactNode } from "react";
import { ReaderProvider } from "@/components/reader/ReaderContext";
import { TermsDrawer } from "@/components/reader/TermsDrawer";
import type { StoryReader } from "@/stories/schemas/manifest";

type Props = {
  slug: string;
  reader: StoryReader;
  /** The beat on screen, so the drawer can mark later terms as still to come. */
  beat: number;
  className?: string;
  children: ReactNode;
};

/** A film's root: the reader context and the Terms drawer around the page. */
export function ReaderShell({ slug, reader, beat, className, children }: Props) {
  const kit = useMemo(() => ({ slug, beats: reader.beats, terms: reader.terms }), [slug, reader.beats, reader.terms]);
  return (
    <ReaderProvider kit={kit}>
      <div className={className}>
        <TermsDrawer beat={beat} />
        {children}
      </div>
    </ReaderProvider>
  );
}
