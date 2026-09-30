"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alignment } from "@rive-app/react-canvas";
import { RiveLayer, type RiveLayerHandle } from "@/components/director/RiveLayer";
import { ROBOT_RIV_URL } from "@/components/director/rive-assets";
import { fieldCard, fieldCardAccent, type FieldCardId } from "@/illustrations/field-cards";
import { ROBOT, robotLineProps } from "@/illustrations/robot";
import { argb } from "@/lib/rive/riv-writer";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";
import {
  CARD_FRAME_SANDBOX,
  fieldCardFramePath,
  parseSectionMessage,
  SCROLL_MESSAGE,
  speechLine,
} from "@/components/director/card-frame";

const SETTLE_MS = 1400;

/**
 * A field card in its own page, with the one robot as screen chrome.
 * The canvas does not take clicks, so the card's links keep working. The
 * button over the character fires the same tuck the file uses in the lab.
 * Words and accent come from the card, not from a second character.
 *
 * Scrolling says the line for the row, picker entry, or list item crossing
 * the reading band. Moving the pointer says the line for the block under the
 * cursor. A section with none of those keeps its own line. All six runs get
 * that one line, so the file's crossfade cannot swap in a different judgement.
 * A wheel that lands on the robot is forwarded into the sheet. If the sheet
 * cannot be framed, the six lines rotate as before.
 */
export function FieldCardStage({ card: id }: { card: FieldCardId }) {
  const card = fieldCard(id);
  const rive = useRef<RiveLayerHandle>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const hit = useRef<HTMLButtonElement>(null);
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = useState(false);
  const [presence, setPresence] = useState("");
  /** Framed sheet for this card. A fetch for a different card leaves this stale on purpose. */
  const [frame, setFrame] = useState<{ id: FieldCardId; html: string } | null>(null);
  /** Card whose sheet could not be fetched, so the bubble falls back to the rotation. */
  const [failed, setFailed] = useState<FieldCardId | null>(null);
  /** Section line reported by the bridge. Ignored when it belongs to another card. */
  const [speech, setSpeech] = useState<{ id: FieldCardId; line: string } | null>(null);
  const settleTimer = useRef<number | null>(null);
  const srcDoc = frame?.id === id ? frame.html : null;
  const plain = failed === id;
  const spoken = speech?.id === id ? speech.line : card.sections[0].line;

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
    const ac = new AbortController();
    const cardId = id;
    fetch(fieldCardFramePath(cardId), { signal: ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.text();
      })
      .then((html) => {
        if (ac.signal.aborted) return;
        setFrame({ id: cardId, html });
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setFailed(cardId);
      });
    return () => ac.abort();
  }, [card, id]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const report = parseSectionMessage(event.data);
      if (!report) return;
      const line = speechLine(card, report);
      if (line) setSpeech({ id, line });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [card, id]);

  useEffect(() => {
    if (!ready) return;
    const handle = rive.current;
    if (!handle) return;
    const accent = fieldCardAccent(id);
    const lines = plain ? [...card.lines] : robotLineProps().map(() => spoken);
    robotLineProps().forEach((prop, i) => handle.setString(prop, lines[i]));
    handle.setColor(ROBOT.props.accent, argb(accent.rgb[0], accent.rgb[1], accent.rgb[2]));
    if (!reduced) {
      handle.play();
      return;
    }
    handle.fire(ROBOT.props.settle);
    settle();
  }, [ready, reduced, settle, id, card, plain, spoken]);

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
        key={plain ? "plain" : srcDoc ? "tracked" : "loading"}
        ref={frameRef}
        title={card.title}
        {...(plain ? { src: card.url } : srcDoc ? { srcDoc, sandbox: CARD_FRAME_SANDBOX } : {})}
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
        onWheel={(event) => {
          frameRef.current?.contentWindow?.postMessage(
            { source: SCROLL_MESSAGE, x: event.deltaX, y: event.deltaY, mode: event.deltaMode },
            "*",
          );
        }}
      />
      <p className="sr-only" data-testid="robot-presence">
        {presence || "—"}
      </p>
      <p className="sr-only" data-testid="robot-section-line">
        {plain ? "" : spoken}
      </p>
    </div>
  );
}
