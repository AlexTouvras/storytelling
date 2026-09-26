"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { buildLectureTimeline } from "@/components/lecture/lecture-frame";
import { LectureField } from "@/components/lecture/LectureField";
import { LectureBeatCopy } from "@/components/lecture/LectureBeatCopy";
import { LecturePresenter } from "@/components/lecture/LecturePresenter";
import { FieldCardSheet } from "@/components/lecture/FieldCardSheet";
import type { Lecture } from "@/lectures/load";

type Mode = "read" | "present";

function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/**
 * A field card, taught.
 *
 * The engine's films are pure functions of a progress value, and until now that
 * value only ever came from scroll position. A lecture wants two drivers, and
 * they cost almost nothing to have both of:
 *
 *   - **read** — the reader scrubs, exactly as in the decision films.
 *   - **present** — a clock scrubs at the manifest's own pace, full screen, with
 *     the speaker notes beside the board and beat keys under the presenter's
 *     hand. Same manifest, same cue table, same canvas.
 *
 * That is the feasibility claim this prototype exists to test: a scrubbed film
 * and a live talk are the same artifact with a different driver.
 */
export function LectureFilm({ lecture }: { lecture: Lecture }) {
  const { manifest, card } = lecture;
  const timeline = useMemo(() => buildLectureTimeline(manifest), [manifest]);
  const beatCopy = useMemo(
    () => new Map(manifest.beats.map((b) => [b.beat, b])),
    [manifest],
  );

  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const pendingScrollRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<Mode>("read");
  const [playing, setPlaying] = useState(false);

  const reduced = usePrefersReducedMotion();
  const reducedRef = useRef(reduced);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  const seek = useCallback((next: number) => {
    const p = clamp01(next);
    progressRef.current = p;
    setProgress(p);
  }, []);

  // Driver 1: scroll.
  useEffect(() => {
    if (mode !== "read") return;
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;

    const measure = () => {
      const total = el.offsetHeight - window.innerHeight;
      const scrolled = -el.getBoundingClientRect().top;
      return { total, scrolled };
    };

    const update = () => {
      const { total, scrolled } = measure();
      const p = total <= 0 ? 0 : clamp01(scrolled / total);
      progressRef.current = p;
      setProgress(p);
    };

    // Coming back from the podium, land on the beat that was on screen.
    const pending = pendingScrollRef.current;
    if (pending !== null) {
      pendingScrollRef.current = null;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const total = el.offsetHeight - window.innerHeight;
      window.scrollTo({ top: top + pending * Math.max(0, total), behavior: "instant" });
    }

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
  }, [mode]);

  // Driver 2: a clock, at the manifest's own pace.
  useEffect(() => {
    if (mode !== "present" || !playing) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = clamp01(progressRef.current + dt / manifest.presentSeconds);
      progressRef.current = next;
      // Quantised so the copy re-renders a few times a second, not 60.
      setProgress(Math.round(next * 2000) / 2000);
      if (next >= 1) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [mode, playing, manifest.presentSeconds]);

  useEffect(() => {
    if (mode !== "present") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mode]);

  const beat = timeline.beatAt(progress);
  const copy = beatCopy.get(beat) ?? manifest.beats[0];

  const goToBeat = useCallback(
    (target: number) => {
      const at = timeline.beatStarts[target];
      if (at === undefined) return;
      // A hair inside the beat, so the copy matches the board immediately.
      seek(Math.min(0.999, at + 0.001));
    },
    [seek, timeline],
  );

  const enterPresent = useCallback(() => {
    setMode("present");
    setPlaying(!reducedRef.current);
  }, []);

  const exitPresent = useCallback(() => {
    pendingScrollRef.current = progressRef.current;
    setPlaying(false);
    setMode("read");
  }, []);

  useEffect(() => {
    const node = document.getElementById("lecture-status");
    if (!node) return;
    node.textContent = `Beat ${beat}. ${copy.kicker}. ${copy.title} ${copy.paragraphs.join(" ")}`;
  }, [beat, copy]);

  const intro = clamp01(1 - progress / 0.055);
  const body = clamp01((progress - 0.05) / 0.035);

  const board = (
    <LectureField
      progressRef={progressRef}
      reducedRef={reducedRef}
      frameAtProgress={timeline.frameAt}
      className="absolute inset-0 h-full w-full"
    />
  );

  if (mode === "present") {
    return (
      <LecturePresenter
        manifest={manifest}
        beat={copy}
        beatNumber={beat}
        progress={progress}
        playing={playing}
        reduced={reduced}
        onTogglePlay={() => setPlaying((p) => !p)}
        onSeek={seek}
        onBeat={goToBeat}
        onExit={exitPresent}
      >
        {board}
      </LecturePresenter>
    );
  }

  return (
    <div className="bg-void text-white">
      <a
        href="#the-card"
        className="focus-ring sr-only left-4 top-20 z-50 bg-void px-3 py-2 font-mono text-xs uppercase tracking-wider text-white focus:not-sr-only focus:fixed"
      >
        Skip to the card
      </a>
      <p id="lecture-status" className="sr-only" aria-live="polite" />

      <section
        data-testid="lecture-prologue"
        className="mx-auto max-w-3xl px-5 pb-10 pt-28 md:pt-36"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan/80">
          {manifest.audience}
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-white">
          {manifest.title}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-white/70">{manifest.dek}</p>

        <div className="mt-8 space-y-5 text-base leading-relaxed text-white/65">
          <p>
            {card.card} is a one-page reference: eleven rows of problem, layer,
            and example, printed dense on purpose for someone who already has the
            vocabulary. This is the same material paced as a briefing — one idea
            per beat, in the order you should reach for them, with the diagram
            assembling itself as each layer arrives.
          </p>
          <p>
            Nothing here is asserted that the card does not already say. Every
            beat names the card rows it teaches, and the build fails if one of
            those rows changes out from under it.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="present-button"
            onClick={enterPresent}
            className="focus-ring rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.16em] text-neon-cyan transition hover:bg-neon-cyan/20"
          >
            Present it live
          </button>
          <a
            href={card.source.live}
            className="focus-ring rounded-full border border-white/15 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.16em] text-white/70 transition hover:border-white/35"
          >
            The card itself
          </a>
          <span className="font-mono text-[11px] text-white/40">
            {card.version} · reviewed {card.reviewed} · ~
            {Math.round(manifest.presentSeconds / 60)} min
          </span>
        </div>
      </section>

      <div
        ref={trackRef}
        data-testid="lecture-track"
        className="relative"
        style={{ height: `${manifest.trackVh}vh` }}
      >
        <div
          data-testid="film-stage"
          data-beat={beat}
          className="sticky top-0 h-dvh overflow-hidden"
        >
          {board}

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
              {manifest.kicker}
            </p>
            <h2
              data-testid="lecture-title"
              className="mt-5 max-w-[18ch] font-display text-[clamp(2.4rem,6.5vw,5.4rem)] font-semibold leading-[0.94] tracking-[-0.045em] text-white"
            >
              {manifest.title}
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/60 md:text-lg">
              {manifest.dek}
            </p>
            <div className="mt-10 h-14 w-px bg-gradient-to-b from-white/80 to-transparent" />
          </div>

          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-void via-void/90 to-transparent px-5 pb-10 pt-28 md:px-10"
            style={{ opacity: body }}
          >
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <LectureBeatCopy beat={copy} variant="read" />
              {copy.figure ? (
                <p
                  data-testid="beat-figure"
                  className="font-display text-4xl font-semibold tracking-[-0.04em] text-neon-cyan md:text-5xl"
                >
                  {copy.figure}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-3xl px-5 py-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan/80">
          {manifest.closing.kicker}
        </p>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
          {manifest.closing.title}
        </h2>
        <div className="mt-8 space-y-5 text-base leading-relaxed text-white/70 md:text-lg">
          {manifest.closing.paragraphs.map((p) => (
            <p key={p.slice(0, 28)}>{p}</p>
          ))}
        </div>
      </section>

      <FieldCardSheet card={card} />
    </div>
  );
}
