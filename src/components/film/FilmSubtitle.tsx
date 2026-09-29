import type { ReactNode, Ref } from "react";
import { KindBadge } from "@/components/reader/KindBadge";
import { TermText } from "@/components/reader/TermText";
import type { EvidenceKind } from "@/lib/reader/kinds";

export type FilmSubtitleProps = {
  kicker: string;
  title: string;
  paragraphs: readonly string[];
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
 * The beat's words, set like a subtitle: a short line, then the sentences,
 * centred at the bottom of the frame. The picture keeps the rest of the screen.
 * `data-strip` is the first row, which is all a phone keeps while the picture plays.
 */
export function FilmSubtitle({
  kicker,
  title,
  paragraphs,
  beat,
  slug,
  kind,
  figure,
  figureNote,
  caveat,
  extra,
}: FilmSubtitleProps) {
  return (
    <div className="mx-auto w-full max-w-xl text-center">
      <div data-strip className="flex flex-wrap items-center justify-center gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neon-cyan/80">{kicker}</p>
        {kind ? <KindBadge kind={kind} slug={slug} /> : null}
      </div>
      <h2 className="mt-1 font-display text-base font-semibold leading-snug tracking-[-0.02em] text-white md:text-lg">
        {title}
      </h2>
      <TermText
        paragraphs={paragraphs}
        beat={beat}
        className="mt-1 space-y-1 text-[13px] leading-snug text-white/75 md:text-sm"
      />
      {figure ? (
        <p className="mt-1">
          <span data-testid="hero-figure" className="font-display text-2xl font-semibold tracking-[-0.03em] text-neon-cyan">
            {figure}
          </span>
          {figureNote ? (
            <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">{figureNote}</span>
          ) : null}
        </p>
      ) : null}
      {caveat ? (
        <p data-testid="beat-caveat" className="mt-1 text-[11px] leading-snug text-white/45">
          {caveat}
        </p>
      ) : null}
      {extra}
    </div>
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
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-void via-void/80 to-transparent" />
      <div ref={barRef} data-testid="beat-copy" className="relative px-5 pb-5">
        <div className="pointer-events-auto">
          <FilmSubtitle {...props} />
        </div>
      </div>
    </div>
  );
}
