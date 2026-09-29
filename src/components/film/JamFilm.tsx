"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { cameraCreep, clamp01, lerp } from "@/components/film/craft";
import { nextTriggerState, reconcileTrigger, type TriggerState } from "@/components/film/cue-table";
import { FilmSubtitle } from "@/components/film/FilmSubtitle";
import type { JamCopy, JamDecision } from "@/components/film/jam-copy";
import type { JamCloud, JamFilmData, JamMark } from "@/components/film/jam-film-data";
import { CARS } from "@/illustrations/cars";
import { RiveLayer, type RiveLayerHandle } from "@/components/director/RiveLayer";
import { CARS_RIV_URL } from "@/components/director/rive-assets";
import { applyCamera, blendShots, cameraFor, wideShotOn, worldToViewport, type CameraState } from "@/lib/director/camera";
import { openOpacity, openScale } from "@/lib/director/household-transition";
import {
  BRAKE_CUE,
  PHONE_STRIP,
  PHONE_TRACK_SCALE,
  TRACK_VH,
  feetY,
  JAM_BEAT_STARTS,
  jamFrameAt,
  jamLayout,
  laneX,
  phoneMomentAt,
  phoneReadAt,
  phoneTrackAt,
  type JamFrame,
  type JamLayout,
} from "@/lib/director/jam-film";
import { ReaderProvider } from "@/components/reader/ReaderContext";
import { TermsDrawer } from "@/components/reader/TermsDrawer";
import { KindBadge } from "@/components/reader/KindBadge";
import { OrientationCard } from "@/components/reader/OrientationCard";
import { methodHref } from "@/lib/reader/kinds";
import type { StoryReader } from "@/stories/schemas/manifest";

type Props = {
  slug: string;
  reader: StoryReader;
  copy: JamCopy[];
  decision: JamDecision;
  data: JamFilmData;
};

declare global {
  interface Window {
    __jamFilm?: {
      progress: () => number;
      trackAt: (film: number) => number;
      readAt: (beat: number) => number;
      trigger: () => TriggerState;
    };
  }
}

function trackProgress(track: HTMLElement): number {
  const total = track.offsetHeight - window.innerHeight;
  if (total <= 0) return 0;
  return clamp01(-track.getBoundingClientRect().top / total);
}

function speedFill(mph: number): string {
  const t = clamp01((mph - 12) / 36);
  return `oklch(${(0.62 + t * 0.16).toFixed(3)} 0.16 ${(300 - t * 105).toFixed(0)})`;
}

function mixCloud(a: JamCloud, b: JamCloud, t: number): JamMark[] {
  const next = new Map(b.cars.map((car) => [car.id, car]));
  const seen = new Set<number>();
  const out: JamMark[] = [];
  for (const car of a.cars) {
    seen.add(car.id);
    const other = next.get(car.id);
    if (!other) {
      if (t < 0.5) out.push(car);
      continue;
    }
    out.push({
      id: car.id,
      lane: car.lane,
      y: lerp(car.y, other.y, t),
      mph: lerp(car.mph, other.mph, t),
      braking: t < 0.5 ? car.braking : other.braking,
    });
  }
  if (t >= 0.5) {
    for (const car of b.cars) if (!seen.has(car.id)) out.push(car);
  }
  return out;
}

function cloudAt(clouds: JamCloud[], t: number): JamMark[] {
  if (clouds.length === 0) return [];
  if (clouds.length === 1 || t <= 0) return clouds[0].cars;
  if (t >= 1) return clouds[clouds.length - 1].cars;
  const u = t * (clouds.length - 1);
  const i = Math.min(clouds.length - 2, Math.floor(u));
  return mixCloud(clouds[i], clouds[i + 1], u - i);
}

function marksAt(data: JamFilmData, frame: JamFrame): JamMark[] {
  const wide = data.snapshots[0]?.cars ?? [];
  if (frame.pull > 0.001) return cloudAt(data.snapshots, frame.pull);
  if (frame.trace <= 0.001) return wide;
  const lane2 = cloudAt(data.steps, frame.trace);
  const others = wide.filter((car) => car.lane !== data.featuredLane);
  const fade = 1 - frame.trace;
  return [...others.map((car) => ({ ...car, mph: car.mph })), ...lane2].filter(
    (car) => car.lane === data.featuredLane || fade > 0,
  );
}

