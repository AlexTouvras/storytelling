"use client";

import { useMemo, useState } from "react";
import { buildField, type FieldModel } from "@/lib/sim/book-field";
import { LoanField } from "@/components/film/LoanField";
import { pct } from "@/components/film/format";
import type { FilmFrame } from "@/components/film/frame";

const LIVE: FilmFrame = {
  beat: 5,
  featuredShock: 1,
  bookShock: 1,
  population: 1,
  sleeve: 1,
  line: 1,
  cut: 0,
  spanX: 0.72,
  cx: 0.1,
  focusY: 0,
};

type Props = {
  base: FieldModel;
};

export function Instrument({ base }: Props) {
  const [shock, setShock] = useState(base.summary.assumptions.shockBps);
  const [floating, setFloating] = useState(
    Math.round(base.summary.assumptions.floatingShareByBalance * 100),
  );

  const model = useMemo(() => {
    if (
      shock === base.summary.assumptions.shockBps &&
      floating === Math.round(base.summary.assumptions.floatingShareByBalance * 100)
    ) {
      return base;
    }
    return buildField(floating / 100, shock);
  }, [base, shock, floating]);

  const sleeve = model.summary.actionableSlice.floatingThinBalanceShare;
  const thinBefore = model.summary.before.thinBalanceShare;
  const thinAfter = model.summary.after.thinBalanceShare;

  return (
    <section className="border-t border-white/10" id="operate" data-testid="instrument">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:py-24">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan/80">
            Your turn
          </p>
          <h2 className="mt-4 max-w-[16ch] font-display text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-white">
            Move the shock. Change who can reprice.
          </h2>
          <p
            className="mt-6 max-w-md text-lg leading-snug text-white/70"
            data-testid="instrument-sentence"
          >
            A {shock}&nbsp;bp shock on a book that is {floating}% floating puts{" "}
            <span className="text-white">{pct(sleeve)}</span> of unpaid balance
            in the sleeve.
          </p>

          <div className="mt-10 space-y-7">
            <label className="block">
              <span className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-white/50">
                Rate shock
                <span className="text-white">{shock} bp</span>
              </span>
              <input
                className="mt-3 h-11 w-full cursor-pointer accent-white"
                data-testid="shock-slider"
                type="range"
                min={0}
                max={400}
                step={10}
                value={shock}
                onChange={(event) => setShock(Number(event.target.value))}
                aria-valuetext={`${shock} basis points`}
              />
            </label>
            <label className="block">
              <span className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-white/50">
                Floating share of balances
                <span className="text-white">{floating}%</span>
              </span>
              <input
                className="mt-3 h-11 w-full cursor-pointer accent-white"
                data-testid="float-slider"
                type="range"
                min={15}
                max={60}
                step={1}
                value={floating}
                onChange={(event) => setFloating(Number(event.target.value))}
                aria-valuetext={`${floating} percent floating`}
              />
            </label>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
                Thin share
              </dt>
              <dd className="mt-1 font-mono text-xl text-white">
                {pct(thinBefore)} → {pct(thinAfter)}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
                Sleeve
              </dt>
              <dd
                className="mt-1 font-mono text-xl text-neon-violet"
                data-testid="instrument-sleeve"
              >
                {pct(sleeve)}
              </dd>
            </div>
          </dl>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-white/40">
            Modelled book, seed 42, 2,000 loans. Floating status is assigned to
            the largest balances until the share is filled — a model choice, not
            a census. Thin means residual income under 6%. Dragging recomputes
            every payment.
          </p>
        </div>
        <div className="relative h-[min(62vh,560px)] overflow-hidden bg-[oklch(0.1_0.02_264)] ring-1 ring-white/10">
          <LoanField model={model} frame={LIVE} className="h-full w-full" />
          <p className="pointer-events-none absolute bottom-3 left-4 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
            Violet in the thin zone is the watchlist
          </p>
        </div>
      </div>
    </section>
  );
}
