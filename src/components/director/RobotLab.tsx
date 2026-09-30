"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RiveLayer, type RiveLayerHandle } from "@/components/director/RiveLayer";
import { ROBOT_RIV_URL } from "@/components/director/rive-assets";
import { FIELD_CARDS, fieldCard, fieldCardAccent, type FieldCardId } from "@/illustrations/field-cards";
import { ROBOT, ROBOT_MODES, robotLineProps, type RobotMode } from "@/illustrations/robot";
import { argb } from "@/lib/rive/riv-writer";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";

/** Long enough for the mode mix (320 ms) and the poke hop to finish. */
const SETTLE_MS = 1400;

/**
 * Lab for `robot.riv`: one character, and the lines and accent of each field
 * card. Nothing here is evidence.
 */
export function RobotLab() {
  const rive = useRef<RiveLayerHandle>(null);
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<RobotMode>(ROBOT.defaults.mode);
  const [energy, setEnergy] = useState<number>(ROBOT.defaults.energy);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [cardId, setCardId] = useState<FieldCardId>("ai");
  const [states, setStates] = useState<string[]>([]);
  const [readback, setReadback] = useState({ hover: false, reacting: false, presence: "" });

  const settleTimer = useRef<number | null>(null);
  /** Under reduced motion the robot holds still, and only moves to settle a change the reader asked for. */
  const settle = useCallback(() => {
    if (!reduced) return;
    rive.current?.play();
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => rive.current?.pause(), SETTLE_MS);
  }, [reduced]);

  useEffect(() => {
    if (!ready) return;
    if (!reduced) {
      rive.current?.play();
      return;
    }
    // One shot, not a held flag: any → present never re-enters, so a later tap can still tuck.
    rive.current?.fire(ROBOT.props.settle);
    settle();
  }, [ready, reduced, settle]);

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      const r = rive.current;
      if (!r) return;
      setReadback({
        hover: r.read(ROBOT.props.hover) === true,
        reacting: r.read(ROBOT.props.reacting) === true,
        presence: String(r.read(ROBOT.props.presence) ?? ""),
      });
    }, 120);
    return () => window.clearInterval(id);
  }, [ready]);

  useEffect(
    () => () => {
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    },
    [],
  );

  const onReady = useCallback(() => setReady(true), []);
  const onStates = useCallback((s: string[]) => setStates(s), []);

  const chooseMode = (m: RobotMode) => {
    setMode(m);
    rive.current?.setEnum(ROBOT.props.mode, m);
    settle();
  };
  const chooseEnergy = (v: number) => {
    setEnergy(v);
    rive.current?.setNumber(ROBOT.props.energy, v);
    settle();
  };
  const chooseLook = (next: { x: number; y: number }) => {
    setLook(next);
    rive.current?.setNumber(ROBOT.props.lookX, next.x);
    rive.current?.setNumber(ROBOT.props.lookY, next.y);
    settle();
  };
  const chooseCard = (id: FieldCardId) => {
    const card = fieldCard(id);
    const [r, g, b] = fieldCardAccent(id).rgb;
    setCardId(id);
    robotLineProps().forEach((prop, i) => rive.current?.setString(prop, card.lines[i]));
    rive.current?.setColor(ROBOT.props.accent, argb(r, g, b));
    settle();
  };
  const poke = () => {
    rive.current?.fire(ROBOT.props.poke);
    settle();
  };

  const button = "focus-ring border px-3 py-2 disabled:opacity-40";
  const label = "uppercase tracking-[0.14em] text-white/35";

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-24 text-white">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan/80">Engine lab · character</p>
      <h1 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.03em]">
        One character for every field card
      </h1>
      <p className="mt-4 max-w-2xl text-white/65">
        <code>robot.riv</code> crossfades six short judgements. Pick a field card and it takes that
        card&apos;s lines and homepage colour. A tap tucks it into the corner; tap again and it comes
        back. Point at it and the eyes follow. Chrome, not evidence.
      </p>

      <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <article
          className="overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent"
          aria-label="Field card mock-up"
        >
          <div className="relative aspect-square bg-void">
            <RiveLayer
              ref={rive}
              src={ROBOT_RIV_URL}
              artboard={ROBOT}
              stateMachine={ROBOT.stateMachine}
              reports={ROBOT.reports}
              className="absolute inset-0"
              testId="rive-robot"
              onReady={onReady}
              onStates={onStates}
            />
          </div>
          <div className="px-5 pb-5 pt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon-cyan/80">Field · {fieldCard(cardId).label}</p>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-[-0.02em]">{fieldCard(cardId).title}</h2>
            <p className="mt-2 text-sm text-white/55">{fieldCard(cardId).lines[0]}</p>
          </div>
        </article>

        <div className="space-y-6 font-mono text-[11px]">
          <fieldset>
            <legend className={label}>Mode</legend>
            <div className="mt-2 flex flex-wrap gap-2 uppercase tracking-[0.14em]">
              {ROBOT_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  data-testid={`mode-${m}`}
                  aria-pressed={mode === m}
                  disabled={!ready}
                  className={`${button} ${mode === m ? "border-neon-cyan/70 text-neon-cyan" : "border-white/25 text-white/70"}`}
                  onClick={() => chooseMode(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className={label}>Energy · {energy}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={energy}
              disabled={!ready}
              data-testid="energy"
              className="mt-2 block w-full max-w-sm accent-neon-cyan"
              onChange={(e) => chooseEnergy(Number(e.target.value))}
            />
          </label>

          <div className="grid max-w-sm gap-4 sm:grid-cols-2">
            {(["x", "y"] as const).map((axis) => (
              <label key={axis} className="block">
                <span className={label}>
                  Look {axis} · {look[axis].toFixed(1)}
                </span>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.1}
                  value={look[axis]}
                  disabled={!ready}
                  data-testid={`look-${axis}`}
                  className="mt-2 block w-full accent-neon-cyan"
                  onChange={(e) => chooseLook({ ...look, [axis]: Number(e.target.value) })}
                />
              </label>
            ))}
          </div>

          <fieldset>
            <legend className={label}>Field card</legend>
            <div className="mt-2 flex flex-wrap gap-2 uppercase tracking-[0.14em]">
              {FIELD_CARDS.map((card) => {
                const accent = fieldCardAccent(card.id);
                return (
                  <button
                    key={card.id}
                    type="button"
                    data-testid={`card-${card.id}`}
                    aria-pressed={cardId === card.id}
                    disabled={!ready}
                    className={`${button} flex items-center gap-2 ${cardId === card.id ? "border-white/70" : "border-white/20"} text-white/75`}
                    onClick={() => chooseCard(card.id)}
                  >
                    <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: `rgb(${accent.rgb.join(",")})` }} />
                    {card.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="max-w-md">
            <p className={label}>What it says, in turn</p>
            <ol data-testid="robot-lines" className="mt-2 list-decimal space-y-1 pl-4 text-[12px] normal-case tracking-normal text-white/70">
              {fieldCard(cardId).lines.map((words) => (
                <li key={words}>{words}</li>
              ))}
            </ol>
          </div>

          <div className="flex flex-wrap gap-2 uppercase tracking-[0.14em]">
            <button
              type="button"
              data-testid="poke"
              disabled={!ready}
              className={`${button} border-neon-violet/60 text-neon-violet`}
              onClick={poke}
            >
              Poke
            </button>
            <button
              type="button"
              data-testid="reset"
              disabled={!ready}
              className={`${button} border-white/25 text-white/70`}
              onClick={() => {
                if (!rive.current?.reset()) return;
                setMode(ROBOT.defaults.mode);
                setEnergy(ROBOT.defaults.energy);
                setLook({ x: 0, y: 0 });
                setCardId("ai");
                if (reduced) {
                  rive.current?.fire(ROBOT.props.settle);
                  settle();
                }
              }}
            >
              Reset
            </button>
          </div>

          <dl className="grid max-w-md gap-2 text-white/60 sm:grid-cols-2">
            <div>
              <dt className={label}>Runtime</dt>
              <dd data-testid="rive-status">{ready ? "ready" : "loading"}</dd>
            </div>
            <div>
              <dt className={label}>Showing (written by the file)</dt>
              <dd data-testid="rive-states">{states.join(", ") || "—"}</dd>
            </div>
            <div>
              <dt className={label}>Hover (its own listener)</dt>
              <dd data-testid="robot-hover">{String(readback.hover)}</dd>
            </div>
            <div>
              <dt className={label}>Reacting</dt>
              <dd data-testid="robot-reacting">{String(readback.reacting)}</dd>
            </div>
            <div>
              <dt className={label}>Presence</dt>
              <dd data-testid="robot-presence">{readback.presence || "—"}</dd>
            </div>
            <div>
              <dt className={label}>Motion</dt>
              <dd data-testid="robot-motion">{reduced ? "reduced: holds still, settles changes" : "full"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