export function JamFilm({ slug, reader, copy, decision, data }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const riveWrapRef = useRef<HTMLDivElement>(null);
  const riveRef = useRef<RiveLayerHandle>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const rampsRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const copyHeight = useRef(0);
  const stripHeight = useRef(PHONE_STRIP);
  const reduced = usePrefersReducedMotion();
  const reducedRef = useRef(reduced);
  const [beat, setBeat] = useState(0);
  const [viewport, setViewport] = useState({ width: 1280, height: 800, dpr: 1 });

  const layout = useMemo(() => jamLayout(viewport), [viewport]);
  const kit = useMemo(() => ({ slug, beats: reader.beats, terms: reader.terms }), [slug, reader.beats, reader.terms]);

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
    const card = copyRef.current;
    if (!card) return;
    const measure = () => {
      copyHeight.current = card.offsetHeight;
      const row = card.querySelector<HTMLElement>("[data-strip]");
      stripHeight.current = row ? Math.min(PHONE_STRIP, row.offsetTop + row.offsetHeight + 6) : PHONE_STRIP;
    };
    const observer = new ResizeObserver(measure);
    measure();
    observer.observe(card);
    return () => observer.disconnect();
  }, [beat]);

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const container = cameraRef.current;
    const canvas = canvasRef.current;
    if (!track || !stage || !container || !canvas) return;

    const lay: JamLayout = layout;
    const vp = { width: viewport.width, height: viewport.height };
    const ctx = canvas.getContext("2d");
    const focus = {
      x: laneX(lay.road, data.featuredLane),
      y: feetY(lay.road, data.featuredY, data.lengthFt),
    };
    let raf = 0;
    const momentAt = (progress: number) => (lay.wide ? { film: progress, card: 1 } : phoneMomentAt(progress));
    let last = momentAt(trackProgress(track)).film;
    let trigger: TriggerState = "armed";
    let camera: CameraState = { x: 0, y: 0, zoom: 1 };
    let lastBeat = -1;
    let quietTimer = 0;
    const started = performance.now();

    const quiet = () => {
      window.clearTimeout(quietTimer);
      if (!reducedRef.current) return;
      quietTimer = window.setTimeout(() => riveRef.current?.pause(), 400);
    };

    const draw = (frame: JamFrame, zoom: number) => {
      if (!ctx) return;
      const ratio = viewport.dpr * Math.max(1, zoom);
      const w = Math.round(vp.width * ratio);
      const h = Math.round(vp.height * ratio);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, vp.width, vp.height);
      const { road } = lay;
      ctx.save();
      ctx.beginPath();
      ctx.rect(road.x - 36, road.y - 8, road.width + 72, road.height + 16);
      ctx.clip();
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 1;
      for (let lane = 1; lane <= 5; lane++) {
        const x = laneX(road, lane);
        ctx.beginPath();
        ctx.moveTo(x, road.y);
        ctx.lineTo(x, road.y + road.height);
        ctx.stroke();
      }
      const rampAlpha = (1 - frame.focus) * frame.reveal;
      if (rampAlpha > 0.05) {
        ctx.globalAlpha = rampAlpha;
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        for (const ramp of data.ramps) {
          const y0 = feetY(road, ramp.y1, data.lengthFt);
          const y1 = feetY(road, ramp.y0, data.lengthFt);
          const x = laneX(road, 5) + 18;
          ctx.beginPath();
          ctx.moveTo(x, y0);
          ctx.lineTo(x, y1);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      const cars = marksAt(data, frame);
      for (const car of cars) {
        const x = laneX(road, car.lane);
        const y = feetY(road, car.y, data.lengthFt);
        const mine = car.id === data.featuredId;
        const alpha = frame.reveal * (mine ? 1 : 1 - 0.72 * frame.dim);
        if (alpha <= 0.02) continue;
        const opened = mine ? 1 - frame.open : 1;
        ctx.globalAlpha = alpha * opened;
        if (ctx.globalAlpha > 0.02) {
          ctx.fillStyle = speedFill(car.mph);
          ctx.beginPath();
          ctx.arc(x, y, mine ? 6 : 4.2, 0, Math.PI * 2);
          ctx.fill();
          if (car.braking) {
            ctx.fillStyle = "rgb(255, 72, 78)";
            ctx.beginPath();
            ctx.arc(x, y - 7, 1.7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        if (mine && frame.focus > 0.2 && frame.open < 0.35) {
          ctx.strokeStyle = "rgba(255,255,255,0.9)";
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
      ctx.globalAlpha = (1 - frame.focus) * frame.reveal;
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "11px ui-monospace, monospace";
      ctx.textAlign = "center";
      const aheadScreen = worldToViewport({ x: 0, y: road.y - 14 }, camera, { x: 0, y: 0 });
      const backScreen = worldToViewport({ x: 0, y: road.y + road.height + 16 }, camera, { x: 0, y: 0 });
      if (aheadScreen.y > 28) ctx.fillText("ahead", road.x + road.width / 2, road.y - 14);
      if (backScreen.y < lay.pictureBottom - 8) ctx.fillText("back", road.x + road.width / 2, road.y + road.height + 16);
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const reducedNow = reducedRef.current;
      const moment = momentAt(trackProgress(track));
      const progress = moment.film;
      const frame = jamFrameAt(progress, reducedNow);
      const card = reducedNow ? (moment.card >= 0.5 ? 1 : 0) : moment.card;
      const life = reducedNow ? 0 : 1;
      const creep = cameraCreep((now - started) / 1000, Math.max(frame.hold, lay.wide ? 0 : card), life);
      const close = { focus, zoom: lay.zoom, screen: lay.screen };
      const shot = blendShots(wideShotOn(focus), close, frame.focus);
      shot.zoom /= creep.span;
      shot.focus = { x: shot.focus.x + (creep.pan * vp.width) / shot.zoom, y: shot.focus.y };
      camera = cameraFor(shot);
      applyCamera(container, camera);
      draw(frame, camera.zoom);

      const wrap = riveWrapRef.current;
      if (wrap) {
        const boxH = lay.box * (CARS.height / CARS.width);
        const scale = openScale(frame.open, 8, lay.box, 0.12);
        wrap.style.left = `${focus.x - lay.box / 2}px`;
        wrap.style.top = `${focus.y - boxH / 2}px`;
        wrap.style.width = `${lay.box}px`;
        wrap.style.height = `${boxH}px`;
        wrap.style.transformOrigin = "50% 50%";
        wrap.style.transform = `scale(${scale})`;
        wrap.style.opacity = openOpacity(frame.open).toFixed(3);
        wrap.style.visibility = frame.open > 0.02 ? "visible" : "hidden";
      }

      const legend = legendRef.current;
      if (legend) {
        legend.style.opacity = frame.annotate.toFixed(3);
        const screen = worldToViewport(focus, camera, { x: 0, y: 0 });
        const scale = openScale(frame.open, 8, lay.box, 0.12);
        const boxW = lay.box * camera.zoom * scale;
        const boxH = lay.box * (CARS.height / CARS.width) * camera.zoom * scale;
        const left = screen.x - boxW / 2;
        const top = screen.y - boxH / 2;
        const right = left + boxW;
        const bottom = top + boxH;
        const roomRight = vp.width - right > 168;
        const spots = roomRight
          ? [
              { x: left + boxW * (318 / CARS.width), y: top - 14, transform: "translate(-50%, -100%)" },
              { x: right + 16, y: top + boxH * (92 / CARS.height), transform: "translate(0, -50%)" },
              { x: left + boxW * (78 / CARS.width), y: bottom + 14, transform: "translate(-50%, 0)" },
            ]
          : [0, 1, 2].map((i) => ({
              x: Math.max(12, left),
              y: top - 8 - (2 - i) * 32,
              transform: "translate(0, -100%)",
            }));
        legend.querySelectorAll<HTMLElement>("[data-legend]").forEach((node, i) => {
          const spot = spots[i];
          if (!spot) return;
          node.style.left = `${spot.x}px`;
          node.style.top = `${spot.y}px`;
          node.style.transform = spot.transform;
        });
      }

      const ramps = rampsRef.current;
      if (ramps) {
        const alpha = (1 - frame.focus) * frame.reveal;
        ramps.style.opacity = alpha.toFixed(3);
        ramps.querySelectorAll<HTMLElement>("[data-ramp]").forEach((node) => {
          const ramp = data.ramps.find((item) => item.role === node.dataset.ramp);
          if (!ramp) return;
          const midY = (feetY(lay.road, ramp.y0, data.lengthFt) + feetY(lay.road, ramp.y1, data.lengthFt)) / 2;
          const screen = worldToViewport(
            { x: lay.road.x + lay.road.width + 14, y: midY },
            camera,
            { x: 0, y: 0 },
          );
          const w = node.offsetWidth;
          const h = node.offsetHeight;
          const x = Math.min(Math.max(8, screen.x), vp.width - 8 - w);
          const y = Math.min(Math.max(8, screen.y - h / 2), lay.pictureBottom - 8 - h);
          node.style.left = `${x}px`;
          node.style.top = `${y}px`;
        });
      }

      const copyEl = copyRef.current;
      if (copyEl) {
        const drop = lay.wide ? 0 : (1 - card) * Math.max(0, copyHeight.current - stripHeight.current);
        copyEl.style.transform = lay.wide ? "" : `translate3d(0, ${drop.toFixed(1)}px, 0)`;
        copyEl.dataset.card = card > 0.99 ? "up" : card < 0.01 ? "down" : "moving";
      }

      const rive = riveRef.current;
      if (rive?.isReady()) {
        const visible = frame.open > 0.35;
        const action = reconcileTrigger(BRAKE_CUE, last, progress, trigger, { visible, reduced: reducedNow });
        if (action === "fire") rive.fire(CARS.inputs.brake);
        else if (action === "settle") {
          rive.setBool(CARS.inputs.braked, true);
          quiet();
        } else if (action === "reset") {
          rive.reset();
          if (!visible) rive.pause();
          quiet();
        }
        trigger = nextTriggerState(trigger, action);
        stage.dataset.trigger = trigger;
      }
      last = progress;

      if (frame.beat !== lastBeat) {
        lastBeat = frame.beat;
        stage.dataset.beat = String(frame.beat);
        setBeat(frame.beat);
      }
    };
    raf = requestAnimationFrame(tick);

    window.__jamFilm = {
      progress: () => last,
      trackAt: (film: number) => (lay.wide ? film : phoneTrackAt(film)),
      readAt: (beatIndex: number) => {
        if (!lay.wide) return phoneReadAt(beatIndex);
        const starts = JAM_BEAT_STARTS;
        return (starts[beatIndex] + (starts[beatIndex + 1] ?? 1)) / 2;
      },
      trigger: () => trigger,
    };

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(quietTimer);
      delete window.__jamFilm;
    };
  }, [layout, viewport, data]);

  const beatCopy = copy[beat] ?? copy[0];
  const legend = reader.legend;

  return (
    <ReaderProvider kit={kit}>
      <div className="bg-void text-white">
        <TermsDrawer beat={beat} />
        <a
          href="#the-decision"
          className="focus-ring sr-only left-4 top-20 z-50 bg-void px-3 py-2 font-mono text-xs uppercase tracking-wider text-white focus:not-sr-only focus:fixed"
        >
          Skip to the decision
        </a>
        <p className="sr-only" aria-live="polite">
          {beatCopy.title}. {beatCopy.paragraphs[0]}
        </p>

        <section className="mx-auto max-w-3xl px-5 pb-16 pt-28 md:pt-36">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan/80">
            Southbound US-101 · 15 June 2005
          </p>
          <h1
            data-testid="film-title"
            className="mt-4 font-display text-[clamp(2.4rem,6vw,4.6rem)] font-semibold leading-[0.95] tracking-[-0.04em]"
          >
            Why is the road ahead already moving?
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/65 md:text-xl">
            Where should the speed be held when the jam has moving traffic at its front?
          </p>
          <OrientationCard slug={slug} orientation={reader.orientation} className="mt-10" />
        </section>

        <div
          ref={trackRef}
          data-testid="jam-film"
          className="relative h-[var(--track-phone)] lg:h-[var(--track-wide)]"
          style={
            {
              "--track-phone": `${Math.round(TRACK_VH * PHONE_TRACK_SCALE)}vh`,
              "--track-wide": `${TRACK_VH}vh`,
            } as React.CSSProperties
          }
        >
          <div ref={stageRef} data-testid="film-stage" data-beat="0" className="sticky top-0 h-dvh overflow-hidden">
            <div ref={cameraRef} className="absolute inset-0">
              <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
              <div ref={riveWrapRef} className="absolute" style={{ opacity: 0, visibility: "hidden" }}>
                <RiveLayer
                  ref={riveRef}
                  src={CARS_RIV_URL}
                  artboard={{ name: CARS.name, width: CARS.width, height: CARS.height }}
                  stateMachine={CARS.stateMachine}
                  pixelRatio={viewport.dpr * layout.zoom}
                  testId="jam-cars"
                  className="h-full w-full"
                />
              </div>
            </div>

            <div ref={rampsRef} className="pointer-events-none absolute inset-0 z-10" data-testid="ramp-labels">
              {data.ramps.map((ramp) => (
                <p
                  key={ramp.role}
                  data-ramp={ramp.role}
                  className="absolute font-mono text-[11px] uppercase tracking-[0.14em] text-white/70"
                >
                  {ramp.role === "auxiliary" ? "lane" : ramp.role}
                </p>
              ))}
            </div>

            {legend ? (
              <div ref={legendRef} className="pointer-events-none absolute inset-0 z-10" style={{ opacity: 0 }} data-testid="legend">
                {legend.labels.map((label, i) => (
                  <p
                    key={label}
                    data-legend={i}
                    className="absolute max-w-[9rem] font-mono text-[10px] uppercase leading-snug tracking-[0.12em] text-white"
                    style={{ textShadow: "0 1px 2px oklch(0.12 0.025 264)" }}
                  >
                    {label}
                  </p>
                ))}
              </div>
            ) : null}

            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-void via-void/80 to-transparent" />
            <div ref={copyRef} data-testid="beat-copy" data-card="up" className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-5 max-lg:bg-void">
              <div className="pointer-events-auto">
                <FilmSubtitle
                  kicker={beatCopy.kicker}
                  title={beatCopy.title}
                  paragraphs={beatCopy.paragraphs}
                  beat={beat}
                  slug={slug}
                  kind={beatCopy.kind}
                  figure={beatCopy.figure}
                  figureNote={beatCopy.figureNote}
                  caveat={beatCopy.caveat}
                />
              </div>
            </div>
          </div>
        </div>

        <DecisionSection slug={slug} decision={decision} />
      </div>
    </ReaderProvider>
  );
}

function DecisionSection({ slug, decision }: { slug: string; decision: JamDecision }) {
  return (
    <section id="the-decision" data-testid="the-decision" className="mx-auto max-w-3xl px-5 py-24">
      <div className="flex items-center gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan/80">Decision</p>
        <KindBadge kind="calculated" slug={slug} />
      </div>
      <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] md:text-4xl">{decision.title}</h2>
      <div className="mt-8 space-y-5 text-base leading-relaxed text-white/70 md:text-lg">
        {decision.paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 40)}>{paragraph}</p>
        ))}
      </div>
      <table className="mt-10 w-full max-w-lg font-mono text-[12px] text-white/75" data-testid="band-table">
        <caption className="mb-3 text-left font-sans text-sm text-white/50">
          Lanes 1–5, miles per hour. Back of the stretch, and the road ahead.
        </caption>
        <thead>
          <tr className="border-b border-white/15 text-left text-white/45">
            <th className="py-2 font-normal uppercase tracking-[0.08em]">Minutes</th>
            <th className="py-2 text-right font-normal uppercase tracking-[0.08em]">Back</th>
            <th className="py-2 text-right font-normal uppercase tracking-[0.08em]">Ahead</th>
          </tr>
        </thead>
        <tbody>
          {decision.bands.map((row) => (
            <tr key={row.label} className="border-b border-white/5">
              <td className="py-1.5">{row.label}</td>
              <td className="py-1.5 text-right">{row.upstream}</td>
              <td className="py-1.5 text-right">{row.downstream}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {decision.model ? (
        <div className="mt-8 flex items-start gap-3">
          <KindBadge kind="modelled" slug={slug} testId="model-badge" />
          <p className="text-sm leading-relaxed text-white/70">{decision.model}</p>
        </div>
      ) : null}
      <ul className="mt-10 list-disc space-y-2 pl-5 text-sm leading-relaxed text-white/55">
        {decision.notClaimed.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <Link
        href={methodHref(slug)}
        data-testid="end-method-link"
        className="focus-ring mt-10 inline-block font-mono text-[11px] uppercase tracking-[0.14em] text-neon-cyan/85 hover:text-neon-cyan"
      >
        Method, data and schema →
      </Link>
      <p className="mt-6 text-xs leading-relaxed text-white/40">{decision.attribution}</p>
    </section>
  );
}
