"use client";

import Link from "next/link";
import { AtmosphereLayer } from "@/components/storytelling/atmosphere";
import { ATMOSPHERE_MOTIF_IDS } from "@/stories/schemas/atmosphereAllowlist";

const BLURB: Record<string, { title: string; domains: string; shot: string }> = {
  "pressure-field": {
    title: "Pressure field",
    domains: "Finance · credit",
    shot: "Living residual-capacity bars. Thin = violet. Thick = cyan.",
  },
  "ledger-drift": {
    title: "Ledger drift",
    domains: "Finance · economics",
    shot: "Soft ledger lattice; tick marks drift like tape.",
  },
  "data-stream": {
    title: "Data stream",
    domains: "Data · analytics",
    shot: "Glyph rain — tokens, never fake KPIs.",
  },
  "signal-ribbon": {
    title: "Signal ribbon",
    domains: "Markets · economics",
    shot: "Layered sine ribbons; oscilloscope calm.",
  },
  constellation: {
    title: "Constellation",
    domains: "AI · systems",
    shot: "Sparse nodes and edges; slow drift; no logo neurons.",
  },
};

/**
 * Lab: preview all atmosphere motifs at hero intensity.
 */
export default function AtmospheresLabPage() {
  return (
    <div className="pb-24 pt-24">
      <div className="mx-auto max-w-5xl px-4">
        <Link
          href="/"
          className="focus-ring font-mono text-[10px] uppercase tracking-wider text-white/40 hover:text-neon-cyan"
        >
          ← Flagship
        </Link>
        <h1 className="mt-6 font-display text-4xl text-white">
          Atmosphere motifs
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/50">
          Reusable cinematic chrome for intros, outros, and ambient stages.
          Craft bar: Pinloop / Linear / Stripe (Tier A). Story-specific decision
          visuals stay separate. See{" "}
          <code className="text-neon-cyan/80">docs/ATMOSPHERE_MOTIFS.md</code>.
        </p>
      </div>

      <ul className="mx-auto mt-14 flex max-w-5xl flex-col gap-10 px-4">
        {ATMOSPHERE_MOTIF_IDS.map((id) => {
          const meta = BLURB[id];
          return (
            <li
              key={id}
              className="relative min-h-[420px] overflow-hidden rounded-2xl border border-white/10"
            >
              <AtmosphereLayer motifId={id} role="intro" intensity="hero" />
              <div className="relative z-10 flex h-full min-h-[420px] flex-col justify-end bg-gradient-to-t from-[oklch(0.10_0.02_264)] via-[oklch(0.10_0.02_264)]/40 to-transparent p-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon-cyan">
                  {meta?.domains}
                </p>
                <h2 className="mt-2 font-display text-3xl text-white">
                  {meta?.title ?? id}
                </h2>
                <p className="mt-2 max-w-lg text-sm text-white/60">
                  {meta?.shot}
                </p>
                <p className="mt-4 font-mono text-[10px] text-white/30">
                  motifId: {id}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
