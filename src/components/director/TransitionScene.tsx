"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMotionValue } from "framer-motion";
import type { FieldModel } from "@/lib/sim/book-field";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { cameraCreep } from "@/components/film/craft";
import { nextTriggerState, reconcileTrigger, type TriggerState } from "@/components/film/cue-table";
import { eur } from "@/components/film/format";
import { applyCamera, blendShots, cameraFor, wideShot, type CameraState } from "@/lib/director/camera";
import { EntityMap } from "@/lib/director/entity-map";
import type { Anchor } from "@/lib/director/anchors";
import {
  SHOCK_CUE,
  fieldFrame,
  openOpacity,
  openScale,
  transitionAt,
  transitionLayout,
} from "@/lib/director/household-transition";
import { HOUSEHOLD, householdGeometry, householdValues } from "@/illustrations/household";
import { DataLayer, type DataLayerHandle } from "@/components/director/DataLayer";
import { RiveLayer, type RiveLayerHandle } from "@/components/director/RiveLayer";
import { AnnotationLayer, type Label } from "@/components/director/AnnotationLayer";
import { HOUSEHOLD_RIV_URL } from "@/components/director/rive-assets";
import { EvidenceBadge } from "@/components/storytelling/EvidenceBadge";

type Props = { model: FieldModel };

/** Share of the household box the ring's radius takes (150 of 400). */
const RING_SHARE = 0.375;

/** Test and review hooks. Only this lab scene sets them. */
export type TransitionProbe = {
  entity: () => ReturnType<EntityMap["get"]>;
  dataAnchor: () => Anchor | null;
  illustrationAnchor: () => Anchor | null;
  camera: () => CameraState;
  trigger: () => TriggerState;
  fires: () => number;
  resets: () => number;
  riveStates: () => string[];
  progress: () => number;
};

declare global {
  interface Window {
    __transition?: TransitionProbe;
  }
}

function trackProgress(track: HTMLElement): number {
  const total = track.offsetHeight - window.innerHeight;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, -track.getBoundingClientRect().top / total));
}

