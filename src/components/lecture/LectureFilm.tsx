"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { buildLectureTimeline } from "@/components/lecture/lecture-frame";
import { LectureField } from "@/components/lecture/LectureField";
import { LectureSlide } from "@/components/lecture/LectureSlide";
import { LecturePresenter } from "@/components/lecture/LecturePresenter";
import { FieldCardSheet } from "@/components/lecture/FieldCardSheet";
import type { Lecture } from "@/lectures/load";

type Mode = "read" | "present";

function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/**
 * A field card, taught as a deck.
 *
 * The engine's films are pure functions of a progress value, and until now that
 * value only ever came from scroll position. A lecture wants two drivers, and
 * they cost almost nothing to have both of:
 *
 *   - **read** — the reader scrubs, exactly as in the decision films. One slide
 *     is on screen at a time; scrolling advances the exhibit on it.
 *   - **present** — a clock scrubs at the manifest's own pace, full screen, with
 *     the speaker notes beside the slide and beat keys under the presenter's
 *     hand. Same manifest, same cue table, same canvas.
 *
 * That is the feasibility claim this prototype exists to test: a scrubbed film
 * and a live talk are the same artifact with a different driver.
 */
export function LectureFilm({ lecture }: { lecture: Lecture }) {
  const { manifest, card } = lecture;
  const timeline = useMemo(() => buildLectureTimeline(manifest), [manifest]);
  const order = useMemo(
    () => [...manifest.beats].sort((a, b) => a.beat - b.beat),
    [manifest],
  );
  const beatCopy = useMemo(
    () => new Map(order.map((b, i) => [b.beat, { beat: b, index: i + 1 }])),
    [order],
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
  const current = useMemo(
    () => beatCopy.get(beat) ?? { beat: order[0], index: 1 },
    [beatCopy, beat, order],
  );

  const goToBeat = useCallback(
    (target: number) => {
      const at = timeline.beatStarts[target];
      if (at === undefined) return;
      // A hair inside the beat, so the copy matches the exhibit immediately.
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
    node.textContent = `Section ${current.index} of ${order.length}. ${current.beat.kicker}. ${current.beat.title} ${current.beat.paragraphs.join(" ")} So what: ${current.beat.takeaway}`;
  }, [current, order.length]);

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
        card={card}
        beat={current.beat}
        beatNumber={beat}
        index={current.index}
        total={order.length}
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
    <div className="bg-paper text-ink">
      <a
        href="#the-card"
        className="focus-ring sr-only left-4 top-20 z-50 bg-steel-deep px-3 py-2 font-mono text-xs uppercase tracking-wider text-white focus:not-sr-only focus:fixed"
      >
        Skip to the card
      </a>
      <p id="lecture-status" className="sr-only" aria-live="polite" />

      {/* The title slide. Deck covers are the one place the deck goes dark. */}
      <section
        data-testid="lecture-prologue"
        className="bg-steel-deep px-5 pb-16 pt-28 text-white md:pt-36"
      >
        <div className="mx-auto max-w-5xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-white/55">
            {manifest.kicker} · {card.version}
          </p>
          <h1
            data-testid="lecture-title"
            className="mt-5 max-w-[24ch] font-serif text-[clamp(2rem,4.6vw,3.4rem)] font-semibold leading-[1.08] tracking-[-0.015em]"
          >
            {manifest.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/70">
            {manifest.dek}
          </p>

          <dl className="mt-10 grid max-w-3xl gap-x-8 gap-y-4 border-t border-white/15 pt-6 sm:grid-cols-3">
            {[
              { k: "Prepared for", v: manifest.audience },
              { k: "Sections", v: `${order.length} exhibits` },
              {
                k: "Running time",
                v: `about ${Math.round(manifest.presentSeconds / 60)} minutes`,
              },
            ].map((item) => (
              <div key={item.k}>
                <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  {item.k}
                </dt>
                <dd className="mt-1.5 text-sm leading-snug text-white/80">
                  {item.v}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-testid="present-button"
              onClick={enterPresent}
              className="focus-ring bg-white px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-steel-deep transition hover:bg-white/90"
            >
              Present it live
            </button>
            <a
              href={card.source.live}
              className="focus-ring border border-white/30 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/80 transition hover:border-white/60"
            >
              The card itself
            </a>
          </div>

          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-white/50">
            {card.card} is a one-page reference: eleven rows of problem, layer and
            example, printed dense on purpose for someone who already has the
            vocabulary. What follows is the same material paced as a briefing —
            one idea per exhibit, in the order you should reach for them. Every
            section names the card rows it teaches, and the build fails if one of
            those rows changes out from under it.
          </p>
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
          className="sticky top-0 flex h-dvh items-center justify-center overflow-hidden bg-paper p-3 md:p-6"
        >
          {/* A slide has an aspect ratio. Portrait frames get the whole screen. */}
          <div className="flex h-full w-full max-w-[1180px] md:h-auto md:max-h-full md:aspect-[16/10]">
            <LectureSlide
              manifest={manifest}
              card={card}
              beat={current.beat}
              index={current.index}
              total={order.length}
              progress={progress}
              board={board}
              variant="read"
            />
          </div>
        </div>
      </div>

      <section className="border-t border-rule bg-paper-card px-5 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-steel">
            {manifest.closing.kicker}
          </p>
          <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight tracking-[-0.01em] text-ink md:text-[2.4rem]">
            {manifest.closing.title}
          </h2>
          <div className="mt-7 space-y-5 text-base leading-relaxed text-ink-soft">
            {manifest.closing.paragraphs.map((p) => (
              <p key={p.slice(0, 28)}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <FieldCardSheet card={card} />
    </div>
  );
}
