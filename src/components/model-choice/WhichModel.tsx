"use client";

import { useMemo, useState } from "react";
import { ModelField } from "@/components/model-choice/ModelField";
import { KIND_INFO } from "@/lib/reader/kinds";
import { FORMULA_NOTES, formulaLine, recommendationCopy } from "@/lib/model-choice/copy";
import {
  countLabel,
  fetchedLabel,
  fitLabel,
  indexText,
  tokensLabel,
  usd,
  usdPerMillion,
} from "@/lib/model-choice/format";
import { WHICH_MODEL_PACK } from "@/lib/model-choice/pack";
import { retargetWeight, scoreWorkload } from "@/lib/model-choice/score";
import type { ScoredModel, WeightKey, WeightShares } from "@/lib/model-choice/types";
import { VOLUME_PRESETS, WORKLOADS, workloadById } from "@/lib/model-choice/workloads";

const WEIGHTS: { key: WeightKey; label: string }[] = [
  { key: "quality", label: "Quality" },
  { key: "cost", label: "Cost" },
  { key: "context", label: "Context" },
];

const OPENING = WORKLOADS[0];

function clampTokens(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(2_000_000, Math.max(1, Math.round(n)));
}

function listPrice(row: ScoredModel): string {
  const model = row.model;
  return `${usdPerMillion(model.promptPerToken)} / ${usdPerMillion(model.completionPerToken)} per 1M`;
}

