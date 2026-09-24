"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { STORY_SIM } from "@/lib/sim/rate-buffer-book";
import { DecisionCard } from "@/components/storytelling/DecisionCard";
import { EvidenceBadge } from "@/components/storytelling/EvidenceBadge";
import {
  BufferMarkField,
  buildPopulationMarks,
  HOUSEHOLD_MARKS,
  SEGMENT_MARKS,
  STUB_MARKS,
  TransmissionSpine,
  stageFor,
  type BufferMark,
  type FieldMode,
} from "@/components/storytelling/grammar";
import { AtmosphereLayer } from "@/components/storytelling/atmosphere";
import { useStoryAtmosphere } from "@/components/storytelling/AtmosphereContext";

type Props = {
  visualState: string;
  className?: string;
  density?: "full" | "dock";
};

const D = STORY_SIM.display;
const OTHER_SHARE = `${(100 - parseFloat(D.floatingThin)).toFixed(1)}%`;
const POPULATION = buildPopulationMarks(48);

function marksFor(mode: FieldMode): BufferMark[] {
  switch (mode) {
    case "stub":
      return STUB_MARKS;
    case "household":
      return HOUSEHOLD_MARKS;
    case "segments":
      return SEGMENT_MARKS;
    case "population":
    case "sleeve":
    case "annotated":
      return POPULATION;
    case "cut":
      return POPULATION;
    default:
      return STUB_MARKS;
  }
}

function SegmentLabels({ dock }: { dock?: boolean }) {
  return (
    <div className="mt-1.5 grid grid-cols-3 gap-1">
      {SEGMENT_MARKS.map((m) => (
        <span
          key={m.id}
          className={cn(
            "text-center font-mono text-white/55",
            dock ? "text-[8px]" : "text-[9px]",
          )}
        >
          {m.label}
        </span>
      ))}
    </div>
  );
}

function StubLabels({ dock }: { dock?: boolean }) {
  return (
    <div className="mt-1.5 grid grid-cols-3 gap-1">
      {STUB_MARKS.map((m) => (
        <span
          key={m.id}
          className={cn(
            "text-center font-mono text-white/60",
            dock ? "text-[8px]" : "text-[9px]",
          )}
        >
          {m.label}
        </span>
      ))}
    </div>
  );
}

function SleeveReveal({
  dur,
  dock,
  reduced,
}: {
  dur: number;
  dock?: boolean;
  reduced?: boolean;
}) {
  const [phase, setPhase] = useState<"field" | "filter" | "number">(() =>
    reduced ? "number" : "field",
  );

  useEffect(() => {
    if (reduced) return;
    const t1 = window.setTimeout(() => setPhase("filter"), 650);
    const t2 = window.setTimeout(() => setPhase("number"), 1500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [reduced]);

  const keep =
    phase === "field"
      ? undefined
      : (m: BufferMark) => m.floating && m.thin;

  return (
    <div className="space-y-2">
      <BufferMarkField
        marks={POPULATION}
        dur={dur}
        keep={keep}
        dock={dock}
      />
      <AnimatePresence mode="wait">
        {phase === "number" ? (
          <motion.div
            key="num"
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur }}
            className="rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-3 text-center"
          >
            <p className="font-mono text-[8px] uppercase tracking-wider text-neon-cyan">
              Floating × thin-buffer
            </p>
            <p className="mt-1 font-display text-3xl tabular-nums text-neon-cyan">
              {D.floatingThin}
            </p>
            <p className="mt-0.5 text-[10px] text-white/55">
              of unpaid balance
            </p>
          </motion.div>
        ) : (
          <motion.p
            key="hint"
            initial={false}
            animate={{ opacity: 1 }}
            className="text-[10px] text-neon-cyan/80"
          >
            {phase === "field"
              ? "Ask · who can still reprice?"
              : "Dim fixed-rate and thick-buffered balances…"}
          </motion.p>
        )}
      </AnimatePresence>
      {phase === "number" && !dock && (
        <p className="text-[10px] leading-snug text-[oklch(var(--muted))]">
          {D.newThinFromBottom} of newly thin names were already in the weakest
          pre-shock tercile.
        </p>
      )}
    </div>
  );
}

function AnnotatedField({ dur, dock }: { dur: number; dock?: boolean }) {
  return (
    <div className="space-y-2">
      <BufferMarkField
        marks={POPULATION}
        dur={dur}
        keep={(m) => m.floating && m.thin}
        dock={dock}
        className="opacity-50"
      />
      <div
        className={cn(
          "grid gap-1.5",
          dock ? "grid-cols-1" : "grid-cols-2",
        )}
      >
        <EvidenceBadge
          kind="modeled"
          compact
          lines={["payment ↑ · buffer ↓"]}
        />
        <EvidenceBadge
          kind="observed"
          compact
          lines={[
            "Housing +10.2%",
            "DSTI>40% 26→33%",
            "Expected arrears ~30%",
          ]}
        />
        {!dock && (
          <EvidenceBadge
            kind="observed"
            compact
            className="col-span-2"
            lines={["Counterpoint · DTI 92.8%→87.0%"]}
          />
        )}
      </div>
    </div>
  );
}

