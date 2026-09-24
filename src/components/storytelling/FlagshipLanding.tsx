"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AtmosphereLayer } from "@/components/storytelling/atmosphere";
import { ATMOSPHERE_MOTIF_IDS } from "@/stories/schemas/atmosphereAllowlist";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";

type StoryCard = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  question?: string;
};

type Props = {
  stories: StoryCard[];
};

const MOTIF_BLURBS: Record<string, string> = {
  "pressure-field": "Finance · living residual-capacity field",
  "ledger-drift": "Econ · drifting ledger lattice",
  "data-stream": "Data · glyph rain (not KPIs)",
  "signal-ribbon": "Markets · oscilloscope ribbons",
  constellation: "AI · sparse system graph",
};

/**
 * Flagship index — cinematic chrome + motif lab strip.
 */
export function FlagshipLanding({ stories }: Props) {
  const reduced = usePrefersReducedMotion();
  const dur = reduced ? 0 : 0.65;
  const primary = stories[0];

  return (
    <div className="pb-28">
      <section className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2">
        <div className="relative flex min-h-[min(88vh,760px)] flex-col justify-end overflow-hidden pb-16 pt-28">
          <AtmosphereLayer motifId="data-stream" role="intro" />
          <div className="relative z-10 mx-auto w-full max-w-5xl px-4">
            <motion.p
              className="font-mono text-[11px] uppercase tracking-[0.28em] text-neon-cyan/90"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur }}
            >
              Orbit flagship
            </motion.p>
            <motion.h1
              className="mt-5 max-w-[16ch] font-display text-[clamp(2.8rem,8vw,5rem)] font-semibold leading-[0.96] tracking-[-0.03em] text-white"
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur, delay: 0.08 }}
            >
              Interactive Decision Storytelling
            </motion.h1>
            <motion.p
              className="mt-7 max-w-xl text-[clamp(1.05rem,2vw,1.35rem)] leading-snug text-white/75"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur, delay: 0.18 }}
            >
              See the mechanism. Interrogate the evidence. Reach the cut —
              not another dashboard.
            </motion.p>
            {primary ? (
              <motion.div
                className="mt-10"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: dur, delay: 0.3 }}
              >
                <div className="flex flex-wrap items-center gap-6">
                  <Link
                    href={
                      primary.slug === "when-rates-rise"
                        ? "/stories/when-rates-rise/film"
                        : `/stories/${primary.slug}`
                    }
                    className="focus-ring inline-flex items-center gap-3 border border-white/20 bg-white/[0.04] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-white transition-colors hover:border-neon-cyan/50 hover:bg-neon-cyan/10"
                  >
                    Watch the cut
                    <span aria-hidden className="text-neon-cyan">
                      →
                    </span>
                  </Link>
                  {primary.slug === "when-rates-rise" ? (
                    <Link
                      href="/stories/when-rates-rise"
                      className="focus-ring font-mono text-[11px] uppercase tracking-[0.16em] text-white/45 hover:text-white"
                    >
                      Essay version
                    </Link>
                  ) : null}
                </div>
              </motion.div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-5xl px-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
            Atmosphere motifs
          </h2>
          <Link
            href="/lab/atmospheres"
            className="focus-ring font-mono text-[10px] uppercase tracking-wider text-neon-cyan/80 hover:text-neon-cyan"
          >
            Full lab →
          </Link>
        </div>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ATMOSPHERE_MOTIF_IDS.map((id) => (
            <li
              key={id}
              className="relative flex h-36 flex-col justify-end overflow-hidden rounded-xl border border-white/10 bg-[oklch(0.11_0.02_264)]"
            >
              <AtmosphereLayer motifId={id} role="intro" intensity="subtle" />
              <p className="relative z-10 mt-auto p-3 font-mono text-[9px] uppercase tracking-wider text-white/70">
                {MOTIF_BLURBS[id] ?? id}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-16 max-w-5xl px-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
          Decision stories
        </h2>
        <ul className="mt-8 space-y-0 divide-y divide-white/10 border-y border-white/10">
          {stories.map((story) => (
            <li key={story.slug}>
              <div className="flex flex-col gap-3 py-8 sm:flex-row sm:items-baseline sm:justify-between">
                <div className="max-w-2xl">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-neon-cyan/80">
                    {story.date}
                  </p>
                  <h3 className="mt-2 font-display text-2xl text-white">
                    <Link
                      href={
                        story.slug === "when-rates-rise"
                          ? "/stories/when-rates-rise/film"
                          : `/stories/${story.slug}`
                      }
                      className="focus-ring hover:text-neon-cyan"
                    >
                      {story.title}
                    </Link>
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">
                    {story.question ?? story.summary}
                  </p>
                </div>
                <Link
                  href={
                    story.slug === "when-rates-rise"
                      ? "/stories/when-rates-rise/film"
                      : `/stories/${story.slug}`
                  }
                  className="focus-ring font-mono text-[11px] uppercase tracking-wider text-white/30 hover:text-neon-cyan"
                >
                  {story.slug === "when-rates-rise" ? "Watch →" : "Open →"}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
