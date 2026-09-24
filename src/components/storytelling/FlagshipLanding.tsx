"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AtmosphereLayer } from "@/components/storytelling/atmosphere";
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

const PATH = [
  {
    n: "01",
    title: "One loan",
    body: "Income, essentials, the mortgage payment, and the buffer that is left. The policy rate is not on this screen yet.",
  },
  {
    n: "02",
    title: "The book",
    body: "A modelled field of mortgages. Fixed coupons stay put. Only loans that can reprice travel when the coupon steps up.",
  },
  {
    n: "03",
    title: "The cut",
    body: "The watchlist is the sleeve: floating, and already thin. You can move the shock and see the share change.",
  },
] as const;

function filmHref(slug: string) {
  return slug === "when-rates-rise"
    ? "/stories/when-rates-rise/film"
    : `/stories/${slug}`;
}

/**
 * Front door. The reference story is the page; the system is explained
 * by the path that story takes.
 */
export function FlagshipLanding({ stories }: Props) {
  const reduced = usePrefersReducedMotion();
  const dur = reduced ? 0 : 0.65;
  const primary = stories[0];
  const rest = stories.slice(1);

  return (
    <div className="pb-20">
      <section className="relative min-h-[100dvh]">
        <AtmosphereLayer motifId="pressure-field" role="intro" />
        <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col justify-end px-5 pb-16 pt-28 md:px-8 md:pb-20">
          <motion.p
            className="font-mono text-[11px] uppercase tracking-[0.28em] text-neon-cyan/90"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur }}
          >
            Interactive Decision Storytelling
          </motion.p>
          <motion.h1
            className="mt-5 max-w-[14ch] font-display text-[clamp(3rem,8vw,6.4rem)] font-semibold leading-[0.92] tracking-[-0.04em] text-white"
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, delay: 0.08 }}
          >
            {primary?.slug === "when-rates-rise"
              ? "When rates rise, where do you cut?"
              : (primary?.title ?? "Stories that end in a decision.")}
          </motion.h1>
          <motion.p
            className="mt-7 max-w-xl text-base leading-relaxed text-white/70 md:text-lg"
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, delay: 0.16 }}
          >
            {primary
              ? "The policy rate is the number everyone quotes. This reference story follows one floating mortgage into a modelled book, then asks which balances a portfolio manager should actually watch."
              : "A system for turning a hard question, a model, and the evidence around it into an experience someone can follow alone."}
          </motion.p>
          {primary ? (
            <motion.div
              className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: dur, delay: 0.28 }}
            >
              <Link
                href={filmHref(primary.slug)}
                className="focus-ring inline-flex items-center gap-3 border border-white/20 bg-white/[0.06] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-white transition-colors hover:border-neon-cyan/50 hover:bg-neon-cyan/10"
              >
                Enter the story
                <span aria-hidden className="text-neon-cyan">
                  →
                </span>
              </Link>
              {primary.slug === "when-rates-rise" ? (
                <Link
                  href="/stories/when-rates-rise"
                  className="focus-ring font-mono text-[11px] uppercase tracking-[0.16em] text-white/50 hover:text-white"
                >
                  Essay version
                </Link>
              ) : null}
            </motion.div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 md:px-8 md:py-28">
        <h2 className="max-w-[20ch] font-display text-[clamp(1.8rem,3.5vw,2.8rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
          You scroll the reasoning, not a dashboard.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/60">
          A decision story keeps one question in view. The picture changes
          only to make the next step of that question visible. Modelled
          numbers and published figures stay labeled as different kinds of
          evidence.
        </p>
        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {PATH.map((step) => (
            <li key={step.n} className="border-t border-white/10 pt-5">
              <p className="font-mono text-[11px] tracking-[0.18em] text-neon-cyan/80">
                {step.n}
              </p>
              <h3 className="mt-3 font-display text-2xl text-white">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/60">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {primary ? (
        <section className="border-t border-white/10">
          <div className="mx-auto grid max-w-5xl gap-8 px-5 py-16 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)] md:px-8 md:py-20">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                Reference story · {primary.date}
              </p>
              <h2 className="mt-3 font-display text-3xl text-white md:text-4xl">
                <Link href={filmHref(primary.slug)} className="focus-ring hover:text-neon-cyan">
                  {primary.title}
                </Link>
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/65">
                {primary.question ?? primary.summary} The film is the directed
                version: prologue, the loan, the book, the sleeve, and a pair
                of sliders. The essay is the same decision on the story engine.
              </p>
            </div>
            <div className="flex flex-col justify-end gap-4 font-mono text-[11px] uppercase tracking-[0.16em]">
              <Link
                href={filmHref(primary.slug)}
                className="focus-ring text-neon-cyan hover:text-white"
              >
                Watch the film →
              </Link>
              {primary.slug === "when-rates-rise" ? (
                <Link
                  href="/stories/when-rates-rise"
                  className="focus-ring text-white/45 hover:text-white"
                >
                  Read the essay →
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {rest.length > 0 ? (
        <section className="mx-auto max-w-5xl px-5 md:px-8">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
            More stories
          </h2>
          <ul className="mt-6 divide-y divide-white/10 border-y border-white/10">
            {rest.map((story) => (
              <li key={story.slug}>
                <Link
                  href={filmHref(story.slug)}
                  className="focus-ring flex flex-col gap-2 py-6 sm:flex-row sm:items-baseline sm:justify-between"
                >
                  <span className="font-display text-2xl text-white">{story.title}</span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-white/40">
                    Open →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mx-auto mt-8 max-w-5xl px-5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35 md:px-8">
        <Link href="/lab/atmospheres" className="focus-ring hover:text-neon-cyan">
          Atmosphere lab
        </Link>
        <span className="mx-2 text-white/20">·</span>
        motifs for the system, not a story
      </p>
    </div>
  );
}
