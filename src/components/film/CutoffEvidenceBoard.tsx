"use client";

import pack from "../../../data/figures/where-should-the-cutoff-sit.v1.json";

export function CutoffEvidenceBoard() {
  const op = pack.policy.operating.display;
  const youden = pack.policy.youdenReference.display;
  const oot = pack.model.display;
  const sample = pack.sample.display;

  return (
    <section
      data-testid="cutoff-evidence"
      className="mx-auto max-w-3xl px-5 py-24"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan/80">
        Reality check · sample model
      </p>
      <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
        Pay for the gate on out-of-time data
      </h2>
      <p className="mt-6 text-base leading-relaxed text-white/65 md:text-lg">
        The frontier is calculated from a Home Credit scorecard on a stratified
        desktop sample ({sample.sampleN} of {sample.fullN} applications). Observed
        default rate in that sample is {sample.defaultRate}. None of this is a
        live bank book or an IRB pack.
      </p>

      <dl className="mt-12 grid gap-6 sm:grid-cols-2">
        <div className="border border-white/10 bg-white/[0.03] p-5">
          <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
            Operating policy · calculated
          </dt>
          <dd className="mt-3 font-display text-2xl text-white">
            PD ≤ {op.cutoffPd}
          </dd>
          <dd className="mt-2 text-sm text-white/60">
            OOT approval {op.approval} · bad among approved {op.badAmongApproved}{" "}
            (appetite {pack.policy.appetite.display})
          </dd>
        </div>
        <div className="border border-white/10 bg-white/[0.03] p-5">
          <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
            Youden reference · calculated
          </dt>
          <dd className="mt-3 font-display text-2xl text-white">
            PD ≤ {youden.cutoffPd}
          </dd>
          <dd className="mt-2 text-sm text-white/60">
            Tighter gate · approval {youden.approval} · bad among approved{" "}
            {youden.badAmongApproved}. Not the operating policy.
          </dd>
        </div>
        <div className="border border-white/10 bg-white/[0.03] p-5">
          <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
            OOT discrimination · calculated
          </dt>
          <dd className="mt-3 font-display text-2xl text-white">
            Gini {oot.ootGini}
          </dd>
          <dd className="mt-2 text-sm text-white/60">
            KS {oot.ootKs}. Mid-50s time-OOT Gini is honest for this public
            feature set — not a competition leaderboard flex.
          </dd>
        </div>
        <div className="border border-white/10 bg-white/[0.03] p-5">
          <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
            Calibration OOT · calculated
          </dt>
          <dd className="mt-3 font-display text-2xl text-white">
            {oot.calib}
          </dd>
          <dd className="mt-2 text-sm text-white/60">
            Mean predicted PD vs realized default rate on the OOT window.
          </dd>
        </div>
      </dl>

      <p className="mt-10 text-sm leading-relaxed text-white/45">
        Source:{" "}
        <a
          className="text-neon-cyan/80 underline-offset-2 hover:underline"
          href={pack.source.attribution}
          target="_blank"
          rel="noreferrer"
        >
          Home Credit Default Risk
        </a>
        . Champion: {pack.source.champion}. LGD {pack.policy.lgd.display} is
        illustrative for EL storytelling only.
      </p>
    </section>
  );
}
