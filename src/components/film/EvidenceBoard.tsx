import pack from "../../../data/figures/when-rates-rise.v2.json";
import { pct } from "@/components/film/format";

const dti = pack.observed.find((row) => row.id === "sector-dti");
const housing = pack.observed.find((row) => row.id === "ces-housing-10-2");
const mortgagor = pack.observed.find((row) => row.id === "ces-mortgagor-12");
const wp = pack.calculatedPublished.find((row) => row.id === "wp3053-dsti");

const BARS = [
  { label: "Mortgagor housing costs", value: 12, display: "≈12%" },
  { label: "Housing costs, all households", value: 10.2, display: "+10.2%" },
  { label: "HICP prices", value: 5.5, display: "+5.5%" },
] as const;

type Props = {
  thinBefore: number;
  thinAfter: number;
  sleeve: number;
};

export function EvidenceBoard({ thinBefore, thinAfter, sleeve }: Props) {
  return (
    <section className="border-t border-white/10" data-testid="evidence-board">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/45">
          Reality check
        </p>
        <h2 className="mt-4 max-w-[18ch] font-display text-[clamp(2.2rem,5vw,4.2rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-white">
          The average improved.
          <span className="block text-white/45">The tail did not.</span>
        </h2>
        <div className="mt-8 max-w-2xl space-y-4 text-base leading-relaxed text-white/70 md:text-lg">
          <p>
            The book you just watched is illustrative. These figures are not.
            They are published euro-area numbers from the same hiking cycle, and
            they do not all point the same way.
          </p>
          <p>
            If you managed the portfolio off the average, the household sector
            looked safer: debt fell relative to income. If you looked at
            mortgagors under payment stress, the stressed share rose. Housing
            costs for people with mortgages also outran general prices.
          </p>
        </div>

        <div className="mt-14 grid gap-px bg-white/10 md:grid-cols-2">
          <figure className="bg-void px-1 py-8 md:px-8 md:py-10">
            <figcaption className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
              Observed · household debt-to-income
            </figcaption>
            <p className="mt-6 font-display text-[clamp(3rem,6vw,4.5rem)] leading-none tracking-[-0.04em] text-white">
              92.8
              <span className="mx-3 text-white/30">→</span>
              87.0
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">
              Percent of income. The euro-area household sector delevered.
            </p>
            {dti ? (
              <a
                href={dti.url}
                className="focus-ring mt-5 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-neon-cyan/80"
              >
                ECB sector accounts, 2022 Q4–2023 Q4
              </a>
            ) : null}
          </figure>
          <figure className="bg-void px-1 py-8 md:px-8 md:py-10">
            <figcaption className="font-mono text-[10px] uppercase tracking-[0.18em] text-neon-violet/80">
              Calculated · ECB Working Paper 3053
            </figcaption>
            <p className="mt-6 font-display text-[clamp(3rem,6vw,4.5rem)] leading-none tracking-[-0.04em] text-white">
              26
              <span className="mx-3 text-neon-violet">→</span>
              33
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">
              Share of mortgagors with debt service above 40% of income. A
              published simulation — the same direction as this book, not the
              same metric.
            </p>
            {wp ? (
              <a
                href={wp.url}
                className="focus-ring mt-5 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-neon-cyan/80"
              >
                ECB WP 3053
              </a>
            ) : null}
          </figure>
        </div>

        <div className="mt-16 max-w-xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
            Observed · ECB Consumer Expectations Survey, Jul 2022–Jan 2024
          </p>
          <ul className="mt-6 space-y-4">
            {BARS.map((bar) => (
              <li key={bar.label}>
                <div className="flex items-baseline justify-between gap-4 font-mono text-xs text-white/70">
                  <span>{bar.label}</span>
                  <span className="text-white">{bar.display}</span>
                </div>
                <div className="mt-2 h-px bg-white/10">
                  <div
                    className="h-px bg-neon-cyan"
                    style={{ width: `${(bar.value / 12) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-white/45">
            Housing costs for people with mortgages outran general prices.
            {housing && mortgagor ? " Both figures are from the CES focus box." : ""}
          </p>
        </div>

        <div className="mt-14 max-w-2xl space-y-4 text-base leading-relaxed text-white/65">
          <p>
            Read the two big figures as a disagreement, not as a tie-break. Debt
            to income is an observed sector average. The 26 to 33 is a published
            simulation of borrowers whose debt service exceeds 40% of income. It
            is not this book’s 6% buffer, and it is not loan-level European data.
          </p>
          <p>
            The rhyme is the direction. In the modelled book, thin residual
            income moves {pct(thinBefore)} → {pct(thinAfter)} of balances, the
            same way the published stressed share rose. The decision quantity is
            narrower than either average:{" "}
            <span className="text-white">{pct(sleeve)}</span> is floating and
            already thin. A manager watching only the debt-to-income ratio would
            have called this period a relief.
          </p>
        </div>
      </div>
    </section>
  );
}
