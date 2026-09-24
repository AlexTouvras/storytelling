"use client";

import { motion } from "framer-motion";
import { AtmosphereLayer } from "@/components/storytelling/atmosphere";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";
import type { AtmosphereMotifId } from "@/stories/schemas/atmosphereAllowlist";

type Props = {
  kicker: string;
  title: string;
  question: string;
  /** One short framing line — mechanism, not methodology. */
  deck?: string;
  motifId?: AtmosphereMotifId | string;
};

/**
 * Cinematic opening: full-bleed atmosphere + decision question.
 */
export function StoryHero({
  kicker,
  title,
  question,
  deck,
  motifId = "pressure-field",
}: Props) {
  const reduced = usePrefersReducedMotion();
  const dur = reduced ? 0 : 0.7;

  return (
    <header className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2">
      <div className="relative flex min-h-[min(92vh,820px)] flex-col justify-end overflow-hidden pb-14 pt-28 sm:pb-20 sm:pt-32">
        <AtmosphereLayer motifId={motifId} role="intro" />

        <div className="relative z-10 mx-auto w-full max-w-5xl px-4">
          <motion.p
            className="font-mono text-[11px] uppercase tracking-[0.28em] text-neon-cyan/90"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, delay: 0.05 }}
          >
            {kicker}
          </motion.p>
          <motion.h1
            className="mt-5 max-w-[14ch] font-display text-[clamp(3rem,9vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-white"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, delay: 0.12 }}
          >
            {title}
          </motion.h1>
          <motion.p
            className="mt-7 max-w-2xl text-[clamp(1.15rem,2.4vw,1.65rem)] leading-[1.35] text-white/85"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, delay: 0.22 }}
          >
            {question}
          </motion.p>
          {deck ? (
            <motion.p
              className="mt-5 max-w-xl text-base leading-relaxed text-white/45"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: dur, delay: 0.35 }}
            >
              {deck}
            </motion.p>
          ) : null}

          <motion.p
            className="mt-12 font-mono text-[10px] uppercase tracking-[0.22em] text-white/35"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: dur, delay: 0.45 }}
          >
            Scroll · into the decision
          </motion.p>
        </div>
      </div>
    </header>
  );
}
