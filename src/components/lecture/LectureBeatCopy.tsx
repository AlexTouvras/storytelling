"use client";

import type { LectureBeat } from "@/lectures/schemas/lecture";

type Props = {
  beat: LectureBeat;
  /** Rows a `listRef` resolved to on the frozen card, if the beat declared one. */
  list: string[];
  /** `read` is a slide on a page; `present` is the same slide projected. */
  variant: "read" | "present";
};

/**
 * The slide's commentary column: prose, the so-what, and whatever list the card
 * already publishes.
 *
 * A presenter's slide and a reader's slide are the same words at two sizes. They
 * have to be, or the deck and the briefing drift into two documents with one
 * source line between them.
 */
export function LectureBeatCopy({ beat, list, variant }: Props) {
  const present = variant === "present";

  return (
    <div
      data-testid="beat-copy"
      className="flex min-h-0 min-w-0 flex-col gap-2.5 md:gap-3.5"
    >
      <div
        className={`space-y-2 text-ink-soft ${
          present
            ? "text-[clamp(0.9rem,1.05vw,1.05rem)] leading-[1.55]"
            : "text-[12.5px] leading-[1.5] md:text-[13.5px]"
        }`}
      >
        {beat.paragraphs.map((p) => (
          <p key={p.slice(0, 28)}>{p}</p>
        ))}
      </div>

      {list.length > 0 ? (
        <ol
          data-testid="beat-list"
          className="hidden min-h-0 space-y-1 overflow-hidden border-t border-rule pt-2.5 text-[12px] leading-snug text-ink-soft md:block"
        >
          {list.map((row, i) => (
            <li key={row} className="flex gap-2">
              <span className="w-3 shrink-0 font-mono text-[10px] font-semibold text-steel">
                {i + 1}
              </span>
              <span>{row}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {/* Below lg the exhibit has no right rail, so the note lands here. */}
      {beat.annotation ? (
        <p className="border-l border-rule pl-2.5 text-[11.5px] leading-snug text-ink-muted lg:hidden">
          {beat.annotation}
        </p>
      ) : null}

      {/* The so-what sits at the foot of the column, where a deck puts it. */}
      <div className="border-l-2 border-signal bg-steel-wash/70 px-3 py-2 md:mt-auto">
        <p className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-signal">
          So what
        </p>
        <p
          className={`mt-1 font-medium text-ink ${
            present
              ? "text-[clamp(0.9rem,1vw,1rem)] leading-snug"
              : "text-[12.5px] leading-snug md:text-[13px]"
          }`}
        >
          {beat.takeaway}
        </p>
      </div>
    </div>
  );
}
