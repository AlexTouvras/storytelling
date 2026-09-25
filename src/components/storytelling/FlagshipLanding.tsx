"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { LandingField } from "@/components/storytelling/LandingField";
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
    body: "What someone has to decide. The story opens there.",
  },
  {
    n: "02",
    title: "Evidence",
    body: "Observed, calculated, or modelled — labeled, and kept apart.",
  },
  {
    n: "03",
    title: "Decision",
    body: "A cut to leave with, and a clear view of what it leaves out.",
  },
] as const;

function storyHref(slug: string) {
  if (slug === "when-rates-rise") return "/stories/when-rates-rise/film";
  return `/stories/${slug}`;
}

function fadeFor(progress: number) {
  const t = Math.min(1, Math.max(0, (progress - 0.16) / 0.16));
  return 1 - t * t * (3 - 2 * t);
}

function stageFor(progress: number) {
  if (progress < 0.16) return "field";
  if (progress < 0.42) return "zoom";
  if (progress < 0.74) return "vortex";
  return "horizon";
}

/**
 * The field stays up for the whole page. Copy arrives on the stage it belongs to:
 * the path while the camera commits to one lane, the stories as warp falls off
 * into the new horizon.
 */
export function FlagshipLanding({ stories }: Props) {
  const reduced = usePrefersReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const reducedRef = useRef(reduced);
  const titleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || reduced) {
      progressRef.current = 0;
      if (titleRef.current) {
        titleRef.current.style.opacity = "1";
        titleRef.current.style.transform = "none";
      }
      return;
    }
    let raf = 0;
    const update = () => {
      const total = el.offsetHeight - window.innerHeight;
      const scrolled = -el.getBoundingClientRect().top;
      const p = total <= 0 ? 0 : Math.min(1, Math.max(0, scrolled / total));
      progressRef.current = p;
      el.dataset.stage = stageFor(p);
      const fade = fadeFor(p);
      if (titleRef.current) {
        titleRef.current.style.opacity = String(fade);
        titleRef.current.style.transform = `translate3d(0, ${-Math.min(p, 0.35) * 40}px, 0)`;
      }
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced]);

  return (
    <div className={`overflow-x-hidden ${reduced ? "bg-void pb-20" : "pb-8"}`}>
      <div ref={trackRef} data-testid="landing-track" className="relative z-0 overflow-x-hidden">
        <div
          className={
            reduced
              ? "relative h-dvh overflow-hidden"
              : "sticky top-0 z-0 h-dvh overflow-hidden"
          }
        >
          <LandingField progressRef={progressRef} reducedRef={reducedRef} />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-void/80 to-transparent"
          />
          <div
            ref={titleRef}
            className="pointer-events-none relative z-10 flex h-full items-end"
          >
            <div className="mx-auto w-full max-w-5xl px-5 pb-[16vh] md:px-8">
              <div className="relative w-fit max-w-full overflow-hidden">
                <div
                  aria-hidden
                  className="absolute -inset-x-4 -inset-y-6 -z-10 bg-void/75 blur-2xl md:-inset-x-12 md:-inset-y-8 md:blur-3xl"
                />
                <h1
                  aria-label="Interactive Decision Storytelling"
                  className="text-gradient max-w-[11ch] font-display text-[clamp(3.2rem,8.2vw,6.6rem)] font-semibold leading-[0.9] tracking-[-0.045em]"
                >
                  <span className="block">Interactive</span>
                  <span className="block">Decision</span>
                  <span className="block">Storytelling</span>
                </h1>
              </div>
            </div>
          </div>
        </div>

        <div className={reduced ? "relative z-20 overflow-x-hidden bg-void" : "relative z-20 overflow-x-hidden"}>
          {reduced ? null : <div className="h-[78vh]" aria-hidden />}

          <section className="relative overflow-x-hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-void/75 via-void/35 to-transparent"
            />
            <div className="relative mx-auto max-w-5xl overflow-hidden px-5 py-16 md:px-8 md:py-24">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 -inset-y-10 -z-10 bg-void/80 blur-2xl md:-inset-x-8"
              />
              <h2 className="max-w-[16ch] font-display text-[clamp(1.8rem,3.5vw,2.8rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
                Every story takes the same path.
              </h2>
              <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
                {PATH.map((step) => (
                  <li key={step.n} className="border-t border-white/15 pt-5">
                    <p className="font-mono text-[11px] tracking-[0.18em] text-neon-cyan/80">
                      {step.n}
                    </p>
                    <h3 className="mt-3 font-display text-2xl text-white">{step.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/60">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {reduced ? null : <div className="h-[70vh]" aria-hidden />}

          <section id="stories" className="relative scroll-mt-24 overflow-x-hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-void/80 via-void/40 to-transparent"
            />
            <div className="relative mx-auto max-w-5xl overflow-hidden px-5 py-16 md:px-8 md:py-20">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 -inset-y-10 -z-10 bg-void/82 blur-2xl md:-inset-x-8"
              />
              <h2 className="font-display text-[clamp(1.8rem,3.5vw,2.8rem)] font-semibold tracking-[-0.03em] text-white">
                Stories
              </h2>
              {stories.length > 0 ? (
                <ul className="mt-10 divide-y divide-white/10 border-y border-white/10">
                  {stories.map((story) => (
                    <li key={story.slug}>
                      <Link
                        href={storyHref(story.slug)}
                        aria-label={story.title}
                        className="focus-ring group block py-8"
                      >
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neon-cyan/80">
                            {story.role === "reference" ? "Reference" : "Story"}
                          </p>
                          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                            {story.date}
                          </p>
                        </div>
                        <h3 className="mt-3 font-display text-3xl text-white group-hover:text-neon-cyan md:text-4xl">
                          {story.title}
                        </h3>
                        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/65">
                          {story.question ?? story.summary}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-10 text-white/50">No story is published yet.</p>
              )}
            </div>
          </section>

          {reduced ? null : <div className="h-[28vh]" aria-hidden />}
        </div>
      </div>
    </div>
  );
}
