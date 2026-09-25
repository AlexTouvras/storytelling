"use client";

import { useEffect, useRef, useState } from "react";
import type { AppFieldModel } from "@/lib/sim/app-field";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { cutoffBeatAt, cutoffFrameAt } from "@/components/film/cutoff-frame";
import { AppField } from "@/components/film/AppField";
import { CutoffInstrument } from "@/components/film/CutoffInstrument";
import { CutoffEvidenceBoard } from "@/components/film/CutoffEvidenceBoard";
import pack from "../../../data/figures/where-should-the-cutoff-sit.v1.json";

type Props = {
  model: AppFieldModel;
};

function clamp01(n: number) {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

type Copy = {
  kicker: string;
  title: string;
  paragraphs: string[];
};

function copyFor(beat: number): Copy {
  const op = pack.policy.operating.display;
  switch (beat) {
    case 1:
      return {
        kicker: "One file",
        title: "Decide with what you know now",
        paragraphs: [
          "An application arrives with features available at decision time. Income, bureau history, contract type — not the future default.",
          "The yes/no has to be made before TARGET is known. That is the whole job.",
        ],
      };
    case 2:
      return {
        kicker: "Score → PD",
        title: "A rank becomes a probability",
        paragraphs: [
          `The champion (${pack.source.champion}) turns the file into a calibrated PD and a grade band.`,
          "Tagged calculated. Sample model, not an IRB pack.",
        ],
      };
    case 3:
      return {
        kicker: "The book",
        title: "Many files, one shape",
        paragraphs: [
          `The working cloud holds ${pack.sample.display.sampleN} marks from a ${pack.sample.display.fullN}-application history. Observed default rate ${pack.sample.display.defaultRate}.`,
          "Horizontal position is PD. The camera stays on the same marks as the story widens.",
        ],
      };
    case 4:
      return {
        kicker: "The frontier",
        title: "Volume versus risk is a curve",
        paragraphs: [
          "Every PD gate buys a different approval rate and a different bad rate among the approved.",
          "Youden / max-KS picks a statistical peak. Appetite picks a book you can live with.",
        ],
      };
    case 5:
      return {
        kicker: "Move the gate",
        title: `Operating cut: PD ≤ ${op.cutoffPd}`,
        paragraphs: [
          `Maximise OOT approval subject to bad among approved ≤ ${pack.policy.appetite.display}. That lands at PD ≤ ${op.cutoffPd}.`,
          `Approved marks stay lit. Rejected marks dim. Same field — policy is a filter.`,
        ],
      };
    case 6:
      return {
        kicker: "Out of time",
        title: "Pay for the gate on OOT",
        paragraphs: [
          `At the operating cut: approval ${op.approval}, bad among approved ${op.badAmongApproved}. OOT Gini ${pack.model.display.ootGini}.`,
          `Calibration ${pack.model.display.calib}. Mid-50s time-OOT Gini is honest for this public feature set.`,
        ],
      };
    case 7:
      return {
        kicker: "After go-live",
        title: "Watch the book, not Train Gini",
        paragraphs: [
          "Once the gate is set, steer on OOT bad rate among approved and PSI on the drivers that built the score.",
          "A pretty Train Gini with a drifting IV is a story that already failed.",
        ],
      };
    default:
      return {
        kicker: "Origination policy",
        title: "Where should the cut-off sit?",
        paragraphs: [
          "Under a volume need and a bad-rate appetite, the gate is a policy point on an acceptance frontier.",
        ],
      };
  }
}

function figureFor(beat: number): string | null {
  const op = pack.policy.operating.display;
  if (beat === 5 || beat === 6) return op.cutoffPd;
  if (beat === 7) return op.approval;
  if (beat === 3) return pack.sample.display.defaultRate;
  return null;
}

export function CutoffFilm({ model }: Props) {
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
  const copy = copyFor(beat);
  const figure = figureFor(beat);
  const intro = clamp01(1 - progress / 0.08);
  const body = clamp01((progress - 0.09) / 0.04);

  useEffect(() => {
    const node = document.getElementById("film-status");
    if (!node) return;
    const spoken = copyFor(beat);
    node.textContent = `${spoken.kicker}. ${spoken.title} ${spoken.paragraphs.join(" ")}`;
  }, [beat]);

  return (
    <div className="bg-void text-white">
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
        <dl className="mt-12 grid gap-8 border-t border-white/10 pt-8 sm:grid-cols-3">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-neon-cyan/80">
              PD
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-white/65">
              Probability of default from the champion scorecard at decision
              time.
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-neon-violet/80">
              Gate
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-white/65">
              Approve when PD is at or below the cut. Everything else is a
              reject or a referral rule you design later.
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">
              Appetite
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-white/65">
              Illustrative bad-rate budget among approved accounts (
              {pack.policy.appetite.display} here).
            </dd>
          </div>
        </dl>
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
              An origination decision
            </p>
            <h1
              data-testid="film-title"
              className="mt-5 max-w-[14ch] font-display text-[clamp(2.8rem,7.5vw,6.2rem)] font-semibold leading-[0.92] tracking-[-0.045em] text-white"
            >
              Where should the cut-off sit?
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/60 md:text-lg">
              Scroll one application into a PD, then the book, then a gate set
              by appetite — paid for on out-of-time data.
            </p>
            <div className="mt-12 h-14 w-px bg-gradient-to-b from-white/80 to-transparent" />
          </div>

          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-void via-void/90 to-transparent px-5 pb-10 pt-28 md:px-10"
            style={{ opacity: body }}
          >
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div data-testid="beat-copy" className="max-w-xl">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon-cyan/75">
                  {copy.kicker}
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
                  {copy.title}
                </h2>
                <div className="mt-3 space-y-2 text-sm leading-relaxed text-white/65 md:text-base">
                  {copy.paragraphs.map((p) => (
                    <p key={p.slice(0, 24)}>{p}</p>
                  ))}
                </div>
              </div>
              {figure ? (
                <p
                  data-testid="hero-figure"
                  className="font-display text-5xl font-semibold tracking-[-0.04em] text-neon-cyan md:text-6xl"
                >
                  {figure}
                </p>
              ) : null}
            </div>
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

      <details className="mx-auto max-w-3xl px-5 pb-28 text-sm text-white/55">
        <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.16em] text-white/40">
          Method and limits
        </summary>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed">
          {pack.limitations.map((line) => (
            <li key={line}>{line}</li>
          ))}
          <li>
            Decision Spec:{" "}
            <code className="text-white/70">{pack.decisionSpec}</code>
          </li>
          <li>
            Evidence frozen {pack.frozenAt} · {pack.id}
          </li>
        </ul>
      </details>
    </div>
  );
}
