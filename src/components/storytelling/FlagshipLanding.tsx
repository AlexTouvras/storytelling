"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";

type StoryCard = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  question?: string;
  role?: "reference" | "fixture";
};

type Props = {
  stories: StoryCard[];
};

const PATH = [
  {
    n: "01",
    title: "Question",
    body: "Each story opens on a decision someone has to make. The method stays behind the question until the reader needs it.",
  },
  {
    n: "02",
    title: "Evidence",
    body: "A model, a published figure, and a hypothetical are different things. The story says which is which.",
  },
  {
    n: "03",
    title: "Decision",
    body: "The last frame is a cut: what to watch, and what that cut leaves out. Not a dashboard of everything that moved.",
  },
] as const;

function storyLinks(slug: string) {
  if (slug === "when-rates-rise") {
    return [
      { href: "/stories/when-rates-rise/film", label: "Watch the film" },
      { href: "/stories/when-rates-rise", label: "Read the essay" },
    ];
  }
  return [{ href: `/stories/${slug}`, label: "Open" }];
}

/**
 * Index for the system. Every published decision story is a row.
 * The reference story is one row, not the name of the page.
 */
export function FlagshipLanding({ stories }: Props) {
  const reduced = usePrefersReducedMotion();
  const dur = reduced ? 0 : 0.65;

  return (
    <div className="pb-20">
      <section className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(60%_50%_at_70%_0%,oklch(0.22_0.04_264)_0%,transparent_70%)]"
        />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-5 pb-16 pt-32 md:px-8 md:pb-24 md:pt-40">
          <motion.p
            className="font-mono text-[11px] uppercase tracking-[0.28em] text-neon-cyan/90"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur }}
          >
            A library of decision stories
          </motion.p>
          <motion.h1
            className="mt-5 max-w-[16ch] font-display text-[clamp(2.8rem,7vw,5.6rem)] font-semibold leading-[0.94] tracking-[-0.04em] text-white"
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, delay: 0.08 }}
          >
            Interactive Decision Storytelling
          </motion.h1>
          <motion.p
            className="mt-7 max-w-xl text-base leading-relaxed text-white/70 md:text-lg"
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, delay: 0.16 }}
          >
            One system, many decisions. Each story takes a hard question, the
            evidence around it, and a model, and leaves a reader with a cut
            they can follow alone. When Rates Rise is the reference. It is not
            the only story this index is for.
          </motion.p>
          <motion.div
            className="mt-10"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: dur, delay: 0.28 }}
          >
            <a
              href="#stories"
              className="focus-ring inline-flex items-center gap-3 border border-white/20 bg-white/[0.06] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-white transition-colors hover:border-neon-cyan/50 hover:bg-neon-cyan/10"
            >
              The stories
              <span aria-hidden className="text-neon-cyan">
                ↓
              </span>
            </a>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-12">
        <h2 className="max-w-[22ch] font-display text-[clamp(1.8rem,3.5vw,2.8rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
          Every story takes the same path.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/60">
          The subject changes. A rates book, a build-or-buy choice, an
          affordability question — the reader still moves from the question,
          through evidence they can tell apart, to a decision.
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

      <section id="stories" className="scroll-mt-24 border-t border-white/10">
        <div className="mx-auto max-w-5xl px-5 py-16 md:px-8 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-[clamp(1.8rem,3.5vw,2.8rem)] font-semibold tracking-[-0.03em] text-white">
              Stories
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
              {stories.length === 1 ? "1 published" : `${stories.length} published`}
            </p>
          </div>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/60">
            Published work lives in this list. A reference story shows the
            form. The next story is another decision, added here when it is
            ready to read.
          </p>

          {stories.length > 0 ? (
            <ul className="mt-12 divide-y divide-white/10 border-y border-white/10">
              {stories.map((story) => {
                const links = storyLinks(story.slug);
                return (
                  <li key={story.slug} className="py-8">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neon-cyan/80">
                        {story.role === "reference" ? "Reference" : "Story"}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                        {story.date}
                      </p>
                    </div>
                    <h3 className="mt-3 font-display text-3xl text-white md:text-4xl">
                      <Link
                        href={links[0]?.href ?? `/stories/${story.slug}`}
                        className="focus-ring hover:text-neon-cyan"
                      >
                        {story.title}
                      </Link>
                    </h3>
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/65">
                      {story.question ?? story.summary}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em]">
                      {links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="focus-ring text-white/55 hover:text-neon-cyan"
                        >
                          {link.label} →
                        </Link>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-12 border-y border-white/10 py-10 text-white/50">
              No story is published yet. The index fills as decisions are ready
              to read.
            </p>
          )}
        </div>
      </section>

      <p className="mx-auto max-w-5xl px-5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35 md:px-8">
        <Link href="/lab/atmospheres" className="focus-ring hover:text-neon-cyan">
          Atmosphere lab
        </Link>
        <span className="mx-2 text-white/20">·</span>
        motifs for the system, shared across stories
      </p>
    </div>
  );
}