export function TransitionScene({ model }: Props) {
  const featured = model.featured;
  const entityId = `loan-${featured.id}`;
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<SVGGElement>(null);
  const dataRef = useRef<DataLayerHandle>(null);
  const riveRef = useRef<RiveLayerHandle>(null);
  const reduced = usePrefersReducedMotion();
  const reducedRef = useRef(reduced);
  const annotate = useMotionValue(0);
  const [beat, setBeat] = useState(0);
  const [viewport, setViewport] = useState({ width: 1280, height: 800, dpr: 1 });

  const entities = useMemo(() => ({ [entityId]: featured.id }), [entityId, featured.id]);
  const entityMap = useMemo(() => {
    const map = new EntityMap();
    map.register({
      id: entityId,
      semanticType: "loan",
      dataReference: `sim:book-field/seed-42/loan/${featured.id}`,
      representation: "data-point",
      highlighted: true,
      state: { floating: featured.floating, shocked: false },
    });
    return map;
  }, [entityId, featured.id, featured.floating]);

  const values = useMemo(() => householdValues(featured), [featured]);
  const geometry = useMemo(() => householdGeometry(values), [values]);
  const labels = useMemo<Label[]>(
    () => [
      { id: "income", text: "income", x: 92, y: 140, anchor: "start", tone: "white" },
      {
        id: "buffer",
        text: "buffer",
        x: 118,
        y: (geometry.surfaceBefore + geometry.tank.y + geometry.tank.height) / 2 + 4,
        anchor: "end",
        tone: "cyan",
      },
      { id: "thin", text: "6% line", x: 292, y: geometry.thinY + 4, anchor: "start", tone: "white" },
      {
        id: "essentials",
        text: "essentials",
        x: geometry.essentials.x - 34,
        y: 380,
        anchor: "middle",
        tone: "white",
        leader: [geometry.essentials.x, 340, geometry.essentials.x - 24, 368],
      },
      {
        id: "payment",
        text: "payment",
        x: geometry.payment.x + 34,
        y: 380,
        anchor: "middle",
        tone: "violet",
        leader: [geometry.payment.x, 340, geometry.payment.x + 24, 368],
      },
    ],
    [geometry],
  );

  const layout = transitionLayout(viewport);
  const unitsPerPx = HOUSEHOLD.width / (layout.box * layout.zoom);
  const riveRatio = Math.min(4, viewport.dpr * layout.zoom);

  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () =>
      setViewport({
        width: stage.offsetWidth,
        height: stage.offsetHeight,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const container = cameraRef.current;
    const box = boxRef.current;
    if (!track || !stage || !container || !box) return;

    let raf = 0;
    let last = 0;
    let camera: CameraState = { x: 0, y: 0, zoom: 1 };
    let trigger: TriggerState = "armed";
    let fires = 0;
    let resets = 0;
    let riveShown = false;
    let quietTimer = 0;
    let progress = trackProgress(track);
    let lastBeat = -1;
    const started = performance.now();
    const ring = { x: 200, y: 200, width: 300, height: 300 };

    // Under reduced motion the household is shown in its state and then held.
    const quiet = () => {
      window.clearTimeout(quietTimer);
      if (!reducedRef.current) return;
      quietTimer = window.setTimeout(() => riveRef.current?.pause(), 400);
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const reducedNow = reducedRef.current;
      progress = trackProgress(track);
      const frame = transitionAt(progress, reducedNow);
      const vp = { width: stage.offsetWidth, height: stage.offsetHeight };
      const lay = transitionLayout(vp);
      const time = (now - started) / 1000;
      const life = reducedNow ? 0 : 1;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const zoomNow = Math.exp(Math.log(lay.zoom) * frame.focus);
      const data = dataRef.current;
      data?.paint(fieldFrame(frame), {
        time,
        life,
        resolution: dpr * (zoomNow > 1.15 ? lay.zoom : 1),
        labelScale: 1 / zoomNow,
      });
      const mark = data?.local(entityId);
      if (!mark) return;

      // FOCUS / TRACK / PULLBACK are one blend between two shots; the loan
      // shot is rebuilt from its anchor every frame, so the camera follows it.
      const creep = cameraCreep(time, frame.hold, life);
      const on = { focus: { x: mark.x, y: mark.y }, zoom: lay.zoom, screen: lay.screen };
      const shot = blendShots(wideShot(vp), on, frame.focus);
      shot.zoom /= creep.span;
      shot.focus.x += (creep.pan * vp.width) / shot.zoom;
      camera = cameraFor(shot);
      applyCamera(container, camera);

      // MORPH: the household opens from the loan's ring, on the loan.
      const scale = openScale(frame.open, mark.ring, lay.box, RING_SHARE);
      const opacity = openOpacity(frame.open);
      box.style.transform = `translate3d(${mark.x - lay.box / 2}px, ${mark.y - lay.box / 2}px, 0) scale(${scale})`;
      box.style.opacity = String(opacity);
      box.style.visibility = opacity > 0.001 ? "visible" : "hidden";
      if (fieldRef.current) fieldRef.current.style.opacity = String(1 - 0.7 * opacity);
      labelsRef.current?.setAttribute(
        "transform",
        `translate(${mark.x - lay.box / 2} ${mark.y - lay.box / 2}) scale(${lay.box / HOUSEHOLD.width})`,
      );
      annotate.set(frame.annotate);

      const rive = riveRef.current;
      const visible = frame.open > 0.5;
      if (rive?.isReady()) {
        if (!reducedNow && visible !== riveShown) {
          if (visible) rive.play();
          else rive.pause();
        }
        riveShown = visible;
        const action = reconcileTrigger(SHOCK_CUE, last, progress, trigger, {
          visible,
          reduced: reducedNow,
        });
        if (action === "fire") {
          rive.fire(HOUSEHOLD.inputs.shock);
          fires++;
        } else if (action === "settle") {
          rive.setBool(HOUSEHOLD.inputs.constrained, true);
          quiet();
        } else if (action === "reset") {
          rive.reset();
          resets++;
          if (!visible) rive.pause();
          quiet();
        }
        trigger = nextTriggerState(trigger, action);
        last = progress;
      }

      entityMap.update(entityId, {
        representation: frame.open >= 0.5 ? "illustration" : "data-point",
        state: { shocked: frame.open >= 0.5 ? trigger !== "armed" : frame.featuredShock > 0.5 },
      });
      stage.dataset.representation = entityMap.get(entityId)?.representation;
      stage.dataset.trigger = trigger;
      if (frame.beat !== lastBeat) {
        lastBeat = frame.beat;
        stage.dataset.beat = String(frame.beat);
        setBeat(frame.beat);
      }
    };
    raf = requestAnimationFrame(tick);

    window.__transition = {
      entity: () => entityMap.get(entityId),
      dataAnchor: () => dataRef.current?.getAnchor(entityId) ?? null,
      illustrationAnchor: () => riveRef.current?.getAnchor(ring) ?? null,
      camera: () => camera,
      trigger: () => trigger,
      fires: () => fires,
      resets: () => resets,
      riveStates: () => riveRef.current?.states() ?? [],
      progress: () => progress,
    };

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(quietTimer);
      delete window.__transition;
    };
  }, [annotate, entityId, entityMap]);

  const copy = copyFor(beat, model);

  return (
    <div className="bg-void text-white">
      <section className="mx-auto max-w-3xl px-5 pb-10 pt-28">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan/80">
          Engine lab · gate 2
        </p>
        <h1 className="mt-4 font-display text-[clamp(2rem,4.5vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
          One loan, from the data to the household and back.
        </h1>
        <p className="mt-6 text-white/65">
          Scroll moves the reader through one transition. The camera pushes in on a single dot in
          the modelled book, the dot opens into the household it stands for, the rate shock plays as
          a mechanism, and the household closes back into the same dot, which then moves in the
          data. This page proves the engine can do that. It is not a story.
        </p>
      </section>

      <div ref={trackRef} className="relative h-[760vh]" data-testid="transition-track">
        <div
          ref={stageRef}
          data-testid="transition-stage"
          data-beat="0"
          className="sticky top-0 h-dvh overflow-hidden"
        >
          <div ref={cameraRef} className="absolute inset-0" data-testid="camera">
            <div ref={fieldRef} className="absolute inset-0">
              <DataLayer model={model} entities={entities} className="absolute inset-0 h-full w-full" ref={dataRef} />
            </div>
            <div
              ref={boxRef}
              className="absolute left-0 top-0 origin-center"
              style={{ width: layout.box, height: layout.box, visibility: "hidden", opacity: 0 }}
            >
              <RiveLayer
                ref={riveRef}
                src={HOUSEHOLD_RIV_URL}
                artboard={HOUSEHOLD}
                stateMachine={HOUSEHOLD.stateMachine}
                pixelRatio={riveRatio}
                className="h-full w-full"
                testId="household-layer"
              />
            </div>
            <AnnotationLayer labels={labels} progress={annotate} unitsPerPx={unitsPerPx} groupRef={labelsRef} />
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-void from-30% via-void/90 to-transparent md:hidden"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 hidden w-[min(100%,34rem)] bg-gradient-to-r from-void from-[30%] via-void/85 to-transparent md:block"
          />

          <div className="pointer-events-none absolute left-5 right-5 top-16 max-w-sm md:left-10 md:top-24" data-testid="transition-copy">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon-cyan/80">{copy.kicker}</p>
            <h2 className="mt-3 font-display text-[clamp(1.5rem,2.6vw,2.3rem)] font-semibold leading-[1.06] tracking-[-0.03em]">
              {copy.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70 md:text-[15px]">{copy.body}</p>
          </div>
          <p className="sr-only" aria-live="polite">
            {`${copy.title} ${copy.body}`}
          </p>
        </div>
      </div>

      <section className="mx-auto max-w-3xl px-5 py-20">
        <EvidenceBadge
          kind="modeled"
          lines={[
            `Loan ${featured.id} in the seed-42 book of 2,000 modelled mortgages (the When Rates Rise model).`,
            "The household's tank level, thin line and payment stroke are proportions of that loan's modelled buffer, 6% of its income, and its payment before and after a +300 bp reset.",
            "Not a real household, not a forecast, not credit advice.",
          ]}
        />
      </section>
    </div>
  );
}

