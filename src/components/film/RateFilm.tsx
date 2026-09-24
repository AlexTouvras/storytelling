"use client";

import { useEffect, useRef, useState } from "react";
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
    node.textContent = `${spoken.kicker}. ${spoken.title} ${spoken.paragraphs.join(" ")}`;
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

      <section
        data-testid="film-prologue"
        className="mx-auto max-w-3xl px-5 pb-8 pt-28 md:pt-36"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan/80">
          For someone watching a mortgage book
        </p>
        <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,3.4rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-white">
          The policy rate is the number everyone quotes. It is not where you cut.
        </h2>
        <div className="mt-8 space-y-5 text-base leading-relaxed text-white/70 md:text-lg">
          <p>
            When rates rise, the commentary follows the print. A portfolio
            manager still has to decide which balances to watch. The rate
            reaches a household only if that loan’s coupon can reprice. The
            monthly payment goes up. What is left after essentials and the
            mortgage — the buffer — is the cash that can absorb the hit.
          </p>
          <p>
            Fixed-rate borrowers do not feel this hike in their payment.
            Floating-rate borrowers do. Two households with the same coupon
            shock can end in different places, because one started with room
            and the other did not.
          </p>
          <p>
            The picture that follows is a modelled book of 2,000 mortgages,
            built so the path can be replayed. It is a way to see where
            pressure concentrates. It is not a forecast, not a census of the
            euro area, and not credit advice. Euro-area figures come after the
            model, as a check on whether the direction is real.
          </p>
        </div>
        <dl className="mt-12 grid gap-8 border-t border-white/10 pt-8 sm:grid-cols-3">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-neon-cyan/80">
              Buffer
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-white/65">
              Monthly income left after essentials and the mortgage payment.
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-neon-violet/80">
              Floating
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-white/65">
              A coupon that can reprice when market rates move. A fixed coupon
              stays where it is.
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">
              Thin
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-white/65">
              Residual income under 6% of income. A teaching line for this
              story, not a regulatory definition.
            </dd>
          </div>
        </dl>
      </section>

      <div ref={trackRef} data-testid="rate-film" className="relative h-[1040vh]">
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
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/60 md:text-lg">
              Scroll follows one floating mortgage, then every loan in the
              book. The cut is the group whose payment can still rise and whose
              cash is already thin.
            </p>
            <div className="mt-12 h-14 w-px bg-gradient-to-b from-white/80 to-transparent" />
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[52%] bg-gradient-to-b from-void from-25% via-void/95 to-transparent md:hidden"
            style={{ opacity: body }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 hidden w-[min(100%,38rem)] bg-gradient-to-r from-void from-[22%] via-void/95 to-transparent md:block"
            style={{ opacity: body }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-void via-void/85 to-transparent"
            style={{ opacity: body }}
          />

          <div
            className="pointer-events-none absolute left-5 right-5 top-20 max-w-md md:left-10 md:top-24"
            style={{ opacity: body }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon-cyan/80">
              {copy.kicker}
            </p>
            <h2 className="mt-3 font-display text-[clamp(1.7rem,3vw,2.7rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
              {copy.title}
            </h2>
            <div
              data-testid="beat-copy"
              className="mt-3 max-w-md space-y-3 text-sm leading-relaxed text-white/70 md:text-[15px]"
            >
              {copy.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
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
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-white/70">
            <p>
              In this modelled book the sleeve is{" "}
              <span className="text-white">{pct(sleeve)}</span> of unpaid
              principal: floating-rate balances with less than 6% of income
              left after essentials and the mortgage. The other{" "}
              {pct(1 - sleeve)} either cannot reprice, or still has more room
              than that line.
            </p>
            <p>
              Cutting on the overnight rate treats every loan as the same
              exposure. Cutting on “thin” alone includes fixed-rate names whose
              payment will not move because of this hike. The sleeve is the
              intersection: the coupon can still change, and the household is
              already close to the wall.
            </p>
          </div>
          <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
            What to watch inside that sleeve
          </p>
          <ol className="mt-4 space-y-5 text-white/80">
            <li className="flex gap-4">
              <span className="font-mono text-neon-cyan">01</span>
              <span>
                Reset dates. A floating loan that does not reprice for years is
                not the same problem as one that resets this quarter.
              </span>
            </li>
            <li className="flex gap-4">
              <span className="font-mono text-neon-cyan">02</span>
              <span>
                The buffer after the next payment change. The policy print is
                upstream. The residual is the quantity that got smaller.
              </span>
            </li>
            <li className="flex gap-4">
              <span className="font-mono text-neon-cyan">03</span>
              <span>
                Names that were already short of room.{" "}
                {pct(model.summary.concentration.newThinFromBottomTercileShare)}{" "}
                of the accounts that became thin were already in the weakest
                third of buffers before the shock. The hike mostly found
                households that had little slack.
              </span>
            </li>
          </ol>
          <p className="mt-10 text-sm text-white/40">
            Modelled example, seed 42, 2,000 loans. Not a real portfolio and not
            credit advice.
          </p>
          <div className="mt-8 flex flex-wrap gap-6 font-mono text-[11px] uppercase tracking-[0.16em]">
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
  const income = eur(featured.incomeMonthly);
  const balance = eur(featured.balance);
  const bufferBefore = eur(featured.bufferBefore);
  const paymentBefore = eur(featured.paymentBefore);
  const paymentAfter = eur(featured.paymentAfter);

  switch (beat) {
    case 1:
      return {
        kicker: `Loan ${featured.id} · floating · ${balance} unpaid`,
        title: "This one still has room.",
        paragraphs: [
          `Loan ${featured.id} is one floating-rate mortgage in the model, with ${balance} still unpaid. ${income} comes in each month. Essentials take their share, the payment is ${paymentBefore}, and ${bufferBefore} is left. That remainder is the buffer.`,
          "The dot is this loan. Left means less residual income. The line you are moving toward is the teaching cut: under 6% of income left. This loan is still to the right of it.",
        ],
      };
    case 2:
      return {
        kicker: "The coupon steps up 300 basis points",
        title: "The payment eats the buffer.",
        paragraphs: [
          `A 300 basis point rise is three percentage points on the coupon. Only this loan’s rate changes. The payment moves from ${paymentBefore} to ${paymentAfter}. Essentials and income stay put, so the buffer is what shrinks.`,
          "Nothing abstract was added to the household. Euros that used to be left over now go to the mortgage. When the dot crosses the line, residual income is under 6%.",
        ],
      };
    case 3:
      return {
        kicker: "Seed 42 · illustrative book",
        title: "Now the rest of the book.",
        paragraphs: [
          "That loan is one name. The cloud is 2,000 amortising mortgages, generated from a fixed seed so the same picture can be replayed. About 35% of unpaid balance is floating. In this model the largest balances are made floating first — a choice, not a census.",
          "Across is residual income, more room to the right. Up is unpaid balance, so larger loans sit higher. Cyan is a fixed coupon. Violet can still reprice. The line is still 6% of income left.",
        ],
      };
    case 4:
      return {
        kicker: "Fixed coupons do not move",
        title: "Only the floating loans travel.",
        paragraphs: [
          "The same 300 basis point shock now hits every floating loan. Fixed coupons stay on their old payment, which is why the cyan dots do not move. A parallel rate move is not a parallel risk move.",
          `The share of balances under the line goes from ${thinBefore} to ${thinAfter}. Most of the book is still fine. The useful question is which balances crossed, and whether “thin” is already the right watchlist.`,
        ],
      };
    case 5:
      return {
        kicker: "Floating and already thin",
        title: "This is the sleeve.",
        paragraphs: [
          "Thin on its own mixes two kinds of loan. Some were already short of room and are fixed: this hike does not change their payment. The balances that matter for a rate shock are the ones that can still reprice and are already under the line.",
          `In this book that sleeve is ${sleeve} of unpaid principal. The dimmed dots are outside it. What stays bright is the watchlist.`,
        ],
      };
    default:
      return {
        kicker: "Where you cut",
        title: "Not the overnight rate.",
        paragraphs: [
          `The overnight rate is common to the whole book, so it cannot tell you where to look. ${rest} of balances sit outside the sleeve. The cut starts with the ${sleeve} that are floating and already thin.`,
          "From there the work is ordinary credit work: when those coupons reset, what the buffer is after the new payment, and which names were already in the weakest third before the hike.",
        ],
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
