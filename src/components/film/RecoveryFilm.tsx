"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DelayFieldModel } from "@/lib/sim/delay-field";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { recoveryBeatAt, recoveryFrameAt } from "@/components/film/recovery-frame";
import {
  RECOVERY_ATTRIBUTION,
  RECOVERY_LIMITATIONS,
  recoveryCopyFor,
} from "@/components/film/recovery-copy";
import type { DelayDrawContext } from "@/components/film/draw-delays";
import { DelayField } from "@/components/film/DelayField";
import { SeasonPanel } from "@/components/film/SeasonPanel";
import pack from "../../../data/figures/where-should-the-recovery-time-sit.v1.json";

type Props = {
  model: DelayFieldModel;
};

function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

const BADGE_LABEL = {
  observed: "observed",
  calculated: "calculated",
  modelled: "modelled",
  illustrative: "illustrative",
} as const;

export function RecoveryFilm({ model }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const reduced = usePrefersReducedMotion();
  const reducedRef = useRef(reduced);
  const [progress, setProgress] = useState(0);
  const [lineIndex, setLineIndex] = useState(model.focusLineIndex);

  const drawContext = useMemo<DelayDrawContext>(() => {
    const packLine = pack.lines[lineIndex] ?? pack.lines[0];
    return {
      lineIndex,
      survival: packLine.survival.map((point) => point.median),
      survivalByService: [
        pack.survival.by_category.Commuter.map((point) => point.median),
        pack.survival.by_category["Long-distance"].map((point) => point.median),
      ],
    };
  }, [lineIndex]);
  const contextRef = useRef(drawContext);

  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  useEffect(() => {
    contextRef.current = drawContext;
  }, [drawContext]);

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

  const frame = recoveryFrameAt(progress, reduced);
  const beat = recoveryBeatAt(progress);
  const copy = recoveryCopyFor(beat, {
    budget: frame.budget,
    lineId: model.lines[lineIndex]?.id,
  });
  const intro = clamp01(1 - progress / 0.045);
  const body = clamp01((progress - 0.05) / 0.03);

  useEffect(() => {
    const node = document.getElementById("film-status");
    if (!node) return;
    node.textContent = `${copy.kicker}. ${copy.title} ${copy.paragraphs.join(" ")}`;
  }, [copy.kicker, copy.title, copy.paragraphs]);

  return (
    <div className="bg-void text-white">
      <a
        href="#the-margin"
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
          For someone allocating recovery margin
        </p>
        <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,3.4rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-white">
          A delay is not an event. It is a thing that travels.
        </h2>
        <div className="mt-8 space-y-5 text-base leading-relaxed text-white/70 md:text-lg">
          <p>
            A timetable spends a fixed budget of recovery margin — minutes of
            scheduled run time above what a leg actually takes. Those minutes buy
            punctuality and cost journey time, and they are paid on every train,
            every day of the timetable period.
          </p>
          <p>
            What follows is a year of Finnish arrivals: {pack.coverage.runs.toLocaleString("en-GB")}{" "}
            passenger runs, every scheduled and actual time at every stop. The
            marks you scroll are a seeded picture of the mechanism. Every published
            figure comes from the frozen evidence pack and carries its own label.
          </p>
        </div>
      </section>

      <div ref={trackRef} data-testid="recovery-film" className="relative h-[1400vh]">
        <div
          data-testid="film-stage"
          data-beat={beat}
          className="sticky top-0 h-dvh overflow-hidden"
        >
          <DelayField
            model={model}
            contextRef={contextRef}
            progressRef={progressRef}
            reducedRef={reducedRef}
            frameAtProgress={recoveryFrameAt}
            className="absolute inset-0 h-full w-full"
          />

          <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-white/10" aria-hidden>
            <div className="w-px bg-neon-cyan" style={{ height: `${progress * 100}%` }} />
          </div>

          <SeasonPanel strength={frame.season} months={pack.seasonality.per_month} />

          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
            style={{ opacity: intro }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-neon-cyan/85">
              A year of arrivals
            </p>
            <h1
              data-testid="film-title"
              className="mt-5 max-w-[13ch] font-display text-[clamp(2.8rem,7.5vw,6.2rem)] font-semibold leading-[0.92] tracking-[-0.045em] text-white"
            >
              Why don&rsquo;t delays die?
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/60 md:text-lg">
              Scroll a network down to one line, one train, and the minutes the
              timetable leaves for a delay to die in.
            </p>
            <div className="mt-12 h-14 w-px bg-gradient-to-b from-white/80 to-transparent" />
          </div>

          {frame.picker > 0.25 ? (
            <div
              data-testid="line-picker"
              className="absolute inset-x-0 top-20 z-10 flex flex-wrap justify-center gap-2 px-5"
              style={{ opacity: frame.picker }}
            >
              {model.lines.map((line, index) => (
                <button
                  key={line.id}
                  type="button"
                  onClick={() => setLineIndex(index)}
                  aria-pressed={index === lineIndex}
                  className={`focus-ring rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                    index === lineIndex
                      ? "border-neon-cyan/70 bg-neon-cyan/10 text-white"
                      : "border-white/15 text-white/55 hover:border-white/35 hover:text-white/80"
                  }`}
                >
                  {line.label}
                </button>
              ))}
            </div>
          ) : null}

          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-void via-void/90 to-transparent px-5 pb-10 pt-28 md:px-10"
            style={{ opacity: body }}
          >
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div data-testid="beat-copy" className="max-w-xl">
                <div className="flex items-center gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon-cyan/75">
                    {copy.kicker}
                  </p>
                  {copy.kind ? (
                    <span
                      data-testid="beat-badge"
                      className="rounded-full border border-white/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/55"
                    >
                      {BADGE_LABEL[copy.kind]}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
                  {copy.title}
                </h2>
                <div className="mt-3 space-y-2 text-sm leading-relaxed text-white/65 md:text-base">
                  {copy.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 28)}>{paragraph}</p>
                  ))}
                </div>
                {copy.caveat ? (
                  <p
                    data-testid="beat-caveat"
                    className="mt-3 border-l border-white/15 pl-3 text-xs leading-relaxed text-white/45"
                  >
                    {copy.caveat}
                  </p>
                ) : null}
              </div>
              {copy.figure ? (
                <div className="shrink-0 md:text-right">
                  <p
                    data-testid="hero-figure"
                    className="font-display text-5xl font-semibold tracking-[-0.04em] text-neon-cyan md:text-6xl"
                  >
                    {copy.figure}
                  </p>
                  {copy.figureNote ? (
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
                      {copy.figureNote}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <section id="the-margin" data-testid="the-margin" className="mx-auto max-w-3xl px-5 py-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan/80">
          Decision
        </p>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
          Put the margin where delay survives, and treat commuter as a second
          decision
        </h2>
        <div className="mt-8 space-y-5 text-base leading-relaxed text-white/70 md:text-lg">
          {recoveryCopyFor(10, { lineId: model.lines[lineIndex]?.id }).paragraphs.map(
            (paragraph) => (
              <p key={paragraph.slice(0, 28)}>{paragraph}</p>
            ),
          )}
        </div>
      </section>

      <details className="mx-auto max-w-3xl px-5 pb-28 text-sm text-white/55">
        <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.16em] text-white/40">
          Method, limits and attribution
        </summary>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed">
          {RECOVERY_LIMITATIONS.map((line) => (
            <li key={line}>{line}</li>
          ))}
          <li>{RECOVERY_ATTRIBUTION}</li>
          <li>
            Not affiliated with, and not endorsed by, Fintraffic or any operator.
          </li>
          <li>
            Decision Spec:{" "}
            <code className="text-white/70">docs/decision-specs/rail-recovery-time.md</code>
          </li>
          <li>
            Evidence frozen {pack.generated} · {pack.id} · window{" "}
            {pack.method.window.first} → {pack.method.window.last}
          </li>
        </ul>
      </details>
    </div>
  );
}
