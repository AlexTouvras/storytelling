"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alignment } from "@rive-app/react-canvas";
import { RiveLayer, type RiveLayerHandle } from "@/components/director/RiveLayer";
import { ROBOT_RIV_URL } from "@/components/director/rive-assets";
import { fieldCard, fieldCardAccent, type FieldCardId } from "@/illustrations/field-cards";
import { ROBOT, robotLineProps } from "@/illustrations/robot";
import { argb } from "@/lib/rive/riv-writer";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";

const SETTLE_MS = 1400;

/**
 * A field card in its own page, with the one robot as screen chrome.
 * The canvas does not take clicks, so the card's links keep working. The
 * button over the character fires the same tuck the file uses in the lab.
 * Words and accent come from the card, not from a second character.
 */
export function FieldCardStage({ card: id }: { card: FieldCardId }) {
  const card = fieldCard(id);
  const rive = useRef<RiveLayerHandle>(null);
  const hit = useRef<HTMLButtonElement>(null);
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = useState(false);
  const [presence, setPresence] = useState("");
  const settleTimer = useRef<number | null>(null);

  const settle = useCallback(() => {
    if (!reduced) return;
    rive.current?.play();
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => rive.current?.pause(), SETTLE_MS);
  }, [reduced]);

  const place = useCallback((where: string) => {
    const button = hit.current;
    if (!button) return;
    const padTop = 80;
    const padRight = 16;
    const padBottom = 16;
    const boxW = window.innerWidth - padRight;
    const boxH = window.innerHeight - padTop - padBottom;
    const scale = Math.min(boxW, boxH) / ROBOT.width;
    const w = ROBOT.width * scale;
    const h = ROBOT.height * scale;
    const x = window.innerWidth - padRight - w;
    const y = window.innerHeight - padBottom - h;
    const parked = where === "parked";
    const cx = parked ? 0.88 : 0.5;
    const cy = parked ? 0.76 : 0.55;
    const bw = parked ? 0.2 : 0.38;
    const bh = parked ? 0.24 : 0.46;
    button.style.left = `${x + (cx - bw / 2) * w}px`;
    button.style.top = `${y + (cy - bh / 2) * h}px`;
    button.style.width = `${bw * w}px`;
    button.style.height = `${bh * h}px`;
  }, []);

  useEffect(() => {
    if (!ready) return;
    const handle = rive.current;
    if (!handle) return;
    const accent = fieldCardAccent(id);
    robotLineProps().forEach((prop, i) => handle.setString(prop, card.lines[i]));
    handle.setColor(ROBOT.props.accent, argb(accent.rgb[0], accent.rgb[1], accent.rgb[2]));
    if (!reduced) {
      handle.play();
      return;
    }
    handle.fire(ROBOT.props.settle);
    settle();
  }, [ready, reduced, settle, id, card]);

  useEffect(() => {
    if (!ready) return;
    const tick = () => {
      const next = String(rive.current?.read(ROBOT.props.presence) ?? "");
      setPresence((prev) => (prev === next ? prev : next));
      place(next);
    };
    tick();
    const interval = window.setInterval(tick, 200);
    window.addEventListener("resize", tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", tick);
    };
  }, [ready, place]);

  useEffect(
    () => () => {
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    },
    [],
  );

  const parked = presence === "parked";

  return (
    <div className="fixed inset-0 bg-[#eef2f6]">
      <style>{`body > div > header, body > div > footer { display: none !important; }`}</style>
      <iframe
        title={card.title}
        src={card.url}
        className="absolute inset-0 h-full w-full border-0"
        data-testid="field-card-frame"
      />
      <div className="pointer-events-none absolute inset-0 print:hidden">
        <RiveLayer
          ref={rive}
          src={ROBOT_RIV_URL}
          artboard={ROBOT}
          stateMachine={ROBOT.stateMachine}
          alignment={Alignment.BottomRight}
          className="absolute bottom-4 left-0 right-4 top-20"
          testId="rive-robot"
          onReady={() => setReady(true)}
        />
      </div>
      <button
        ref={hit}
        type="button"
        data-testid="robot-hit"
        className="focus-ring fixed z-10 cursor-pointer border-0 bg-transparent p-0 text-transparent print:hidden"
        aria-label={parked ? "Bring the robot back" : "Tuck the robot into the corner"}
        onClick={() => {
          rive.current?.fire(ROBOT.props.poke);
          if (reduced) settle();
        }}
      />
      <p className="sr-only" data-testid="robot-presence">
        {presence || "—"}
      </p>
    </div>
  );
}
