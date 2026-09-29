"use client";

import type { ReactNode, Ref } from "react";
import { KindBadge } from "@/components/reader/KindBadge";
import { TermButton } from "@/components/reader/TermText";
import { useReader } from "@/components/reader/ReaderContext";
import type { EvidenceKind } from "@/lib/reader/kinds";
import { filmForms, segmentBeat, uses } from "@/lib/reader/terms";
import { subtitleCues } from "@/components/film/subtitles";

export type FilmSubtitleProps = {
  kicker: string;
  title: string;
  paragraphs: readonly string[];
  /** Which cue of `paragraphs` is on screen. The picture keeps the rest of the beat. */
  cue: number;
  beat: number;
  slug: string;
  kind?: EvidenceKind | null;
  figure?: string | null;
  figureNote?: string | null;
  caveat?: string | null;
  /** Extra line under the sentences, for a beat that carries its own small instrument. */
  extra?: ReactNode;
};

/**
 * The beat's words, set like a subtitle: a caption, then one or two lines,
 * centred at the bottom of the frame. Later cues replace this one as the
 * reader scrolls. The picture keeps the rest of the screen.
 * `data-strip` is the first row, which is all a phone used to keep while the
 * picture played.
 */
export function FilmSubtitle({
  kicker,
  title,
  paragraphs,
  cue,
  beat,
  slug,
  kind,
  figure,
  figureNote,
  caveat,
  extra,
}: FilmSubtitleProps) {
  return (
    <div className="mx-auto w-full max-w-3xl text-center">
      <div data-strip className="flex flex-wrap items-center justify-center gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neon-cyan/80">{kicker}</p>
        {kind ? <KindBadge kind={kind} slug={slug} /> : null}
      </div>
      <h2 className="mt-1 font-display text-[13px] font-medium leading-snug tracking-[-0.02em] text-white/70 md:text-sm">
        {title}
      </h2>
      <SubtitleCue paragraphs={paragraphs} beat={beat} index={cue} />
      {figure ? (
        <p className="mt-1">
          <span data-testid="hero-figure" className="font-display text-lg font-semibold tracking-[-0.03em] text-neon-cyan">
            {figure}
          </span>
          {figureNote ? (
            <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">{figureNote}</span>
          ) : null}
        </p>
      ) : null}
      {caveat ? (
        <p data-testid="beat-caveat" className="mx-auto mt-1 max-w-md text-[11px] leading-snug text-white/45">
          {caveat}
        </p>
      ) : null}
      {extra}
    </div>
  );
}

/** The cue on screen, with a term button only if this cue is where the beat teaches it. */
function SubtitleCue({
  paragraphs,
  beat,
  index,
}: {
  paragraphs: readonly string[];
  beat: number;
  index: number;
}) {
  const { terms } = useReader();
  const cues = subtitleCues(paragraphs);
  const i = Math.max(0, Math.min(cues.length - 1, index));
  const earlier = cues.slice(0, i).join(" ");
  const pending = terms.filter((term) => term.beat === beat && !uses([earlier], filmForms(term)));
  const [segments] = segmentBeat([cues[i] ?? ""], pending, beat);
  const byId = new Map(terms.map((term) => [term.id, term]));
  return (
    <p
      data-testid="subtitle-line"
      className="mx-auto mt-1 max-w-[36ch] text-pretty text-[17px] font-medium leading-snug text-white md:text-lg"
    >
      {(segments ?? []).map((segment, si) => {
        const term = segment.termId ? byId.get(segment.termId) : undefined;
        return term ? (
          <TermButton key={`${beat}-${i}-${si}`} term={term}>
            {segment.text}
          </TermButton>
        ) : (
          <span key={`${beat}-${i}-${si}`}>{segment.text}</span>
        );
      })}
    </p>
  );
}

/** Pins the subtitle to the bottom of the stage, with a scrim only as tall as the words. */
export function FilmSubtitleBar({
  barRef,
  className,
  ...props
}: FilmSubtitleProps & { barRef?: Ref<HTMLDivElement>; className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 ${className ?? ""}`}>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-void via-void/80 to-transparent" />
      <div ref={barRef} data-testid="beat-copy" className="relative px-5 pb-4">
        <div className="pointer-events-auto">
          <FilmSubtitle {...props} />
        </div>
      </div>
    </div>
  );
}
