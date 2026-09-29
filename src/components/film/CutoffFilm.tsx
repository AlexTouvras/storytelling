"use client";

import { useEffect, useRef, useState } from "react";
import type { AppFieldModel } from "@/lib/sim/app-field";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { cutoffBeatAt, cutoffFrameAt, CUTOFF_BEAT_STARTS } from "@/components/film/cutoff-frame";
import { beatLocal, cueIndex, subtitleCues } from "@/components/film/subtitles";
import { AppField } from "@/components/film/AppField";
import { CutoffInstrument } from "@/components/film/CutoffInstrument";
import { CutoffEvidenceBoard } from "@/components/film/CutoffEvidenceBoard";
import { cutoffCopyFor, cutoffFigureFor } from "@/components/film/cutoff-copy";
import { FilmSubtitleBar } from "@/components/film/FilmSubtitle";
import { ReaderShell } from "@/components/reader/ReaderShell";
import { OrientationCard } from "@/components/reader/OrientationCard";
import { MethodLink } from "@/components/reader/MethodLink";
import type { StoryReader } from "@/stories/schemas/manifest";
import pack from "../../../data/figures/where-should-the-cutoff-sit.v1.json";

type Props = {
  slug: string;
  reader: StoryReader;
  model: AppFieldModel;
};

function clamp01(n: number) {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function CutoffFilm({ slug, reader, model }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const reduced = usePrefersReducedMotion();
  const reducedRef = useRef(reduced);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      const total = el.offsetHeight - window.innerHeight;
      const scrolled = -el.getBoundingClientRect().top;
      const p = total <= 0 ? 0 : clamp01(scrolled / total);
      progressRef.current = p;
      setProgress(p);
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
  }, []);

  const frame = cutoffFrameAt(progress, reduced);
  const beat = cutoffBeatAt(progress);
  const copy = cutoffCopyFor(beat);
  const cues = subtitleCues(copy.paragraphs);
  const cue = cueIndex(beatLocal(progress, CUTOFF_BEAT_STARTS), cues.length);
  const titleCard = cutoffCopyFor(0);
  const figure = cutoffFigureFor(beat);
  const intro = clamp01(1 - progress / 0.08);
  const body = clamp01((progress - 0.09) / 0.04);

  useEffect(() => {
    const node = document.getElementById("film-status");
    if (!node) return;
    const spoken = cutoffCopyFor(beat);
    const lines = subtitleCues(spoken.paragraphs);
    const line = lines[cueIndex(beatLocal(progress, CUTOFF_BEAT_STARTS), lines.length)] ?? "";
    node.textContent = `${spoken.title}. ${line}`;
  }, [beat, progress]);

  return (
    <ReaderShell slug={slug} reader={reader} beat={beat} className="bg-void text-white">
      <a
        href="#the-cut"
        className="focus-ring sr-only left-4 top-20 z-50 bg-void px-3 py-2 font-mono text-xs uppercase tracking-wider text-white focus:not-sr-only focus:fixed"
      >
        Skip to the decision
      </a>
      <p id="film-status" className="sr-only" aria-live="polite" />

      <section
        data-testid="film-prologue"
        className="mx-auto max-w-3xl px-5 pb-8 pt-28 md:pt-36"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan/80">
          For someone setting a retail cut-off
        </p>
        <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,3.4rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-white">
          Ranking skill is not the same thing as a gate you can ship.
        </h2>
        <div className="mt-8 space-y-5 text-base leading-relaxed text-white/70 md:text-lg">
          <p>
            Credit risk teams can argue all day about Gini. The decision that
            clears a book is coarser: given how much bad rate you will tolerate
            among the people you approve, how far down the PD scale do you go?
          </p>
          <p>
            That point sits on an acceptance frontier. Youden / max-KS will
            often suggest a different place than a budgeted appetite. External
            bureau-style scores draw a weaker frontier than a calibrated
            champion.
          </p>
          <p>
            What follows uses a Home Credit sample scorecard already built for
            the portfolio. The cloud you scrub is a seeded picture of that
            logic. Published OOT approval, bad rate, and Gini come from the
            frozen evidence pack — labeled calculated, not a live IRB book.
          </p>
        </div>
        <OrientationCard slug={slug} orientation={reader.orientation} className="mt-12" />
      </section>

      <div
        ref={trackRef}
        data-testid="cutoff-film"
        className="relative h-[1120vh]"
      >
        <div
          data-testid="film-stage"
          data-beat={beat}
          className="sticky top-0 h-dvh overflow-hidden"
        >
          <AppField
            model={model}
            progressRef={progressRef}
            reducedRef={reducedRef}
            frameAtProgress={cutoffFrameAt}
            className="absolute inset-0 h-full w-full"
          />

          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-px bg-white/10"
            aria-hidden
          >
            <div
              className="w-px bg-neon-cyan"
              style={{ height: `${progress * 100}%` }}
            />
          </div>

          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
            style={{ opacity: intro }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-neon-cyan/85">
              {titleCard.kicker}
            </p>
            <h1
              data-testid="film-title"
              className="mt-5 max-w-[14ch] font-display text-[clamp(2.8rem,7.5vw,6.2rem)] font-semibold leading-[0.92] tracking-[-0.045em] text-white"
            >
              {titleCard.title}
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/60 md:text-lg">
              {titleCard.paragraphs[0]}
            </p>
            <div className="mt-12 h-14 w-px bg-gradient-to-b from-white/80 to-transparent" />
          </div>

          <div style={{ opacity: body }}>
            <FilmSubtitleBar
              kicker={copy.kicker}
              title={copy.title}
              paragraphs={copy.paragraphs}
              cue={cue}
              beat={beat}
              slug={slug}
              kind={copy.kind}
              figure={figure}
            />
          </div>
        </div>
      </div>

      <CutoffInstrument model={model} />
      <CutoffEvidenceBoard />

      <section
        id="the-cut"
        data-testid="the-cut"
        className="mx-auto max-w-3xl px-5 py-24"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan/80">
          Decision
        </p>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
          Set PD ≤ {pack.policy.operating.display.cutoffPd} under a{" "}
          {pack.policy.appetite.display} bad-rate appetite
        </h2>
        <div className="mt-8 space-y-5 text-base leading-relaxed text-white/70 md:text-lg">
          <p>
            On this sample champion, that operating gate clears about{" "}
            {pack.policy.operating.display.approval} of OOT applications while
            holding bad rate among approved near{" "}
            {pack.policy.operating.display.badAmongApproved}. Youden sits
            tighter (~{pack.policy.youdenReference.display.cutoffPd}) and buys
            less volume.
          </p>
          <p>
            After go-live, watch OOT bad rate among approved and PSI on the IVs
            that built the score. Do not steer the book from Train Gini alone.
          </p>
        </div>
      </section>

      <MethodLink slug={slug} label="Method, limits and the full model tables" />
    </ReaderShell>
  );
}
