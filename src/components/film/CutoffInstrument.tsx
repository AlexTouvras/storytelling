"use client";

import { useMemo, useState } from "react";
import type { AppFieldModel } from "@/lib/sim/app-field";
import {
  CutoffHorizonChart,
  ootAtCutoff,
} from "@/components/film/CutoffHorizonChart";
import pack from "../../../data/figures/where-should-the-cutoff-sit.v1.json";

type Props = {
  model: AppFieldModel;
};

function pct(n: number, digits = 1) {
  return `${(100 * n).toFixed(digits)}%`;
}

export function CutoffInstrument({ model }: Props) {
  const [cutoff, setCutoff] = useState(model.operatingCutoffPd);
  const oot = useMemo(() => ootAtCutoff(cutoff), [cutoff]);
  const frozen = pack.policy.operating.display;

  return (
    <section
      data-testid="cutoff-instrument"
      className="mx-auto max-w-3xl px-5 py-20"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-violet/80">
        Operable sleeve
      </p>
      <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-white">
        Move the gate on this cloud
      </h2>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/65">
        The film settles at the frozen operating cut (PD ≤ {frozen.cutoffPd}).
        Drag to place the gate. The numbers and the chart are the same calculated
        OOT frontier; the cloud above is only an illustration of the field.
      </p>

      <label className="mt-10 block">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
          Cut-off PD
        </span>
        <input
          data-testid="cutoff-slider"
          type="range"
          min={0.02}
          max={0.25}
          step={0.005}
          value={cutoff}
          onChange={(e) => setCutoff(Number(e.target.value))}
          className="mt-3 w-full accent-neon-cyan"
        />
      </label>

      <dl className="mt-8 grid gap-6 sm:grid-cols-3">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
            Gate
          </dt>
          <dd
            data-testid="instrument-gate"
            className="mt-2 font-display text-2xl text-white"
          >
            {pct(cutoff)}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
            Approval (OOT)
          </dt>
          <dd
            data-testid="instrument-approval"
            className="mt-2 font-display text-2xl text-white"
          >
            {pct(oot.approvalRate)}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
            Bad among approved (OOT)
          </dt>
          <dd
            data-testid="instrument-bad"
            className="mt-2 font-display text-2xl text-white"
          >
            {pct(oot.badRateApproved)}
          </dd>
        </div>
      </dl>

      <CutoffHorizonChart cutoffPd={cutoff} />
    </section>
  );
}
