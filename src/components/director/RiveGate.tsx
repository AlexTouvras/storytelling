"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { FieldModel } from "@/lib/sim/book-field";
import { frameAt } from "@/components/film/frame";
import { LoanField } from "@/components/film/LoanField";
import { RiveLayer, type RiveLayerHandle } from "@/components/director/RiveLayer";
import { HOUSEHOLD_RIV_URL } from "@/components/director/rive-assets";
import { HOUSEHOLD } from "@/illustrations/household";

type Props = { model: FieldModel };

/**
 * Gate 1: a real `.riv` rendered by the Rive runtime inside the app, next to a
 * canvas data visual, with its state machine driven from React.
 */
export function RiveGate({ model }: Props) {
  const rive = useRef<RiveLayerHandle>(null);
  const [mounted, setMounted] = useState(true);
  const [ready, setReady] = useState(false);
  const [states, setStates] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const frame = useMemo(() => frameAt(0.6, model.featured), [model]);

  const note = useCallback((line: string) => setLog((l) => [...l.slice(-5), line]), []);
  const onReady = useCallback(() => {
    setReady(true);
    note("loaded household.riv");
  }, [note]);
  const onStates = useCallback((s: string[]) => setStates(s), []);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-24 text-white">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan/80">
        Engine lab · gate 1
      </p>
      <h1 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.03em]">
        A Rive illustration beside a data canvas
      </h1>
      <p className="mt-4 max-w-2xl text-white/65">
        Left is the existing loan field, drawn by <code>drawField</code>. Right is{" "}
        <code>household.riv</code>, generated from the same modelled loan and rendered by the Rive
        runtime. The buttons drive its state machine.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded border border-white/10 bg-void">
          <LoanField model={model} frame={frame} className="absolute inset-0 h-full w-full" />
          <p className="absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
            Data · canvas 2D
          </p>
        </div>
        <div className="relative aspect-square overflow-hidden rounded border border-white/10 bg-void">
          {mounted ? (
            <RiveLayer
              ref={rive}
              src={HOUSEHOLD_RIV_URL}
              artboard={HOUSEHOLD}
              stateMachine={HOUSEHOLD.stateMachine}
              reports={HOUSEHOLD.reports}
              className="absolute inset-0"
              testId="rive-household"
              onReady={onReady}
              onStates={onStates}
            />
          ) : null}
          <p className="absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
            Illustration · Rive
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 font-mono text-[11px] uppercase tracking-[0.14em]">
        <button
          type="button"
          data-testid="fire-shock"
          className="focus-ring border border-neon-violet/60 px-4 py-2 text-neon-violet disabled:opacity-40"
          disabled={!mounted || !ready}
          onClick={() => note(rive.current?.fire(HOUSEHOLD.props.shock) ? "fired shock" : "shock not ready")}
        >
          Fire shock
        </button>
        <button
          type="button"
          data-testid="set-constrained"
          className="focus-ring border border-white/30 px-4 py-2 text-white/80 disabled:opacity-40"
          disabled={!mounted || !ready}
          onClick={() =>
            note(rive.current?.setBool(HOUSEHOLD.props.constrained, true) ? "set constrained" : "not ready")
          }
        >
          Jump to end state
        </button>
        <button
          type="button"
          data-testid="reset"
          className="focus-ring border border-white/30 px-4 py-2 text-white/80 disabled:opacity-40"
          disabled={!mounted || !ready}
          onClick={() => note(rive.current?.reset() ? "reset" : "not ready")}
        >
          Reset
        </button>
        <button
          type="button"
          data-testid="toggle-mount"
          className="focus-ring border border-white/30 px-4 py-2 text-white/80"
          onClick={() => {
            setMounted((m) => !m);
            setReady(false);
            setStates([]);
            note(mounted ? "unmounted" : "mounted");
          }}
        >
          {mounted ? "Unmount" : "Mount"}
        </button>
      </div>

      <dl className="mt-6 grid gap-2 font-mono text-[11px] text-white/60 sm:grid-cols-2">
        <div>
          <dt className="uppercase tracking-[0.14em] text-white/35">Runtime</dt>
          <dd data-testid="rive-status">{mounted ? (ready ? "ready" : "loading") : "unmounted"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.14em] text-white/35">Last reported state</dt>
          <dd data-testid="rive-states">{states.join(", ") || "—"}</dd>
        </div>
      </dl>
      <ol data-testid="rive-log" className="mt-4 space-y-1 font-mono text-[11px] text-white/45">
        {log.map((line, i) => (
          <li key={`${i}-${line}`}>{line}</li>
        ))}
      </ol>
    </div>
  );
}
