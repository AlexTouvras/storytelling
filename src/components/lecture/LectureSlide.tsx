"use client";

import { LectureBeatCopy } from "@/components/lecture/LectureBeatCopy";
import { resolveCardList } from "@/lectures/schemas/lecture";
import type { LectureBeat, LectureManifest } from "@/lectures/schemas/lecture";
import type { FieldCard } from "@/lectures/schemas/fieldCard";

type Props = {
  manifest: LectureManifest;
  card: FieldCard;
  beat: LectureBeat;
  /** Position in the running order, 1-based, as a deck would number it. */
  index: number;
  total: number;
  progress: number;
  /** The exhibit canvas. Passed in so one canvas host serves both drivers. */
  board: React.ReactNode;
  variant: "read" | "present";
};

/**
 * One slide of the deck.
 *
 * The anatomy is a consulting exhibit page and it is deliberate, because every
 * part of it is doing work the first cut of this lecture did badly:
 *
 *   - a **running head**, so a reader always knows which of nine sections they
 *     are in rather than inferring it from how far the page has scrolled;
 *   - an **action title**, which states the beat's conclusion instead of naming
 *     its topic — the single habit that makes a deck argue rather than describe;
 *   - a numbered, captioned **exhibit**, so the drawing is a figure with a
 *     caption and not a mood;
 *   - a **commentary column** carrying the prose, the so-what, and any list the
 *     card already publishes — lists belong in type, never in a canvas;
 *   - a **source line**, naming the card, its version, and the exact rows this
 *     slide teaches. That line is checked at build time.
 */
export function LectureSlide({
  manifest,
  card,
  beat,
  index,
  total,
  progress,
  board,
  variant,
}: Props) {
  const list = resolveCardList(card, beat.listRef);
  const present = variant === "present";

  return (
    <article
      data-testid="lecture-slide"
      className="flex h-full w-full flex-col overflow-hidden border border-rule bg-paper-card"
    >
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-rule px-4 py-2.5 md:px-7">
        <p className="min-w-0 truncate font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-muted">
          {manifest.kicker} · {card.card}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-muted">
            Section {index} / {total}
          </p>
          <div aria-hidden className="h-[3px] w-14 bg-rule md:w-20">
            <div
              className="h-full bg-steel"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      </header>

      <div className="shrink-0 px-4 pt-4 md:px-7 md:pt-5">
        <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-steel">
          {beat.kicker}
        </p>
        <h2
          data-testid="beat-title"
          className={`mt-1.5 font-serif font-semibold leading-[1.16] tracking-[-0.01em] text-ink ${
            present
              ? "text-[clamp(1.5rem,2.6vw,2.4rem)]"
              : "text-[clamp(1.2rem,2.1vw,1.95rem)]"
          }`}
        >
          {beat.title}
        </h2>
      </div>

      {/* Portrait gives the exhibit the larger share; wide frames put the
          commentary beside it. `minmax(0,…)` everywhere, or one nowrap caption
          would widen a column past the slide. */}
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1.5fr)_minmax(0,1fr)] gap-4 px-4 pb-3 pt-3.5 md:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)] md:grid-rows-none md:gap-6 md:px-7 md:pb-4">
        <figure className="flex min-w-0 flex-col">
          <figcaption className="flex min-w-0 shrink-0 items-baseline gap-2 border-b border-rule pb-1.5">
            <span className="shrink-0 bg-steel px-1.5 py-[3px] font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-white">
              Exhibit {index}
            </span>
            <span className="min-w-0 truncate font-mono text-[9px] uppercase tracking-[0.13em] text-ink-muted">
              {beat.exhibit}
            </span>
          </figcaption>

          <div className="flex min-h-0 min-w-0 flex-1 gap-3">
            <div className="relative min-h-[120px] min-w-0 flex-1">{board}</div>
            {beat.annotation ? (
              <p className="hidden w-[9.5rem] shrink-0 self-start border-l border-rule pl-3 pt-4 text-[11.5px] leading-[1.45] text-ink-muted lg:block xl:w-[12rem]">
                <span className="mb-1 block font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-ink-muted/80">
                  Note
                </span>
                {beat.annotation}
              </p>
            ) : null}
          </div>
        </figure>

        <LectureBeatCopy beat={beat} list={list} variant={variant} />
      </div>

      <footer className="shrink-0 border-t border-rule px-4 py-2 md:px-7">
        <p className="truncate font-mono text-[8.5px] leading-normal text-ink-muted">
          <span className="font-semibold uppercase tracking-[0.12em]">Source:</span>{" "}
          {card.card}, {card.version}, reviewed {card.reviewed} · rows{" "}
          {beat.cardRefs.join(", ")}
        </p>
      </footer>
    </article>
  );
}
