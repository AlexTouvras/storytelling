import type { FieldCard } from "@/lectures/schemas/fieldCard";

/**
 * The card, reprinted from the frozen source the lecture reads.
 *
 * The briefing above is paced; this is the dense sheet you keep open during a
 * design review. Both come out of one file, which is the point: the lecture
 * cannot teach a layer the card has dropped, and the card cannot gain a row the
 * lecture silently ignores.
 */
export function FieldCardSheet({ card }: { card: FieldCard }) {
  return (
    <section
      id="the-card"
      data-testid="field-card-sheet"
      className="border-t border-white/10 bg-void-800/40 px-5 py-20"
    >
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan/80">
          {card.eyebrow}
        </p>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
          {card.headline}
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">
          {card.lede}
        </p>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-white/40">
          {card.verbs}
        </p>

        <div className="mt-14 grid gap-14 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">
              Problem → use → example
            </h3>
            <table className="mt-4 w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/12">
                  <th className="py-2 pr-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">
                    If the real problem is…
                  </th>
                  <th className="py-2 pr-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">
                    Use
                  </th>
                  <th className="py-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">
                    Example case
                  </th>
                </tr>
              </thead>
              <tbody>
                {card.decisions.map((row) => (
                  <tr key={row.problem} className="border-b border-white/8 align-top">
                    <td className="py-3 pr-3 text-white/80">{row.problem}</td>
                    <td className="py-3 pr-3">
                      <a
                        href={row.href}
                        className="focus-ring font-mono text-xs uppercase tracking-[0.08em] text-neon-cyan underline decoration-neon-cyan/40 underline-offset-4"
                      >
                        {row.use}
                      </a>
                    </td>
                    <td className="py-3 text-white/55">{row.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-sm leading-relaxed text-white/50">
              {card.buildOrder}
            </p>
          </div>

          <div className="space-y-12">
            <div>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">
                The layers
              </h3>
              <dl className="mt-4 space-y-3 text-sm">
                {card.layers.map((layer) => (
                  <div key={layer.code} className="flex gap-3">
                    <dt className="w-16 shrink-0 font-mono text-xs uppercase tracking-[0.08em] text-neon-cyan">
                      {layer.code}
                    </dt>
                    <dd className="text-white/65">{layer.job}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">
                Ladder + gates
              </h3>
              <ol className="mt-4 space-y-2 text-sm text-white/70">
                {card.ladder.map((rung, index) => (
                  <li key={rung} className="flex gap-3">
                    <span className="font-mono text-xs text-neon-cyan/70">
                      {index + 1}
                    </span>
                    {rung}
                  </li>
                ))}
              </ol>
              <p className="mt-4 rounded-lg border border-amber-400/25 bg-amber-400/5 p-3 text-sm text-white/70">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber-300/80">
                  Kill switch
                </span>
                <br />
                {card.killSwitch}
              </p>
            </div>

            <div>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">
                Framework picker
              </h3>
              <dl className="mt-4 space-y-2 text-sm">
                {card.frameworks.map((framework) => (
                  <div key={framework.name} className="flex flex-wrap gap-x-3">
                    <dt className="font-mono text-xs text-white/80">
                      <a
                        href={framework.href}
                        className="focus-ring underline decoration-white/25 underline-offset-4"
                      >
                        {framework.name}
                      </a>
                    </dt>
                    <dd className="text-white/50">{framework.fit}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-10 border-t border-white/10 pt-10 md:grid-cols-3">
          {card.behavior.map((panel) => (
            <div key={panel.title}>
              <h3 className="text-sm font-semibold text-white">{panel.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                {panel.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-10 border-t border-white/10 pt-10 md:grid-cols-2">
          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">
              Anti-patterns
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-white/65">
              {card.antiPatterns.map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden className="text-amber-400/70">
                    ×
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">
              Always on
            </h3>
            <dl className="mt-4 space-y-3 text-sm">
              {card.alwaysOn.map((item) => (
                <div key={item.label} className="flex gap-3">
                  <dt className="w-28 shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] text-white/60">
                    {item.label}
                  </dt>
                  <dd className="text-white/55">{item.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <details className="mt-14 border-t border-white/10 pt-8 text-sm text-white/55">
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.16em] text-white/40">
            Provenance and limits
          </summary>
          <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed">
            <li>
              Card {card.version}, reviewed {card.reviewed}. Frozen from{" "}
              <code className="text-white/70">
                {card.source.repo}@{card.source.commit.slice(0, 7)}
              </code>{" "}
              on {card.source.extractedAt} ({card.source.method}).
            </li>
            <li>
              The lecture asserts nothing beyond the card. Each beat declares the
              card rows it teaches and the build fails on a row that no longer
              exists — but the pacing, the diagram, and the speaker notes are
              editorial.
            </li>
            <li>
              System names on the board (ERP, Jira, ledger, Stripe) are the
              card&rsquo;s own example nouns. They are illustrative, not a
              reference architecture.
            </li>
            <li>
              Published card:{" "}
              <a href={card.source.live} className="focus-ring text-neon-cyan underline underline-offset-4">
                {card.source.live}
              </a>
            </li>
          </ul>
        </details>
      </div>
    </section>
  );
}