function copyFor(beat: number, model: FieldModel) {
  const f = model.featured;
  switch (beat) {
    case 0:
      return {
        kicker: "2,000 modelled mortgages",
        title: "One of these dots is ringed.",
        body: "Each dot is a loan in the When Rates Rise book. Across is what the household has left each month as a share of income; up is how much is still owed. Follow the ringed one.",
      };
    case 1:
      return {
        kicker: `Loan ${f.id} · floating`,
        title: "Get close to one loan.",
        body: `${eur(f.balance)} still owed on a floating rate. ${eur(f.incomeMonthly)} comes in each month and ${eur(f.bufferBefore)} is left after essentials and the payment.`,
      };
    case 2:
      return {
        kicker: "The dot is a household",
        title: "Inside the dot is a household.",
        body: "Income falls into the tank. Essentials and the mortgage payment drain it. What stays is the buffer. The line is 6% of income, the story's teaching line for thin.",
      };
    case 3:
      return {
        kicker: "The coupon reprices +300 bp",
        title: "The payment pipe widens.",
        body: `The payment goes from ${eur(f.paymentBefore)} to ${eur(f.paymentAfter)} a month. Income and essentials stay put, so the buffer drains from ${eur(f.bufferBefore)} to ${eur(f.bufferAfter)}, below the line.`,
      };
    case 4:
      return {
        kicker: "Back to the data",
        title: "Same loan, now thin.",
        body: `The household closes into the same dot. The dot moves left across the line: loan ${f.id} now keeps ${eur(f.bufferAfter)} of ${eur(f.incomeMonthly)}.`,
      };
    default:
      return {
        kicker: "Then the book",
        title: "Every floating loan takes the same shock.",
        body: "The camera pulls back and the rest of the floating book reprices. Fixed-rate loans do not move. The ringed dot is still loan " + f.id + ".",
      };
  }
}
