"use client";

import { useId, useState } from "react";
import { segmentBeat, type Term } from "@/lib/reader/terms";
import { useReader } from "@/components/reader/ReaderContext";
import { cn } from "@/lib/cn";

/**
 * A term's first use in the beat that teaches it: an underlined word that
 * opens its definition in place. A real button, so it works by keyboard and
 * touch; nothing animates, so reduced motion needs no special case.
 */
export function TermButton({ term, children }: { term: Term; children: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        data-testid="term-button"
        data-term={term.id}
        onClick={() => setOpen((o) => !o)}
        className="focus-ring pointer-events-auto cursor-help rounded-sm text-white underline decoration-neon-cyan/60 decoration-dotted underline-offset-4 hover:decoration-neon-cyan"
      >
        {children}
      </button>
      <span
        id={id}
        role="note"
        hidden={!open}
        data-testid="term-definition"
        className="mx-1 rounded-sm bg-white/[0.06] px-1.5 py-0.5 text-[0.92em] text-white/80"
      >
        {term.definition}{" "}
        <span className="font-mono text-[0.78em] uppercase tracking-[0.1em] text-white/45">
          ({term.technical})
        </span>
      </span>
    </>
  );
}

type Props = {
  paragraphs: readonly string[];
  beat: number;
  className?: string;
  paragraphClassName?: string;
};

/** A beat's paragraphs with the terms that beat teaches turned into term buttons. */
export function TermText({ paragraphs, beat, className, paragraphClassName }: Props) {
  const { terms } = useReader();
  const byId = new Map(terms.map((t) => [t.id, t]));
  const segmented = segmentBeat(paragraphs, terms, beat);
  return (
    <div className={className}>
      {segmented.map((segments, pi) => (
        <p key={`${beat}-${pi}`} className={cn(paragraphClassName)}>
          {segments.map((segment, si) => {
            const term = segment.termId ? byId.get(segment.termId) : undefined;
            return term ? (
              <TermButton key={`${beat}-${pi}-${si}`} term={term}>
                {segment.text}
              </TermButton>
            ) : (
              <span key={`${beat}-${pi}-${si}`}>{segment.text}</span>
            );
          })}
        </p>
      ))}
    </div>
  );
}