export function WhichModel() {
  const pack = WHICH_MODEL_PACK;
  const [workloadId, setWorkloadId] = useState(OPENING.id);
  const [weights, setWeights] = useState<WeightShares>(OPENING.weights);
  const [inputTokens, setInputTokens] = useState(OPENING.inputTokens);
  const [outputTokens, setOutputTokens] = useState(OPENING.outputTokens);
  const [volume, setVolume] = useState(OPENING.volume);
  const [showAll, setShowAll] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const workload = workloadById(workloadId);
  const result = useMemo(
    () => scoreWorkload(pack.models, workload, weights, { inputTokens, outputTokens, volume }),
    [pack.models, workload, weights, inputTokens, outputTokens, volume],
  );
  const copy = useMemo(() => recommendationCopy(result), [result]);
  const shown = showAll ? result.rows : result.eligible.slice(0, 5);
  const byCost = useMemo(
    () => [...result.eligible].sort((a, b) => a.cost - b.cost),
    [result.eligible],
  );
  const maxCost = byCost.length ? byCost[byCost.length - 1].cost : 1;
  const leaderDifferent = result.qualityLeader != null && result.qualityLeader.model.id !== result.winner?.model.id;

  function selectWorkload(id: string) {
    const next = workloadById(id);
    setWorkloadId(id);
    setWeights(next.weights);
    setInputTokens(next.inputTokens);
    setOutputTokens(next.outputTokens);
    setVolume(next.volume);
    setShowAll(false);
    setActiveId(null);
  }

  function resetJob() {
    selectWorkload(workloadId);
  }

  return (
    <article className="mx-auto w-full max-w-6xl px-5 pb-20 pt-24 sm:px-8">
      <header className="max-w-3xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon-cyan">Decision instrument</p>
        <h1 className="mt-3 font-display text-4xl leading-[1.02] tracking-tight text-white sm:text-6xl">
          Which model?
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-snug text-white/75 sm:text-xl">
          The best model isn&apos;t the smartest one.
          <span className="mt-1 block text-white">It&apos;s the one that fits the job.</span>
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/60">
          {pack.models.length} models from the OpenRouter catalog on {fetchedLabel(pack.fetchedAt)}. Prices and
          Artificial Analysis indices are published there. The score beside the recommendation is arithmetic on
          those figures and on the job you set. The volume is a hypothesis.
        </p>
      </header>

      <div role="group" aria-label="Workload" className="mt-8 flex flex-wrap gap-2">
        {WORKLOADS.map((item) => {
          const selected = item.id === workloadId;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`workload-${item.id}`}
              aria-pressed={selected}
              onClick={() => selectWorkload(item.id)}
              className={`focus-ring rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] ${
                selected
                  ? "border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan"
                  : "border-white/15 text-white/70 hover:border-white/40 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <p className="mt-3 max-w-2xl text-sm text-white/70">{workload.blurb}</p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
        <section aria-label="Model field">
          {result.eligible.length === 0 ? (
            <div className="flex h-[280px] items-center rounded-2xl border border-white/10 px-6 text-sm leading-relaxed text-white/70 sm:h-[420px]">
              No model on this page can hold a prompt of {countLabel(inputTokens)} tokens.
            </div>
          ) : (
            <ModelField
              rows={result.eligible}
              winnerId={result.winner?.model.id ?? null}
              leaderId={result.qualityLeader?.model.id ?? null}
              activeId={activeId}
              indexName={workload.indexName}
              onHover={setActiveId}
            />
          )}
          <ul className="mt-3 flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-neon-cyan" aria-hidden />
              Fits the job
            </li>
            {leaderDifferent ? (
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full border border-neon-violet" aria-hidden />
                Leads the {workload.indexName}
              </li>
            ) : null}
          </ul>
          {copy.sittingOut ? <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">{copy.sittingOut}</p> : null}
        </section>

        <section aria-live="polite" className="glass rounded-2xl p-5 sm:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">Recommended</p>
          <h2
            data-testid="recommendation-name"
            className="mt-2 font-display text-3xl leading-tight tracking-tight text-white sm:text-4xl"
          >
            {copy.name}
          </h2>
          <p className="mt-3 font-mono text-sm text-neon-cyan">
            Fit {copy.fit}
            <span className="ml-2 align-middle font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">
              {KIND_INFO.calculated.label}
            </span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Fit is this page&apos;s score for the job, from the weights below. It is calculated here. It is not a
            benchmark.
          </p>
          {result.winner && result.winner.index != null ? (
            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">{workload.indexName}</dt>
                <dd className="mt-1 font-mono text-sm tabular-nums text-white">{indexText(result.winner.index)}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">This workload</dt>
                <dd className="mt-1 font-mono text-sm tabular-nums text-white">{usd(result.winner.cost)}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">Context</dt>
                <dd className="mt-1 font-mono text-sm tabular-nums text-white">
                  {tokensLabel(result.winner.model.contextLength)}
                </dd>
              </div>
            </dl>
          ) : null}
          <p className="mt-4 text-sm leading-relaxed text-white/85">{copy.lead}</p>
          {copy.comparisons.map((line) => (
            <p key={line} className="mt-2 text-sm leading-relaxed text-white/65">
              {line}
            </p>
          ))}

          <fieldset className="mt-6 space-y-4 border-t border-white/10 pt-5">
            <legend className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Weights</legend>
            {WEIGHTS.map((item) => {
              const id = `weight-${item.key}`;
              return (
                <div key={item.key}>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor={id} className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/70">
                      {item.label}
                    </label>
                    <span className="font-mono text-[11px] tabular-nums text-white">{weights[item.key]}%</span>
                  </div>
                  <input
                    id={id}
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={weights[item.key]}
                    aria-valuetext={`${weights[item.key]} percent`}
                    onChange={(event) =>
                      setWeights(retargetWeight(weights, item.key, Number(event.target.value)))
                    }
                    className="mt-2 w-full accent-[oklch(var(--accent-cyan))]"
                  />
                </div>
              );
            })}
            <p className="font-mono text-[11px] leading-relaxed text-white/75">{formulaLine(weights)}</p>
            {copy.contextNote ? <p className="text-sm leading-relaxed text-white/55">{copy.contextNote}</p> : null}
            <button
              type="button"
              onClick={resetJob}
              className="focus-ring font-mono text-[10px] uppercase tracking-[0.14em] text-white/50 hover:text-white"
            >
              Reset this job
            </button>
          </fieldset>
        </section>
      </div>

      <section className="mt-14" aria-labelledby="candidates-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="candidates-heading" className="font-display text-2xl tracking-tight text-white">
            {showAll ? "All 14 models" : "Candidates"}
          </h2>
          <button
            type="button"
            aria-expanded={showAll}
            onClick={() => setShowAll((value) => !value)}
            className="focus-ring font-mono text-[11px] uppercase tracking-[0.14em] text-neon-cyan"
          >
            {showAll ? "Top of the ranking" : `All ${pack.models.length} models`}
          </button>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-white/60">
          Sorted by fit. The index and the list price are published. The workload cost and the fit are calculated.
        </p>
        <div className="mt-5 space-y-3 md:hidden">
          {shown.map((row) => (
            <CandidateCard
              key={row.model.id}
              row={row}
              indexName={workload.indexName}
              winner={row.model.id === result.winner?.model.id}
              onHover={setActiveId}
            />
          ))}
        </div>
        <div className="mt-5 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Models scored for {workload.label}</caption>
            <thead>
              <tr className="border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
                <th scope="col" className="py-2 pr-4 font-normal">Model</th>
                <th scope="col" className="py-2 pr-4 font-normal">{workload.indexName}</th>
                <th scope="col" className="py-2 pr-4 font-normal">This workload</th>
                <th scope="col" className="py-2 pr-4 font-normal">List price</th>
                <th scope="col" className="py-2 font-normal">Fit</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => {
                const winner = row.model.id === result.winner?.model.id;
                return (
                  <tr
                    key={row.model.id}
                    onMouseEnter={() => setActiveId(row.model.id)}
                    onMouseLeave={() => setActiveId(null)}
                    className={`border-b border-white/5 ${winner ? "text-white" : "text-white/75"}`}
                  >
                    <th scope="row" className={`py-3 pr-4 font-sans font-medium ${winner ? "text-neon-cyan" : "text-white"}`}>
                      {row.model.name}
                      <span className="mt-0.5 block font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-white/40">
                        {row.model.provider} · {tokensLabel(row.model.contextLength)}
                      </span>
                    </th>
                    <td className="py-3 pr-4 font-mono tabular-nums">{row.index == null ? "—" : indexText(row.index)}</td>
                    <td className="py-3 pr-4 font-mono tabular-nums">{usd(row.cost)}</td>
                    <td className="py-3 pr-4 font-mono text-xs tabular-nums text-white/55">{listPrice(row)}</td>
                    <td className="py-3 font-mono tabular-nums">
                      {row.fit == null ? sitOutLabel(row) : fitLabel(row.fit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-14" aria-labelledby="cost-heading">
        <h2 id="cost-heading" className="font-display text-2xl tracking-tight text-white">
          What {countLabel(volume)} {workload.unit} would cost
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
          Uncached prompt plus completion, at the catalog rate for this prompt length. The count and the token
          sizes are a hypothesis. Changing them rescores the page.
        </p>
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Volume">
          {VOLUME_PRESETS.map((preset) => {
            const selected = volume === preset;
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={selected}
                onClick={() => setVolume(preset)}
                className={`focus-ring rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] ${
                  selected
                    ? "border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan"
                    : "border-white/15 text-white/70 hover:border-white/40 hover:text-white"
                }`}
              >
                {countLabel(preset)}
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-white/70">
            Average input tokens
            <input
              type="number"
              min={1}
              max={2_000_000}
              value={inputTokens}
              onChange={(event) => {
                const next = clampTokens(event.target.value);
                if (next != null) setInputTokens(next);
              }}
              className="focus-ring mt-1 w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 font-mono text-sm text-white"
            />
          </label>
          <label className="block text-sm text-white/70">
            Average output tokens
            <input
              type="number"
              min={1}
              max={2_000_000}
              value={outputTokens}
              onChange={(event) => {
                const next = clampTokens(event.target.value);
                if (next != null) setOutputTokens(next);
              }}
              className="focus-ring mt-1 w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 font-mono text-sm text-white"
            />
          </label>
        </div>
        <ol className="mt-6 space-y-2">
          {byCost.map((row) => {
            const winner = row.model.id === result.winner?.model.id;
            const width = maxCost > 0 ? Math.max(1.5, (row.cost / maxCost) * 100) : 0;
            return (
              <li
                key={row.model.id}
                className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3"
                onMouseEnter={() => setActiveId(row.model.id)}
                onMouseLeave={() => setActiveId(null)}
              >
                <span className={`truncate text-sm ${winner ? "text-neon-cyan" : "text-white/80"}`}>{row.model.name}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
                  <span
                    className={`block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${
                      winner ? "bg-neon-cyan" : "bg-white/40"
                    }`}
                    style={{ width: `${width}%` }}
                  />
                </span>
                <span className="font-mono text-xs tabular-nums text-white/80">{usd(row.cost)}</span>
              </li>
            );
          })}
        </ol>
        {byCost.length === 0 ? (
          <p className="mt-4 text-sm text-white/60">There is no cost to compare until a model can take the prompt.</p>
        ) : null}
      </section>

      <section id="method" className="mt-16 max-w-3xl border-t border-white/10 pt-10">
        <h2 className="font-display text-2xl tracking-tight text-white">How the number is made</h2>
        <ol className="mt-5 space-y-2 font-mono text-[11px] uppercase tracking-[0.14em] text-white/70">
          <li>OpenRouter catalog</li>
          <li>Frozen schema, {fetchedLabel(pack.fetchedAt)}</li>
          <li>Benchmark and price</li>
          <li>Workload score</li>
          <li>This page</li>
        </ol>
        <dl className="mt-6 space-y-4 text-sm leading-relaxed text-white/70">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">{KIND_INFO.published.label}</dt>
            <dd className="mt-1">
              {pack.benchmark} Fetched {fetchedLabel(pack.fetchedAt)} from{" "}
              <a href={pack.sourceUrl} className="focus-ring text-neon-cyan">
                {pack.sourceUrl}
              </a>
              . {pack.priceBasis}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">{KIND_INFO.calculated.label}</dt>
            <dd className="mt-1">{FORMULA_NOTES.quality}</dd>
            <dd className="mt-1">{FORMULA_NOTES.cost}</dd>
            <dd className="mt-1">{FORMULA_NOTES.context}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">{KIND_INFO.hypothetical.label}</dt>
            <dd className="mt-1">
              The job&apos;s volume, token sizes, and opening weights. They are not measurements. Moving them is the
              decision.
            </dd>
          </div>
        </dl>
        <h3 className="mt-8 font-display text-lg text-white">What this page leaves out</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-white/65">
          <li>Fourteen models, chosen for a spread of providers, prices, and index coverage. Not the whole catalog.</li>
          <li>Latency. This catalog snapshot does not publish a comparable speed, so speed is not a weight.</li>
          <li>Cache hits, batch rates, and web search. The cost is a cold prompt.</li>
          <li>
            A missing index sits the model out of that job. The absence is the catalog&apos;s, and it is not filled in.
          </li>
          <li>Fit is relative to the models on this page. A different set would move the score.</li>
        </ul>
      </section>
    </article>
  );
}

function sitOutLabel(row: ScoredModel): string {
  if (row.reason === "missing-index") return "No index";
  if (row.reason === "context") return "Prompt does not fit";
  if (row.reason === "modality") return "No image input";
  if (row.reason === "tools") return "No tools";
  return "—";
}

function CandidateCard({
  row,
  indexName,
  winner,
  onHover,
}: {
  row: ScoredModel;
  indexName: string;
  winner: boolean;
  onHover: (id: string | null) => void;
}) {
  return (
    <article
      onMouseEnter={() => onHover(row.model.id)}
      onMouseLeave={() => onHover(null)}
      className={`rounded-xl border p-4 ${winner ? "border-neon-cyan/40" : "border-white/10"}`}
    >
      <h3 className={`font-display text-xl ${winner ? "text-neon-cyan" : "text-white"}`}>{row.model.name}</h3>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
        {row.model.provider} · {tokensLabel(row.model.contextLength)} context
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">Fit</dt>
          <dd className="font-mono tabular-nums text-white">{row.fit == null ? sitOutLabel(row) : fitLabel(row.fit)}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">{indexName}</dt>
          <dd className="font-mono tabular-nums text-white">{row.index == null ? "—" : indexText(row.index)}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">This workload</dt>
          <dd className="font-mono tabular-nums text-white">{usd(row.cost)}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">List price</dt>
          <dd className="font-mono text-xs tabular-nums text-white/70">{listPrice(row)}</dd>
        </div>
      </dl>
    </article>
  );
}
