"use client";

import type { LectureBeat } from "@/lectures/schemas/lecture";

type Props = {
  beat: LectureBeat;
  /** `read` sits under a scrolled board; `present` is projected. */
  variant: "read" | "present";
};

/**
 * The beat's reader-facing copy. The presenter variant is the same words at
 * projection size — a lecture and a read-through are the same manifest, so they
 * must not be allowed to drift into two sets of copy.
 */
export function LectureBeatCopy({ beat, variant }: Props) {
  const present = variant === "present";

  return (
    <div data-testid="beat-copy" className={present ? "max-w-2xl" : "max-w-xl"}>
      <p
        className={`font-mono uppercase tracking-[0.2em] text-neon-cyan/75 ${
          present ? "text-xs" : "text-[10px]"
        }`}
      >
        {beat.kicker}
      </p>
      <h2
        className={`mt-2 font-display font-semibold tracking-[-0.03em] text-white ${
          present
            ? "text-[clamp(1.9rem,3.4vw,3.1rem)] leading-[1.05]"
            : "text-2xl md:text-3xl"
        }`}
      >
        {beat.title}
      </h2>
      <div
        className={`mt-3 space-y-2 leading-relaxed text-white/70 ${
          present ? "text-base md:text-lg" : "text-sm md:text-base"
        }`}
      >
        {beat.paragraphs.map((p) => (
          <p key={p.slice(0, 28)}>{p}</p>
        ))}
      </div>
    </div>
  );
}
