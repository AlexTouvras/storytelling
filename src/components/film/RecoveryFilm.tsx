"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DelayFieldModel } from "@/lib/sim/delay-field";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { recoveryBeatAt, recoveryFrameAt } from "@/components/film/recovery-frame";
import { FilmSubtitleBar } from "@/components/film/FilmSubtitle";
import { RECOVERY_ATTRIBUTION, recoveryCopyFor } from "@/components/film/recovery-copy";
import type { DelayDrawContext } from "@/components/film/draw-delays";
import { DelayField } from "@/components/film/DelayField";
import { SeasonPanel } from "@/components/film/SeasonPanel";
import { ReaderShell } from "@/components/reader/ReaderShell";
import { OrientationCard } from "@/components/reader/OrientationCard";
import { MethodLink } from "@/components/reader/MethodLink";
import type { StoryReader } from "@/stories/schemas/manifest";
import pack from "../../../data/figures/where-should-the-recovery-time-sit.v1.json";

type Props = {
  slug: string;
  reader: StoryReader;
  model: DelayFieldModel;
};

function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function RecoveryFilm({ slug, reader, model }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const reduced = usePrefersReducedMotion();
  const reducedRef = useRef(reduced);
  const [progress, setProgress] = useState(0);
  const [lineIndex, setLineIndex] = useState(model.focusLineIndex);

  const drawContext = useMemo<DelayDrawContext>(() => {
    const packLine = pack.lines[lineIndex] ?? pack.lines[0];
    const band = (points: typeof packLine.survival) =>
      points.map((point) => ({
        median: point.median,
        low: point.low,
        high: point.high,
      }));
    return {
      lineIndex,
      survival: band(packLine.survival),
      survivalByService: [
        band(pack.survival.by_category.Commuter),
        band(pack.survival.by_category["Long-distance"]),
      ],
    };
  }, [lineIndex]);
  const contextRef = useRef(drawContext);

  /**
   * Top of the narration, in stage pixels, so the canvas can stop above it.
   *
   * The stage used to end at a fixed share of viewport height. The narration's
   * height is roughly fixed in *pixels* — a kicker, a heading, three paragraphs —
   * so the two collide below some viewport height, and at 1280×720 they did: the
   * margin bars were drawn straight through "WHERE THE SLACK IS". Measuring it is
   * the only way to know, since the height depends on which beat's copy is up and
   * how it wrapped.
   *
   * Measured on resize rather than per frame, so no frame reads layout.
   */
  const copyRef = useRef<HTMLDivElement>(null);
  const copyTopRef = useRef(Number.POSITIVE_INFINITY);

  useEffect(() => {
    const el = copyRef.current;
    if (!el) return;
    const stage = el.closest("[data-testid='film-stage']");
    if (!stage) return;
    const measure = () => {
      copyTopRef.current =
        el.getBoundingClientRect().top - stage.getBoundingClientRect().top;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

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

  /**
   * A strip that scrolls can hold the reader's own line out of sight — the focus
   * line is the third of seven, which on a phone starts off the right edge, so the
   * beat would open with no visible selection. Centred by hand rather than with
   * `scrollIntoView`, which is also allowed to scroll the page vertically and would
   * fight the scroll the whole film is driven by.
   */
  const pickerRef = useRef<HTMLDivElement>(null);
  const showPicker = frame.picker > 0.25;

  useEffect(() => {
    if (!showPicker) return;
    const strip = pickerRef.current;
    const pressed = strip?.querySelector<HTMLElement>("[aria-pressed='true']");
    if (!strip || !pressed) return;
    strip.scrollLeft = pressed.offsetLeft - (strip.clientWidth - pressed.offsetWidth) / 2;
  }, [lineIndex, showPicker]);

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
    <ReaderShell slug={slug} reader={reader} beat={beat} className="bg-void text-white">
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
        <OrientationCard slug={slug} orientation={reader.orientation} className="mt-12" />
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
            copyTopRef={copyTopRef}
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

          {showPicker ? (
            // Seven Finnish line names need about 1,290px, so they wrapped onto a
            // second row on a 1280 laptop and onto four on a phone — landing on the
            // survival curve either way. The picker has to sit above the canvas, not
            // on it, so it is one row at every width that scrolls sideways when it
            // has to. `mx-auto` on the inner track centres it when there is room and
            // leaves it scrollable from the start when there is not, which
            // `justify-center` on the scroller itself would not: that clips the
            // first buttons out of reach.
            <div
              ref={pickerRef}
              data-testid="line-picker"
              className="no-scrollbar absolute inset-x-0 top-3 z-10 flex snap-x overflow-x-auto px-5"
              style={{ opacity: frame.picker }}
            >
              <div className="mx-auto flex shrink-0 gap-2">
                {model.lines.map((line, index) => (
                  <button
                    key={line.id}
                    type="button"
                    onClick={() => setLineIndex(index)}
                    aria-pressed={index === lineIndex}
                    className={`focus-ring shrink-0 snap-start rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                      index === lineIndex
                        ? "border-neon-cyan/70 bg-neon-cyan/10 text-white"
                        : "border-white/15 text-white/55 hover:border-white/35 hover:text-white/80"
                    }`}
                  >
                    {line.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ opacity: body }}>
            <FilmSubtitleBar
              barRef={copyRef}
              kicker={copy.kicker}
              title={copy.title}
              paragraphs={copy.paragraphs}
              beat={beat}
              slug={slug}
              kind={copy.kind}
              figure={copy.figure}
              figureNote={copy.figureNote}
              caveat={copy.caveat}
            />
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

      <p data-testid="attribution" className="mx-auto max-w-3xl px-5 pb-6 text-sm leading-relaxed text-white/45">
        {RECOVERY_ATTRIBUTION}. Not affiliated with, and not endorsed by, Fintraffic or any operator.
      </p>
      <MethodLink slug={slug} label="Method, limits and every line's tables" />
    </ReaderShell>
  );
}
