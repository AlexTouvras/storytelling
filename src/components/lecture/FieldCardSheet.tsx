import type { FieldCard } from "@/lectures/schemas/fieldCard";

/**
 * The card, reprinted from the frozen source the lecture reads.
 *
 * The deck above is paced; this is the dense sheet you keep open during a design
 * review, and it is set like one — tight rules, tabular rows, no emphasis it has
 * not earned. Both come out of one file, which is the point: the lecture cannot
 * teach a layer the card has dropped, and the card cannot gain a row the lecture
 * silently ignores.
 */
export function FieldCardSheet({ card }: { card: FieldCard }) {
  return (
    <section
      id="the-card"
      data-testid="field-card-sheet"
      className="border-t border-rule bg-paper px-5 py-20 text-ink"
    >
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-steel">
          {card.eyebrow}
        </p>
        <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight tracking-[-0.01em] md:text-[2.4rem]">
          {card.headline}
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
          {card.lede}
        </p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
          {card.verbs}
        </p>

        <div className="mt-14 grid gap-14 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Problem → use → example
            </h3>
            <table className="mt-4 w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-rule-strong">
                  <th className="py-2 pr-3 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                    If the real problem is…
                  </th>
                  <th className="py-2 pr-3 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                    Use
                  </th>
                  <th className="py-2 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                    Example case
                  </th>
                </tr>
              </thead>
              <tbody>
                {card.decisions.map((row) => (
                  <tr key={row.problem} className="border-b border-rule align-top">
                    <td className="py-3 pr-3 text-ink-soft">{row.problem}</td>
                    <td className="py-3 pr-3">
                      <a
                        href={row.href}
                        className="focus-ring-ink font-mono text-xs font-semibold uppercase tracking-[0.06em] text-steel underline decoration-steel/35 underline-offset-4"
                      >
                        {row.use}
                      </a>
                    </td>
                    <td className="py-3 text-ink-muted">{row.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              {card.buildOrder}
            </p>
          </div>

          <div className="space-y-12">
            <div>
              <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                The layers
              </h3>
              <dl className="mt-4 space-y-3 text-sm">
                {card.layers.map((layer) => (
                  <div key={layer.code} className="flex gap-3">
                    <dt className="w-16 shrink-0 font-mono text-xs font-semibold uppercase tracking-[0.06em] text-steel">
                      {layer.code}
                    </dt>
                    <dd className="text-ink-soft">{layer.job}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                Ladder + gates
              </h3>
              <ol className="mt-4 space-y-2 text-sm text-ink-soft">
                {card.ladder.map((rung, index) => (
                  <li key={rung} className="flex gap-3">
                    <span className="font-mono text-xs font-semibold text-steel">
                      {index + 1}
                    </span>
                    {rung}
                  </li>
                ))}
              </ol>
              <p className="mt-4 border-l-2 border-warn bg-warn-wash px-3 py-2.5 text-sm text-ink-soft">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-warn">
                  Kill switch
                </span>
                <br />
                {card.killSwitch}
              </p>
            </div>

            <div>
              <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                Framework picker
              </h3>
              <dl className="mt-4 space-y-2 text-sm">
                {card.frameworks.map((framework) => (
                  <div key={framework.name} className="flex flex-wrap gap-x-3">
                    <dt className="font-mono text-xs text-ink">
                      <a
                        href={framework.href}
                        className="focus-ring-ink underline decoration-rule-strong underline-offset-4"
                      >
                        {framework.name}
                      </a>
                    </dt>
                    <dd className="text-ink-muted">{framework.fit}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-10 border-t border-rule pt-10 md:grid-cols-3">
          {card.behavior.map((panel) => (
            <div key={panel.title}>
              <h3 className="text-sm font-semibold text-ink">{panel.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {panel.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-10 border-t border-rule pt-10 md:grid-cols-2">
          <div>
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Anti-patterns
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-ink-soft">
              {card.antiPatterns.map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden className="text-warn">
                    ×
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Always on
            </h3>
            <dl className="mt-4 space-y-3 text-sm">
              {card.alwaysOn.map((item) => (
                <div key={item.label} className="flex gap-3">
                  <dt className="w-28 shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink">
                    {item.label}
                  </dt>
                  <dd className="text-ink-muted">{item.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <details className="mt-14 border-t border-rule pt-8 text-sm text-ink-muted">
          <summary className="focus-ring-ink cursor-pointer font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Provenance and limits
          </summary>
          <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed">
            <li>
              Card {card.version}, reviewed {card.reviewed}. Frozen from{" "}
              <code className="text-ink-soft">
                {card.source.repo}@{card.source.commit.slice(0, 7)}
              </code>{" "}
              on {card.source.extractedAt} ({card.source.method}).
            </li>
            <li>
              The deck asserts nothing beyond the card. Each section declares the
              card rows it teaches and the build fails on a row that no longer
              exists — but the pacing, the exhibits, and the speaker notes are
              editorial.
            </li>
            <li>
              System names in the exhibits (ERP, Jira, ledger, Stripe) are the
              card&rsquo;s own example nouns. They are illustrative, not a
              reference architecture.
            </li>
            <li>
              Published card:{" "}
              <a
                href={card.source.live}
                className="focus-ring-ink text-steel underline underline-offset-4"
              >
                {card.source.live}
              </a>
            </li>
          </ul>
        </details>
      </div>
    </section>
  );
}