function PortfolioCut({
  dur,
  dock,
  reduced,
  outroMotifId,
}: {
  dur: number;
  dock?: boolean;
  reduced?: boolean;
  outroMotifId?: string;
}) {
  const watch = parseFloat(D.floatingThin);
  const other = 100 - watch;
  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-xl border border-white/15",
          dock ? "h-36" : "h-44",
        )}
      >
        <div
          className="flex flex-col items-center justify-center bg-white/[0.05]"
          style={{ height: `${other}%` }}
        >
          <span className="font-display text-2xl tabular-nums text-white/65">
            {OTHER_SHARE}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
            Other
          </span>
        </div>
        <motion.div
          className="flex flex-col items-center justify-center border-t border-neon-cyan/35 bg-neon-cyan/15"
          style={{ height: `${watch}%` }}
          initial={reduced ? false : { opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ duration: dur }}
        >
          <span className="font-display text-2xl tabular-nums text-neon-cyan">
            {D.floatingThin}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-neon-cyan">
            Floating × thin
          </span>
        </motion.div>
      </div>
      {!dock && (
        <DecisionCard
          motifId={outroMotifId}
          body="Don't size the watchlist from the policy rate. Start with balances exposed to both floating-rate repricing and thin cash-flow buffers. Then monitor reset dates, buffer/DSTI deterioration, and pre-existing weak segments."
          caveat="Modelled example — not investment or credit advice."
        />
      )}
    </div>
  );
}

function FieldBody({
  mode,
  dur,
  dock,
  reduced,
  outroMotifId,
}: {
  mode: FieldMode;
  dur: number;
  dock?: boolean;
  reduced?: boolean;
  outroMotifId?: string;
}) {
  if (mode === "sleeve") {
    return <SleeveReveal dur={dur} dock={dock} reduced={reduced} />;
  }
  if (mode === "annotated") {
    return <AnnotatedField dur={dur} dock={dock} />;
  }
  if (mode === "cut") {
    return (
      <PortfolioCut
        dur={dur}
        dock={dock}
        reduced={reduced}
        outroMotifId={outroMotifId}
      />
    );
  }

  const marks = marksFor(mode);
  return (
    <div>
      <BufferMarkField marks={marks} dur={dur} dock={dock} />
      {mode === "stub" && <StubLabels dock={dock} />}
      {mode === "segments" && <SegmentLabels dock={dock} />}
      {mode === "household" && (
        <p className="mt-2 text-center font-mono text-[10px] text-white/50">
          Debt service €1,000 → €1,600 · buffer €1,000 → €400
        </p>
      )}
      {mode === "population" && (
        <div className="mt-2">
          <p className="font-display text-xl tabular-nums text-white">
            {D.thinBefore} → {D.thinAfter}
          </p>
          <p className="text-[10px] text-[oklch(var(--muted))]">
            thin-buffer share of unpaid balance
          </p>
        </div>
      )}
    </div>
  );
}

function ProvenanceLine({
  kind,
}: {
  kind: "hypothetical" | "modeled" | "observed" | "mixed";
}) {
  const label =
    kind === "hypothetical"
      ? "Hypothetical"
      : kind === "modeled"
        ? `Model · n=${D.n} · +${D.shockBps}bp · seed 42`
        : kind === "observed"
          ? "Observed · ECB published"
          : "Modeled mechanism ↔ observed / published";
  return (
    <p className="mt-2 font-mono text-[8px] uppercase tracking-wider text-white/30">
      {label}
    </p>
  );
}

/**
 * Continuous decision visual: one transmission spine + evolving buffer field.
 * Acts change emphasis and zoom level — not a new metaphor each step.
 */
export function CashflowPressurePanel({
  visualState,
  className,
  density = "full",
}: Props) {
  const reduced = usePrefersReducedMotion();
  const dur = reduced ? 0 : 0.4;
  const dock = density === "dock";
  const stage = useMemo(() => stageFor(visualState), [visualState]);
  const { atmosphere, hasRole } = useStoryAtmosphere();
  const motifId = atmosphere?.motifId;
  const showOutro = Boolean(motifId && hasRole("outro"));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={cn(
          "relative overflow-hidden border border-white/[0.07] bg-[oklch(0.11_0.025_264)]",
          dock ? "rounded-xl p-3" : "rounded-2xl p-4 sm:p-5",
        )}
        data-visual-state={visualState}
        data-visual-job={stage.job}
        data-visual-behavior={stage.behavior}
      >
        <AtmosphereLayer
          motifId={motifId ?? "pressure-field"}
          role="ambient"
          intensity="subtle"
          className="opacity-80"
        />
        <div className="relative z-10">
          <TransmissionSpine
            active={stage.spineActive}
            dur={dur}
            dock={dock}
          />

          <p className="mb-2 font-mono text-[9px] uppercase tracking-wider text-white/40">
            {stage.caption}
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={stage.field}
              initial={reduced ? false : { opacity: 0.85 }}
              animate={{ opacity: 1 }}
              transition={{ duration: dur * 0.6 }}
            >
              <FieldBody
                mode={stage.field}
                dur={dur}
                dock={dock}
                reduced={reduced}
                outroMotifId={showOutro ? motifId : undefined}
              />
            </motion.div>
          </AnimatePresence>

          <ProvenanceLine kind={stage.provenance} />
        </div>
      </div>

      {visualState === "cut" && dock && (
        <DecisionCard
          className="p-3"
          motifId={showOutro ? motifId : undefined}
          body="Start with floating × thin-buffer balances — not the policy print."
          caveat="Modelled example — not investment or credit advice."
        />
      )}
    </div>
  );
}
