"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FieldModel } from "@/lib/sim/book-field";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { frameAt, beatAt } from "@/components/film/frame";
import { LoanField } from "@/components/film/LoanField";
import { CashColumn, CashMeter } from "@/components/film/CashColumn";
import { Instrument } from "@/components/film/Instrument";
import { EvidenceBoard } from "@/components/film/EvidenceBoard";
import { eur, lerp, pct } from "@/components/film/format";

type Props = {
  model: FieldModel;
};

function clamp01(n: number) {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function RateFilm({ model }: Props) {
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

  const frame = frameAt(progress, model.featured, reduced);
  const beat = beatAt(progress);
  const featured = model.featured;
  const payment = lerp(
    featured.paymentBefore,
    featured.paymentAfter,
    frame.featuredShock,
  );
  const buffer = featured.incomeMonthly - featured.essentialsMonthly - payment;
  const sleeve = model.summary.actionableSlice.floatingThinBalanceShare;
  const thinBefore = model.summary.before.thinBalanceShare;
  const thinAfter = model.summary.after.thinBalanceShare;
  const rest = 1 - sleeve;
  const copy = copyFor(beat, model);
  const figure = figureFor(beat, buffer, thinBefore, thinAfter, sleeve);
  const intro = clamp01(1 - progress / 0.09);
  const body = clamp01((progress - 0.1) / 0.045);
  const showCash = frame.focusY > 0.62;

  useEffect(() => {
    const node = document.getElementById("film-status");
    if (!node) return;
    const spoken = copyFor(beat, model);
    node.textContent = `${spoken.kicker}. ${spoken.title} ${spoken.detail}`;
  }, [beat, model]);

  return (
    <div className="bg-void text-white">
      <a
        href="#the-cut"
        className="focus-ring sr-only left-4 top-20 z-50 bg-void px-3 py-2 font-mono text-xs uppercase tracking-wider text-white focus:not-sr-only focus:fixed"
      >
        Skip to the decision
      </a>
      <p id="film-status" className="sr-only" aria-live="polite" />

      <div ref={trackRef} data-testid="rate-film" className="relative h-[680vh]">
        <div
          data-testid="film-stage"
          data-beat={beat}
          className="sticky top-0 h-dvh overflow-hidden"
        >
          <LoanField
            model={model}
            progressRef={progressRef}
            reducedRef={reducedRef}
            frameAtProgress={frameAt}
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
              A portfolio decision
            </p>
            <h1
              data-testid="film-title"
              className="mt-5 max-w-[12ch] font-display text-[clamp(3.1rem,8.4vw,7.4rem)] font-semibold leading-[0.9] tracking-[-0.045em] text-white"
            >
              Where do you cut when rates rise?
            </h1>
            <p className="mt-6 max-w-sm text-base text-white/60 md:text-lg">
              Everyone watches the policy rate. The risk is a sleeve inside the book.
            </p>
            <div className="mt-12 h-14 w-px bg-gradient-to-b from-white/80 to-transparent" />
          </div>

          <div
            className="pointer-events-none absolute left-5 right-5 top-20 max-w-md md:left-10 md:top-24"
            style={{ opacity: body }}
          >
            <div className="absolute -inset-x-6 -inset-y-8 -z-10 bg-[radial-gradient(ellipse_at_left,oklch(0.12_0.025_264)_20%,transparent_72%)]" />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon-cyan/80">
              {copy.kicker}
            </p>
            <h2 className="mt-3 font-display text-[clamp(1.7rem,3vw,2.7rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
              {copy.title}
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/65 md:text-base">
              {copy.detail}
            </p>
            {showCash ? (
              <CashMeter
                className="max-w-sm md:hidden"
                income={featured.incomeMonthly}
                essentials={featured.essentialsMonthly}
                payment={payment}
              />
            ) : null}
          </div>

          {showCash ? (
            <div
              className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 md:block"
              style={{ opacity: clamp01((frame.focusY - 0.62) / 0.25) }}
            >
              <CashColumn
                income={featured.incomeMonthly}
                essentials={featured.essentialsMonthly}
                payment={payment}
              />
            </div>
          ) : null}

          <div
            className="pointer-events-none absolute inset-x-5 bottom-6 flex flex-col gap-5 md:inset-x-10 md:flex-row md:items-end md:justify-between"
            style={{ opacity: body }}
          >
            <p data-testid="hero-figure">
              <span
                className={
                  figure.value.length > 8
                    ? `block font-mono text-[clamp(2.1rem,5.2vw,4.4rem)] leading-none tracking-[-0.04em] ${beat <= 2 && buffer < 180 ? "text-neon-violet" : "text-white"}`
                    : `block font-mono text-[clamp(3.2rem,8vw,6.6rem)] leading-none tracking-[-0.05em] ${beat <= 2 && buffer < 180 ? "text-neon-violet" : "text-white"}`
                }
              >
                {figure.value}
              </span>
              <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                {figure.unit}
              </span>
            </p>
            {frame.cut > 0.04 ? (
              <div
                className="md:w-[min(46%,420px)]"
                style={{ opacity: frame.cut }}
                data-testid="cut-bar"
              >
                <div className="flex h-2.5 overflow-hidden">
                  <div className="h-full bg-white/25" style={{ width: pct(rest) }} />
                  <div className="h-full bg-neon-violet" style={{ width: pct(sleeve) }} />
                </div>
                <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
                  <span>Outside {pct(rest)}</span>
                  <span className="text-neon-violet">Watch {pct(sleeve)}</span>
                </div>
              </div>
            ) : null}
          </div>

          {beat >= 3 ? (
            <p
              className="pointer-events-none absolute bottom-28 right-5 hidden font-mono text-[10px] uppercase tracking-[0.16em] text-white/35 md:block"
              style={{ opacity: body * (1 - frame.cut) }}
            >
              <span className="mr-3 inline-block h-1.5 w-1.5 rounded-full bg-neon-cyan" />
              Fixed
              <span className="ml-4 mr-3 inline-block h-1.5 w-1.5 rounded-full bg-neon-violet" />
              Floating
            </p>
          ) : null}
        </div>
      </div>

      <Instrument base={model} />
      <EvidenceBoard thinBefore={thinBefore} thinAfter={thinAfter} sleeve={sleeve} />

      <section id="the-cut" className="border-t border-white/10" data-testid="decision">
        <div className="mx-auto max-w-3xl px-5 py-24 md:py-32">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-violet/90">
            The decision
          </p>
          <h2 className="mt-4 font-display text-[clamp(2.4rem,5.5vw,4.6rem)] font-semibold leading-[0.96] tracking-[-0.035em] text-white">
            Size the watchlist from the sleeve, not the policy rate.
          </h2>
          <p className="mt-8 text-lg leading-relaxed text-white/70">
            In this modelled book that sleeve is{" "}
            <span className="text-white">{pct(sleeve)}</span> of unpaid
            principal: floating-rate balances with less than 6% of income left
            after essentials and the mortgage.
          </p>
          <ol className="mt-10 space-y-4 text-white/80">
            <li className="flex gap-4">
              <span className="font-mono text-neon-cyan">01</span>
              Reset dates inside that sleeve.
            </li>
            <li className="flex gap-4">
              <span className="font-mono text-neon-cyan">02</span>
              The buffer after the next reset — not the overnight print.
            </li>
            <li className="flex gap-4">
              <span className="font-mono text-neon-cyan">03</span>
              Names that were already short of room.{" "}
              {pct(model.summary.concentration.newThinFromBottomTercileShare)}{" "}
              of newly thin accounts sat in the weakest third before the shock.
            </li>
          </ol>
          <p className="mt-10 text-sm text-white/40">
            Modelled example, seed 42, 2,000 loans. Not a real portfolio and not
            credit advice.
          </p>
          <div className="mt-8 flex flex-wrap gap-6 font-mono text-[11px] uppercase tracking-[0.16em]">
            <Link href="/stories/when-rates-rise" className="focus-ring text-neon-cyan">
              Essay version
            </Link>
            <a href="#method" className="focus-ring text-white/50">
              Method
            </a>
          </div>
        </div>
      </section>

      <section id="method" className="border-t border-white/10">
        <div className="mx-auto max-w-3xl px-5 py-12">
          <details className="group">
            <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">
              What this picture is
            </summary>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-white/55">
              <p>
                The cloud is an illustrative mortgage book: 2,000 amortising
                loans, seed 42, about 35% floating by unpaid balance. Floating
                status is given to the largest balances until that share is met.
                A +300 basis point shock reprices floating coupons only. Thin
                means residual income — after essentials and the mortgage —
                under 6% of income. That cutoff was chosen so the thin share
                rhymes with ECB Working Paper 3053’s rise in borrowers above
                40% debt service (26% to 33%). It is not that metric, and it is
                not a regulatory definition.
              </p>
              <p>
                Scroll blends the calm snapshot into the shocked snapshot. The
                sliders recompute each payment from the amortising formula.
                Loan {featured.id} is one floating name in that book: income{" "}
                {eur(featured.incomeMonthly)}, buffer {eur(featured.bufferBefore)}{" "}
                before the shock and {eur(featured.bufferAfter)} after.
              </p>
              <p>
                Observed figures are the ECB sector accounts and the Consumer
                Expectations Survey. They are not outputs of this book. Nothing
                here is loan-level European data.
              </p>
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}

function copyFor(beat: number, model: FieldModel) {
  const featured = model.featured;
  const thinBefore = pct(model.summary.before.thinBalanceShare);
  const thinAfter = pct(model.summary.after.thinBalanceShare);
  const sleeve = pct(model.summary.actionableSlice.floatingThinBalanceShare);
  const rest = pct(1 - model.summary.actionableSlice.floatingThinBalanceShare);

  switch (beat) {
    case 1:
      return {
        kicker: `Loan ${featured.id} · floating · ${eur(featured.balance)} unpaid`,
        title: "This one still has room.",
        detail: `${eur(featured.incomeMonthly)} comes in each month. Essentials and the mortgage still leave a buffer.`,
      };
    case 2:
      return {
        kicker: "The coupon steps up 300 bp",
        title: "The payment eats the buffer.",
        detail: "Same household. What disappears is the residual, not an abstract risk score.",
      };
    case 3:
      return {
        kicker: "Seed 42 · illustrative book",
        title: "Now the rest of the book.",
        detail:
          "Across is residual income. Up is unpaid balance. The line is 6% of income left.",
      };
    case 4:
      return {
        kicker: "Fixed coupons do not move",
        title: "Only the floating loans travel.",
        detail: `Thin balances go from ${thinBefore} to ${thinAfter}. Watch who crosses the line.`,
      };
    case 5:
      return {
        kicker: "Floating and already thin",
        title: "This is the sleeve.",
        detail: `${sleeve} of unpaid balance can still reprice and is already short of room.`,
      };
    default:
      return {
        kicker: "Where you cut",
        title: "Not the overnight rate.",
        detail: `The watchlist is this sleeve. ${rest} of balances sit outside it.`,
      };
  }
}

function figureFor(
  beat: number,
  buffer: number,
  thinBefore: number,
  thinAfter: number,
  sleeve: number,
) {
  if (beat <= 2) {
    return { value: eur(buffer), unit: "left this month" };
  }
  if (beat === 3) {
    return { value: "2,000", unit: "modelled mortgages" };
  }
  if (beat === 4) {
    return {
      value: `${pct(thinBefore)} → ${pct(thinAfter)}`,
      unit: "thin share of balances",
    };
  }
  return { value: pct(sleeve), unit: "of balances · floating and thin" };
}
