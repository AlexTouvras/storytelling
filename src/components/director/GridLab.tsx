"use client";

import { useCallback, useRef, useState } from "react";
import { RiveLayer, type RiveLayerHandle } from "@/components/director/RiveLayer";
import { GRID_RIV_URL } from "@/components/director/rive-assets";
import { GRID, GRID_HOURS, GRID_LOSS_MW, GRID_RESERVE_MW, type GridValues } from "@/illustrations/grid";

type Props = { values: GridValues };

/**
 * Lab for `grid.riv`: its state machine driven from React, with the modelled
 * nadir of each variant beside it so the picture can be checked against the
 * model it was built from.
 */
export function GridLab({ values }: Props) {
  const rive = useRef<RiveLayerHandle>(null);
  const [ready, setReady] = useState(false);
  const [light, setLight] = useState(false);
  const [reserve, setReserve] = useState(false);
  const [states, setStates] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);

  const note = useCallback((line: string) => setLog((l) => [...l.slice(-5), line]), []);
  const onReady = useCallback(() => {
    setReady(true);
    note("loaded grid.riv");
  }, [note]);
  const onStates = useCallback((s: string[]) => setStates(s), []);

  const apply = (nextLight: boolean, nextReserve: boolean) => {
    rive.current?.setBool(GRID.inputs.light, nextLight);
    rive.current?.setBool(GRID.inputs.reserve, nextReserve);
  };

  const rows = Object.values(values.variants);
  const button = "focus-ring border px-4 py-2 disabled:opacity-40";

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-24 text-white">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan/80">Engine lab · grid</p>
      <h1 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.03em]">
        The grid inside one hour
      </h1>
      <p className="mt-4 max-w-2xl text-white/65">
        <code>grid.riv</code>, generated from the frequency model. The dial follows the modelled
        reference trip ({GRID_LOSS_MW.toLocaleString("en")} MW) to scale; the wheels&apos; slow-down is
        exaggerated. Illustrative; every number on this page is modelled.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <div className="relative aspect-square overflow-hidden rounded border border-white/10 bg-void">
          <RiveLayer
            ref={rive}
            src={GRID_RIV_URL}
            artboard={GRID}
            stateMachine={GRID.stateMachine}
            className="absolute inset-0"
            testId="rive-grid"
            onReady={onReady}
            onStates={onStates}
          />
          <p className="absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
            Illustration · Rive
          </p>
        </div>
        <table className="self-start font-mono text-[11px] text-white/70" data-testid="grid-variants">
          <caption className="mb-3 text-left uppercase tracking-[0.14em] text-white/35">Modelled nadir</caption>
          <thead className="text-left text-white/40">
            <tr>
              <th className="pb-2 pr-4 font-normal">Hour</th>
              <th className="pb-2 pr-4 font-normal">Fast reserve</th>
              <th className="pb-2 font-normal">Nadir</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.key} className={v.light === light && v.reserve === reserve ? "text-white" : undefined}>
                <td className="py-1 pr-4">{v.kineticGWs} GWs</td>
                <td className="py-1 pr-4">{v.reserve ? `${GRID_RESERVE_MW} MW` : "none"}</td>
                <td className={`py-1 ${v.belowFloor ? "text-neon-violet" : ""}`}>{v.nadirHz.toFixed(2)} Hz</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 font-mono text-[11px] uppercase tracking-[0.14em]">
        <button
          type="button"
          data-testid="fire-trip"
          className={`${button} border-neon-violet/60 text-neon-violet`}
          disabled={!ready}
          onClick={() => note(rive.current?.fire(GRID.inputs.trip) ? "fired trip" : "trip not ready")}
        >
          Trip
        </button>
        <button
          type="button"
          data-testid="toggle-light"
          aria-pressed={light}
          className={`${button} border-white/30 text-white/80`}
          disabled={!ready}
          onClick={() => {
            setLight(!light);
            apply(!light, reserve);
            note(`light ${!light ? "on" : "off"} (${!light ? GRID_HOURS.light : GRID_HOURS.typical} GWs)`);
          }}
        >
          {light ? "Typical hour" : "Light hour"}
        </button>
        <button
          type="button"
          data-testid="toggle-reserve"
          aria-pressed={reserve}
          className={`${button} border-neon-cyan/60 text-neon-cyan`}
          disabled={!ready}
          onClick={() => {
            setReserve(!reserve);
            apply(light, !reserve);
            note(`reserve ${!reserve ? "on" : "off"}`);
          }}
        >
          {reserve ? "No fast reserve" : "Fast reserve"}
        </button>
        <button
          type="button"
          data-testid="set-tripped"
          className={`${button} border-white/30 text-white/80`}
          disabled={!ready}
          onClick={() => note(rive.current?.setBool(GRID.inputs.tripped, true) ? "jumped to end" : "not ready")}
        >
          Jump to end state
        </button>
        <button
          type="button"
          data-testid="reset"
          className={`${button} border-white/30 text-white/80`}
          disabled={!ready}
          onClick={() => {
            if (rive.current?.reset()) {
              apply(light, reserve);
              note("reset");
            }
          }}
        >
          Reset
        </button>
      </div>

      <dl className="mt-6 grid gap-2 font-mono text-[11px] text-white/60 sm:grid-cols-2">
        <div>
          <dt className="uppercase tracking-[0.14em] text-white/35">Runtime</dt>
          <dd data-testid="rive-status">{ready ? "ready" : "loading"}</dd>
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
