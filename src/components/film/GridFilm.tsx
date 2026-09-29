"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { cameraCreep, clamp01, lerp } from "@/components/film/craft";
import { nextTriggerState, reconcileTrigger, type TriggerState } from "@/components/film/cue-table";
import { applyCamera, blendShots, cameraFor, wideShotOn, type CameraState } from "@/lib/director/camera";
import { openOpacity, openScale } from "@/lib/director/household-transition";
import {
  FIELD_RANGE,
  GRID_RUNS,
  PHONE_STRIP,
  PHONE_TRACK_SCALE,
  fieldPoint,
  gridFrameAt,
  gridLayout,
  GRID_BEAT_STARTS,
  gridRunAt,
  phoneMomentAt,
  phoneReadAt,
  phoneTrackAt,
  type GridFrame,
  type GridLayout,
  type Rect,
} from "@/lib/director/grid-film";
import { GRID, gridGeometry, type GridValues } from "@/illustrations/grid";
import { RiveLayer, type RiveLayerHandle } from "@/components/director/RiveLayer";
import { GRID_RIV_URL } from "@/components/director/rive-assets";
import { ReaderProvider } from "@/components/reader/ReaderContext";
import { TermText } from "@/components/reader/TermText";
import { TermsDrawer } from "@/components/reader/TermsDrawer";
import { KindBadge } from "@/components/reader/KindBadge";
import { OrientationCard } from "@/components/reader/OrientationCard";
import { methodHref } from "@/lib/reader/kinds";
import type { GridCopy, GridDecision } from "@/components/film/grid-copy";
import type { StoryReader } from "@/stories/schemas/manifest";

export type GridFilmData = {
  /** Filtered 10 Hz trace, Hz, one sample every `sampleSeconds`. */
  trace: number[];
  sampleSeconds: number;
  onsetSeconds: number;
  nadirSeconds: number;
  nadirHz: number;
  onsetClock: string;
  /** Mean kinetic energy of every hour of the window, GWs. */
  hours: number[];
  /** Hour indices where fast reserve was bought. */
  reserveHours: number[];
  featuredHour: number;
  featuredGWs: number;
  months: { index: number; label: string }[];
  lightLineGWs: number;
};

type Props = {
  slug: string;
  reader: StoryReader;
  copy: GridCopy[];
  decision: GridDecision;
  data: GridFilmData;
  values: GridValues;
};

/** Screen radius of the featured hour when the camera is on it. */
const RING_WORLD = 5;
const RING_SHARE = 0.375;
const TRACE_TOP_HZ = 50.06;
const CHART = { t: 20, lo: 48.6, hi: 50.05 } as const;
/** Track length on a wide screen; a phone's adds the reading spans. */
const TRACK_VH = 1300;

declare global {
  interface Window {
    __gridFilm?: {
      /** Where the film is on its own timeline. */
      progress: () => number;
      /** Track progress that shows `film` with the phone narration lowered (identity on a wide screen). */
      trackAt: (film: number) => number;
      /** Track progress where a beat's narration is up to read. */
      readAt: (beat: number) => number;
      trigger: () => TriggerState;
      run: () => number;
      fires: () => number;
      camera: () => CameraState;
    };
  }
}

function trackProgress(track: HTMLElement): number {
  const total = track.offsetHeight - window.innerHeight;
  if (total <= 0) return 0;
  return clamp01(-track.getBoundingClientRect().top / total);
}

function lerpRect(a: Rect, b: Rect, t: number): Rect {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), width: lerp(a.width, b.width, t), height: lerp(a.height, b.height, t) };
}

function tracePath(data: GridFilmData, f: GridFrame, rect: Rect): string {
  const { trace, sampleSeconds } = data;
  const first = Math.max(0, Math.floor(f.t0 / sampleSeconds));
  const last = Math.min(trace.length - 1, Math.floor(Math.min(f.pen, f.t1) / sampleSeconds));
  if (last <= first) return "";
  const span = f.t1 - f.t0;
  const hzSpan = TRACE_TOP_HZ - f.yLo;
  let d = "";
  for (let i = first; i <= last; i++) {
    const x = ((i * sampleSeconds - f.t0) / span) * rect.width;
    const y = ((TRACE_TOP_HZ - trace[i]) / hzSpan) * rect.height;
    d += `${i === first ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

function curvePath(trace: number[], rect: Rect): string {
  const dt = CHART.t / (trace.length - 1);
  return trace
    .map((hz, i) => {
      const x = ((i * dt) / CHART.t) * rect.width;
      const y = ((CHART.hi - hz) / (CHART.hi - CHART.lo)) * rect.height;
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join("");
}

const hzY = (hz: number, rect: Rect) => ((CHART.hi - hz) / (CHART.hi - CHART.lo)) * rect.height;

export function GridFilm({ slug, reader, copy, decision, data, values }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const traceRef = useRef<HTMLDivElement>(null);
  const tracePathRef = useRef<SVGPathElement>(null);
  const nominalRef = useRef<SVGGElement>(null);
  const floorRef = useRef<SVGGElement>(null);
  const tripMarkRef = useRef<SVGGElement>(null);
  const nadirMarkRef = useRef<SVGGElement>(null);
  const ringRef = useRef<SVGGElement>(null);
  const machineRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<SVGGElement>(null);
  const legendReserveRef = useRef<SVGGElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const curveRefs = useRef<(SVGGElement | null)[]>([]);
  const fieldCanvasRef = useRef<HTMLCanvasElement>(null);
  const fieldAxesRef = useRef<SVGGElement>(null);
  const lineRef = useRef<SVGGElement>(null);
  const riveRef = useRef<RiveLayerHandle>(null);
  const reduced = usePrefersReducedMotion();
  const reducedRef = useRef(reduced);
  const [beat, setBeat] = useState(0);
  const [viewport, setViewport] = useState({ width: 1280, height: 800, dpr: 1 });
  const copyRef = useRef<HTMLDivElement>(null);
  const copyHeight = useRef(0);
  const stripHeight = useRef(PHONE_STRIP);

  const layout = useMemo(() => gridLayout(viewport), [viewport]);
  const dot = useMemo(
    () => fieldPoint(layout.field, data.featuredHour, data.hours.length, data.featuredGWs, FIELD_RANGE),
    [layout.field, data.featuredHour, data.hours.length, data.featuredGWs],
  );
  const geometry = useMemo(() => gridGeometry(), []);
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
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const container = cameraRef.current;
    const detail = detailRef.current;
    const canvas = fieldCanvasRef.current;
    if (!track || !stage || !container || !detail || !canvas) return;

    const lay: GridLayout = layout;
    const vp = { width: viewport.width, height: viewport.height };
    canvas.width = Math.round(vp.width * viewport.dpr);
    canvas.height = Math.round(vp.height * viewport.dpr);
    const ctx = canvas.getContext("2d");
    const reserveSet = new Set(data.reserveHours);
    const points = data.hours.map((gws, i) => fieldPoint(lay.field, i, data.hours.length, gws, FIELD_RANGE));

    let raf = 0;
    const momentAt = (progress: number) => (lay.wide ? { film: progress, card: 1 } : phoneMomentAt(progress));
    let last = momentAt(trackProgress(track)).film;
    let trigger: TriggerState = "armed";
    let run = -1;
    let fires = 0;
    let camera: CameraState = { x: 0, y: 0, zoom: 1 };
    let lastBeat = -1;
    let drawnField = -1;
    let drawnReserve = -1;
    let traceKey = "";
    let riveShown = false;
    let quietTimer = 0;
    const started = performance.now();

    const quiet = () => {
      window.clearTimeout(quietTimer);
      if (!reducedRef.current) return;
      quietTimer = window.setTimeout(() => riveRef.current?.pause(), 400);
    };

    const drawField = (field: number, reserve: number) => {
      if (!ctx) return;
      ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
      ctx.clearRect(0, 0, vp.width, vp.height);
      if (field <= 0.001) return;
      const steps = 10;
      const buckets: { white: Path2D; cyan: Path2D }[] = Array.from({ length: steps }, () => ({
        white: new Path2D(),
        cyan: new Path2D(),
      }));
      const n = points.length;
      for (let i = 0; i < n; i++) {
        const presence = clamp01((field * 1.25 - i / n) / 0.25);
        if (presence <= 0.01) continue;
        const step = Math.min(steps - 1, Math.floor(presence * steps));
        const p = points[i];
        const lit = reserve > 0 && reserveSet.has(i);
        const path = lit ? buckets[step].cyan : buckets[step].white;
        path.moveTo(p.x + 1.3, p.y);
        path.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
      }
      buckets.forEach((b, step) => {
        const a = (step + 1) / steps;
        ctx.fillStyle = `rgba(255,255,255,${(0.26 * a).toFixed(3)})`;
        ctx.fill(b.white);
        ctx.fillStyle = `rgba(92,214,226,${(lerp(0.26, 0.9, reserve) * a).toFixed(3)})`;
        ctx.fill(b.cyan);
      });
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const reducedNow = reducedRef.current;
      const moment = momentAt(trackProgress(track));
      const progress = moment.film;
      const f = gridFrameAt(progress, reducedNow);
      const card = reducedNow ? (moment.card >= 0.5 ? 1 : 0) : moment.card;
      const time = (now - started) / 1000;
      const life = reducedNow ? 0 : 1;

      // One camera: wide on the year, or held on the featured hour.
      const creep = cameraCreep(time, Math.max(f.hold, lay.wide ? 0 : card), life);
      const on = { focus: dot, zoom: lay.zoom, screen: lay.screen };
      const shot = blendShots(wideShotOn(dot), on, f.focus);
      shot.zoom /= creep.span;
      shot.focus = { x: shot.focus.x + (creep.pan * vp.width) / shot.zoom, y: shot.focus.y };
      camera = cameraFor(shot);
      applyCamera(container, camera);
      detail.style.transform = `translate3d(${dot.x}px, ${dot.y}px, 0) scale(${1 / lay.zoom})`;

      // On a phone the narration is up to read, or lowered to its strip while the picture plays.
      const copyEl = copyRef.current;
      if (copyEl) {
        const drop = lay.wide ? 0 : (1 - card) * Math.max(0, copyHeight.current - stripHeight.current);
        copyEl.style.transform = lay.wide ? "" : `translate3d(0, ${drop.toFixed(1)}px, 0)`;
        copyEl.dataset.card = card > 0.99 ? "up" : card < 0.01 ? "down" : "moving";
      }

      // The observed trace, folding into its hour.
      const traceEl = traceRef.current;
      if (traceEl) {
        const fold = 1 - f.trace;
        traceEl.style.opacity = String(clamp01(f.trace * 1.4 - 0.2));
        traceEl.style.transform = `scale(${lerp(1, 0.06, fold)})`;
        traceEl.style.visibility = f.trace > 0.01 ? "visible" : "hidden";
        const key = `${f.t0.toFixed(2)}|${f.t1.toFixed(2)}|${f.pen.toFixed(2)}|${f.yLo.toFixed(3)}`;
        if (key !== traceKey && f.trace > 0.01) {
          traceKey = key;
          tracePathRef.current?.setAttribute("d", tracePath(data, f, lay.trace));
          const y = (hz: number) => ((TRACE_TOP_HZ - hz) / (TRACE_TOP_HZ - f.yLo)) * lay.trace.height;
          const x = (s: number) => ((s - f.t0) / (f.t1 - f.t0)) * lay.trace.width;
          floorRef.current?.setAttribute("transform", `translate(0 ${y(49.0).toFixed(1)})`);
          floorRef.current?.setAttribute("opacity", clamp01((49.08 - f.yLo) / 0.12).toFixed(3));
          nominalRef.current?.setAttribute("transform", `translate(0 ${y(50).toFixed(1)})`);
          tripMarkRef.current?.setAttribute(
            "transform",
            `translate(${x(data.onsetSeconds).toFixed(1)} ${y(data.trace[Math.round(data.onsetSeconds / data.sampleSeconds)]).toFixed(1)})`,
          );
          tripMarkRef.current?.setAttribute("opacity", f.pen >= data.onsetSeconds ? "1" : "0");
          nadirMarkRef.current?.setAttribute(
            "transform",
            `translate(${x(data.nadirSeconds).toFixed(1)} ${y(data.nadirHz).toFixed(1)})`,
          );
          nadirMarkRef.current?.setAttribute("opacity", f.pen >= data.nadirSeconds + 0.5 ? "1" : "0");
        }
      }

      // The hour itself, ringed: visible once the trace has folded, under the machine and after.
      const openA = openOpacity(f.open);
      ringRef.current?.setAttribute("opacity", ((1 - f.trace) * (1 - openA)).toFixed(3));

      // MORPH: the machine opens out of the hour's ring.
      const box = machineRef.current;
      if (box) {
        const rect = lerpRect(lay.machine, lay.machineAside, f.split);
        const scale = openScale(f.open, RING_WORLD * lay.zoom, rect.width, RING_SHARE);
        box.style.left = `${rect.x}px`;
        box.style.top = `${rect.y}px`;
        box.style.width = `${rect.width}px`;
        box.style.height = `${rect.height}px`;
        box.style.transform = `scale(${scale})`;
        box.style.opacity = String(openA);
        box.style.visibility = openA > 0.001 ? "visible" : "hidden";
      }
      // On a phone the chart takes the space under the machine, where its caption sat: the caption leaves before the chart arrives.
      if (captionRef.current) captionRef.current.style.opacity = lay.wide ? "1" : String(clamp01(1 - 2 * f.split));
      legendRef.current?.setAttribute("opacity", f.legend.toFixed(3));
      legendReserveRef.current?.setAttribute("opacity", f.legendReserve.toFixed(3));

      const chart = chartRef.current;
      if (chart) {
        chart.style.opacity = String(clamp01((lay.wide ? f.split : 2 * f.split - 1) * openA));
        chart.style.visibility = f.split > 0.01 ? "visible" : "hidden";
      }
      [f.curveTypical, f.curveLight, f.curveReserve].forEach((draw, i) => {
        const g = curveRefs.current[i];
        if (!g) return;
        g.querySelector("path")?.setAttribute("stroke-dashoffset", (1 - draw).toFixed(4));
        g.querySelector("text")?.setAttribute("opacity", clamp01(draw * 3 - 2).toFixed(3));
      });

      // The year of hours.
      if (Math.abs(f.field - drawnField) > 0.002 || Math.abs(f.reserve - drawnReserve) > 0.002) {
        drawField(f.field, f.reserve);
        drawnField = f.field;
        drawnReserve = f.reserve;
      }
      fieldAxesRef.current?.setAttribute("opacity", clamp01(f.field * 2 - 1).toFixed(3));
      lineRef.current?.setAttribute("opacity", f.line.toFixed(3));

      // The machine's runs: reset into each, then fire or settle its trip.
      const rive = riveRef.current;
      const visible = f.open > 0.5;
      if (rive?.isReady()) {
        if (!reducedNow && visible !== riveShown) {
          if (visible) rive.play();
          else rive.pause();
        }
        riveShown = visible;
        const index = gridRunAt(progress);
        const current = GRID_RUNS[index];
        const inputs = () => {
          rive.setBool(GRID.props.light, current.light);
          rive.setBool(GRID.props.reserve, current.reserve);
        };
        if (index !== run) {
          rive.reset();
          inputs();
          if (!visible) rive.pause();
          trigger = "armed";
          run = index;
        }
        const action = reconcileTrigger(current.cue, last, progress, trigger, { visible, reduced: reducedNow });
        if (action === "fire") {
          rive.fire(GRID.props.trip);
          fires++;
        } else if (action === "settle") {
          rive.setBool(GRID.props.tripped, true);
          quiet();
        } else if (action === "reset") {
          rive.reset();
          inputs();
          if (!visible) rive.pause();
          quiet();
        }
        trigger = nextTriggerState(trigger, action);
        stage.dataset.trigger = trigger;
        stage.dataset.run = current.id;
      }
      last = progress;

      if (f.beat !== lastBeat) {
        lastBeat = f.beat;
        stage.dataset.beat = String(f.beat);
        setBeat(f.beat);
      }
    };
    raf = requestAnimationFrame(tick);

    window.__gridFilm = {
      progress: () => last,
      trackAt: (film: number) => (lay.wide ? film : phoneTrackAt(film)),
      readAt: (beat: number) => {
        if (!lay.wide) return phoneReadAt(beat);
        const starts = GRID_BEAT_STARTS;
        return (starts[beat] + (starts[beat + 1] ?? 1)) / 2;
      },
      trigger: () => trigger,
      run: () => run,
      fires: () => fires,
      camera: () => camera,
    };

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(quietTimer);
      delete window.__gridFilm;
    };
  }, [layout, viewport, dot, data]);

  const beatCopy = copy[beat] ?? copy[copy.length - 1];
  const legend = reader.legend;
  const variants = values.variants;
  const curves = [
    { key: "typical", trace: variants.heavy.traceHz, label: `typical hour · ${variants.heavy.kineticGWs} GWs`, stroke: "rgba(255,255,255,0.7)" },
    { key: "light", trace: variants.light.traceHz, label: `light hour · ${variants.light.kineticGWs} GWs`, stroke: "oklch(0.72 0.2 300)" },
    { key: "reserve", trace: variants.lightReserve.traceHz, label: "light hour + fast reserve", stroke: "oklch(0.78 0.14 195)" },
  ];
  const chartRect = layout.chart;
  const unitsPerPx = GRID.width / layout.machine.width;

  useEffect(() => {
    const node = document.getElementById("grid-film-status");
    if (node) node.textContent = `${beatCopy.kicker}. ${beatCopy.title} ${beatCopy.paragraphs.join(" ")}`;
  }, [beatCopy]);

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
        <p id="grid-film-status" className="sr-only" aria-live="polite" />

        <section data-testid="film-prologue" className="mx-auto max-w-3xl px-5 pb-16 pt-28 md:pt-36">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan/80">
            A year of the Nordic grid
          </p>
          <h1
            data-testid="film-title"
            className="mt-4 font-display text-[clamp(2.6rem,7vw,5.4rem)] font-semibold leading-[0.95] tracking-[-0.045em]"
          >
            When the spinning stops
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/65 md:text-xl">
            How much fast reserve should the grid hold when there is less spinning mass to hold it up?
          </p>
          <OrientationCard slug={slug} orientation={reader.orientation} className="mt-10" />
        </section>

        <div
          ref={trackRef}
          data-testid="grid-film"
          className="relative h-[var(--track-phone)] lg:h-[var(--track-wide)]"
          style={{ "--track-phone": `${Math.round(TRACK_VH * PHONE_TRACK_SCALE)}vh`, "--track-wide": `${TRACK_VH}vh` } as React.CSSProperties}
        >
          <div
            ref={stageRef}
            data-testid="film-stage"
            data-beat="0"
            className="sticky top-0 h-dvh overflow-hidden"
          >
            <div ref={cameraRef} data-testid="camera" className="absolute inset-0">
              <canvas ref={fieldCanvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
              <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                <FieldAxes layout={layout} data={data} groupRef={fieldAxesRef} lineRef={lineRef} />
                <g ref={ringRef} opacity="0" data-testid="featured-hour">
                  <circle cx={dot.x} cy={dot.y} r={1.6} fill="white" />
                  <circle
                    cx={dot.x}
                    cy={dot.y}
                    r={RING_WORLD}
                    fill="none"
                    stroke="oklch(0.72 0.2 300)"
                    strokeWidth={1.4}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              </svg>

              <div ref={detailRef} className="absolute left-0 top-0 origin-top-left" data-testid="detail">
                <div
                  ref={traceRef}
                  data-testid="trace-panel"
                  className="absolute origin-center"
                  style={{ left: layout.trace.x, top: layout.trace.y, width: layout.trace.width, height: layout.trace.height }}
                >
                  <TracePanel
                    rect={layout.trace}
                    data={data}
                    pathRef={tracePathRef}
                    nominalRef={nominalRef}
                    floorRef={floorRef}
                    tripRef={tripMarkRef}
                    nadirRef={nadirMarkRef}
                  />
                </div>

                <div
                  ref={machineRef}
                  data-testid="machine"
                  className="absolute origin-center"
                  style={{ visibility: "hidden", opacity: 0 }}
                >
                  <RiveLayer
                    ref={riveRef}
                    src={GRID_RIV_URL}
                    artboard={GRID}
                    stateMachine={GRID.stateMachine}
                    reports={GRID.reports}
                    pixelRatio={viewport.dpr}
                    className="absolute inset-0"
                    testId="grid-layer"
                  />
                  {legend ? (
                    <svg
                      viewBox={`0 0 ${GRID.width} ${GRID.height}`}
                      aria-hidden
                      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                      data-testid="legend"
                    >
                      <g ref={legendRef} opacity="0">
                        <LegendText x={geometry.dial.cx} y={geometry.dial.cy - geometry.dial.r - 14} unitsPerPx={unitsPerPx} tone="white">
                          {legend.labels[2]}
                        </LegendText>
                        <LegendText x={geometry.plant.x - 6} y={geometry.plant.y - geometry.plant.r - 10} unitsPerPx={unitsPerPx} tone="violet" anchor="start" dx={-40}>
                          {legend.labels[1]}
                        </LegendText>
                        <LegendText x={(geometry.shaft.x1 + geometry.shaft.x2) / 2} y={geometry.shaft.y + 30} unitsPerPx={unitsPerPx} tone="white">
                          {legend.labels[0]}
                        </LegendText>
                      </g>
                      {legend.labels[3] ? (
                        <g ref={legendReserveRef} opacity="0">
                          <LegendText x={geometry.reserve.x} y={geometry.reserve.y + 30} unitsPerPx={unitsPerPx} tone="cyan">
                            {legend.labels[3]}
                          </LegendText>
                        </g>
                      ) : null}
                    </svg>
                  ) : null}
                  {legend ? (
                    <p
                      ref={captionRef}
                      data-testid="legend-caption"
                      className="absolute inset-x-0 top-full mt-1 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-white/45"
                    >
                      {legend.caption}
                    </p>
                  ) : null}
                </div>

                <div
                  ref={chartRef}
                  data-testid="model-chart"
                  className="absolute"
                  style={{ left: chartRect.x, top: chartRect.y, width: chartRect.width, height: chartRect.height, visibility: "hidden", opacity: 0 }}
                >
                  <ModelChart rect={chartRect} curves={curves} curveRefs={curveRefs} />
                </div>
              </div>
            </div>

            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 hidden w-[42%] bg-gradient-to-r from-void via-void/85 to-transparent lg:block"
            />

            <div
              ref={copyRef}
              data-testid="beat-copy"
              data-card="up"
              className="pointer-events-none absolute inset-x-0 bottom-0 bg-void px-5 pb-8 pt-4 lg:inset-x-auto lg:bottom-auto lg:left-10 lg:top-1/2 lg:w-[32%] lg:-translate-y-1/2 lg:bg-transparent lg:p-0"
            >
              <div aria-hidden className="absolute inset-x-0 bottom-full h-6 bg-gradient-to-t from-void to-transparent lg:hidden" />
              <div className="max-w-xl">
                <BeatCopy copy={beatCopy} beat={beat} slug={slug} />
              </div>
            </div>
          </div>
        </div>

        <DecisionSection slug={slug} decision={decision} />
      </div>
    </ReaderProvider>
  );
}

/** One beat's narration: kicker and label first, so they are what stays on the phone strip. */
function BeatCopy({ copy, beat, slug }: { copy: GridCopy; beat: number; slug: string }) {
  return (
    <>
      <div data-strip className="flex flex-wrap items-center gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon-cyan/75">{copy.kicker}</p>
        <KindBadge kind={copy.kind} slug={slug} />
      </div>
      <h2 className="mt-2 font-display text-2xl font-semibold leading-[1.08] tracking-[-0.03em] md:text-3xl">{copy.title}</h2>
      <TermText paragraphs={copy.paragraphs} beat={beat} className="mt-3 space-y-2 text-sm leading-relaxed text-white/70 md:text-base" />
      {copy.figure ? (
        <p className="mt-4">
          <span data-testid="hero-figure" className="font-display text-4xl font-semibold tracking-[-0.04em] text-neon-cyan md:text-5xl">
            {copy.figure}
          </span>
          {copy.figureNote ? (
            <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">{copy.figureNote}</span>
          ) : null}
        </p>
      ) : null}
      {copy.caveat ? (
        <p data-testid="beat-caveat" className="mt-3 border-l border-white/15 pl-3 text-xs leading-relaxed text-white/45">
          {copy.caveat}
        </p>
      ) : null}
    </>
  );
}

/** Labels drawn over curves or dots keep a background-coloured outline. */
const HALO = {
  paintOrder: "stroke",
  stroke: "oklch(0.12 0.025 264)",
  strokeWidth: 4,
  strokeLinejoin: "round",
} as const;

function TracePanel({
  rect,
  data,
  pathRef,
  nominalRef,
  floorRef,
  tripRef,
  nadirRef,
}: {
  rect: Rect;
  data: GridFilmData;
  pathRef: React.Ref<SVGPathElement>;
  nominalRef: React.Ref<SVGGElement>;
  floorRef: React.Ref<SVGGElement>;
  tripRef: React.Ref<SVGGElement>;
  nadirRef: React.Ref<SVGGElement>;
}) {
  return (
    <svg width={rect.width} height={rect.height} className="overflow-visible" aria-hidden>
      <g ref={nominalRef}>
        <line x1={0} x2={rect.width} y1={0} y2={0} stroke="rgba(255,255,255,0.14)" strokeDasharray="2 6" />
        <text x={0} y={-8} fill="rgba(255,255,255,0.45)" fontSize={10} letterSpacing={1.4} className="font-mono uppercase">
          50 Hz
        </text>
      </g>
      <g ref={floorRef} opacity="0" data-testid="trace-floor">
        <line x1={0} x2={rect.width} y1={0} y2={0} stroke="oklch(0.72 0.2 300)" strokeDasharray="5 5" strokeWidth={1.2} />
        <text x={0} y={-8} fill="oklch(0.72 0.2 300)" fontSize={10} letterSpacing={1.4} className="font-mono uppercase">
          floor · 49.0 Hz
        </text>
      </g>
      <path ref={pathRef} fill="none" stroke="oklch(0.78 0.14 195)" strokeWidth={1.8} strokeLinejoin="round" data-testid="trace-path" />
      <g ref={tripRef} opacity="0">
        <line x1={0} x2={0} y1={-34} y2={10} stroke="rgba(255,255,255,0.4)" />
        <text x={6} y={-24} fill="rgba(255,255,255,0.7)" fontSize={10} letterSpacing={1.4} className="font-mono uppercase">
          trip · {data.onsetClock}
        </text>
      </g>
      <g ref={nadirRef} opacity="0">
        <circle r={3.5} fill="white" />
        <text x={0} y={22} textAnchor="middle" fill="white" fontSize={11} letterSpacing={1.4} className="font-mono uppercase" {...HALO}>
          lowest point · {data.nadirHz.toFixed(2)} Hz
        </text>
      </g>
    </svg>
  );
}

function LegendText({
  x,
  y,
  unitsPerPx,
  tone,
  anchor = "middle",
  dx = 0,
  children,
}: {
  x: number;
  y: number;
  unitsPerPx: number;
  tone: "white" | "violet" | "cyan";
  anchor?: "start" | "middle" | "end";
  dx?: number;
  children: string;
}) {
  const fill = tone === "violet" ? "oklch(0.72 0.2 300)" : tone === "cyan" ? "oklch(0.78 0.14 195)" : "rgba(255,255,255,0.8)";
  return (
    <text
      x={x + dx}
      y={y}
      textAnchor={anchor}
      fill={fill}
      fontSize={10.5 * unitsPerPx}
      letterSpacing={1.2 * unitsPerPx}
      style={{ fontFamily: "var(--font-mono), ui-monospace, monospace", textTransform: "uppercase" }}
      paintOrder="stroke"
      stroke="oklch(0.12 0.025 264)"
      strokeWidth={3 * unitsPerPx}
    >
      {children}
    </text>
  );
}

function ModelChart({
  rect,
  curves,
  curveRefs,
}: {
  rect: Rect;
  curves: { key: string; trace: number[]; label: string; stroke: string }[];
  curveRefs: React.RefObject<(SVGGElement | null)[]>;
}) {
  const inner = { x: 0, y: 18, width: rect.width - 8, height: rect.height - 36 };
  const floor = hzY(49.0, inner) + inner.y;
  const shed = hzY(48.8, inner) + inner.y;
  return (
    <svg width={rect.width} height={rect.height} className="overflow-visible" aria-hidden>
      <text x={0} y={10} fill="rgba(255,255,255,0.5)" fontSize={10} letterSpacing={1.4} className="font-mono uppercase">
        modelled · design case · first 20 s
      </text>
      <line x1={0} x2={inner.width} y1={floor} y2={floor} stroke="oklch(0.72 0.2 300)" strokeDasharray="5 5" />
      <text x={inner.width} y={floor - 5} textAnchor="end" fill="oklch(0.72 0.2 300)" fontSize={9} letterSpacing={1.2} className="font-mono uppercase" {...HALO}>
        floor 49.0
      </text>
      <line x1={0} x2={inner.width} y1={shed} y2={shed} stroke="rgba(255,255,255,0.18)" strokeDasharray="2 5" />
      <text x={inner.width} y={shed + 12} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize={9} letterSpacing={1.2} className="font-mono uppercase" {...HALO}>
        48.8 · customers cut
      </text>
      {curves.map((c, i) => {
        const d = curvePath(c.trace, inner);
        const end = c.trace[c.trace.length - 1];
        const nadir = Math.min(...c.trace);
        const labelY = inner.y + hzY(i === 1 ? nadir : end, inner) + (i === 1 ? 14 : -6);
        return (
          <g
            key={c.key}
            ref={(el) => {
              curveRefs.current[i] = el;
            }}
            data-curve={c.key}
          >
            <path
              d={d}
              transform={`translate(0 ${inner.y})`}
              fill="none"
              stroke={c.stroke}
              strokeWidth={1.8}
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1}
            />
            <text
              x={i === 1 ? inner.width * 0.42 : inner.width}
              y={labelY}
              textAnchor={i === 1 ? "start" : "end"}
              fill={c.stroke}
              fontSize={9.5}
              letterSpacing={1.1}
              opacity={0}
              className="font-mono uppercase"
              {...HALO}
            >
              {c.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function FieldAxes({
  layout,
  data,
  groupRef,
  lineRef,
}: {
  layout: GridLayout;
  data: GridFilmData;
  groupRef: React.Ref<SVGGElement>;
  lineRef: React.Ref<SVGGElement>;
}) {
  const { field } = layout;
  const y = (gws: number) => field.y + (1 - (gws - FIELD_RANGE.lo) / (FIELD_RANGE.hi - FIELD_RANGE.lo)) * field.height;
  const x = (i: number) => field.x + (i / Math.max(1, data.hours.length - 1)) * field.width;
  return (
    <>
      <g ref={groupRef} opacity="0" data-testid="field-axes">
        {[150, 200, 250].map((g) => (
          <g key={g}>
            <line x1={field.x} x2={field.x + field.width} y1={y(g)} y2={y(g)} stroke="rgba(255,255,255,0.07)" />
            <text x={field.x - 8} y={y(g) + 3} textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize={10} className="font-mono">
              {g}
            </text>
          </g>
        ))}
        <text x={field.x - 8} y={field.y - 10} textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize={9} letterSpacing={1.2} className="font-mono uppercase">
          GWs
        </text>
        {data.months.map((m) => (
          <text key={m.label} x={x(m.index)} y={field.y + field.height + 18} fill="rgba(255,255,255,0.4)" fontSize={9} letterSpacing={1.2} className="font-mono uppercase">
            {m.label}
          </text>
        ))}
      </g>
      <g ref={lineRef} opacity="0" data-testid="light-line">
        <line
          x1={field.x}
          x2={field.x + field.width}
          y1={y(data.lightLineGWs)}
          y2={y(data.lightLineGWs)}
          stroke="oklch(0.72 0.2 300)"
          strokeDasharray="5 5"
        />
        <text x={field.x + field.width} y={y(data.lightLineGWs) - 6} textAnchor="end" fill="oklch(0.72 0.2 300)" fontSize={10} letterSpacing={1.2} className="font-mono uppercase" {...HALO}>
          light hours · below {data.lightLineGWs} GWs
        </text>
      </g>
    </>
  );
}

function DecisionSection({ slug, decision }: { slug: string; decision: GridDecision }) {
  return (
    <section id="the-decision" data-testid="the-decision" className="mx-auto max-w-3xl px-5 py-24">
      <div className="flex items-center gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan/80">Decision</p>
        <KindBadge kind="published" slug={slug} />
      </div>
      <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] md:text-4xl">{decision.title}</h2>
      <div className="mt-8 space-y-5 text-base leading-relaxed text-white/70 md:text-lg">
        {decision.paragraphs.map((p) => (
          <p key={p.slice(0, 32)}>{p}</p>
        ))}
      </div>
      <table className="mt-10 w-full max-w-md font-mono text-[12px] text-white/75" data-testid="trend-table">
        <caption className="mb-3 text-left font-sans text-sm text-white/50">{decision.trendCaption}</caption>
        <thead>
          <tr className="border-b border-white/15 text-left text-white/45">
            <th className="py-2 font-normal uppercase tracking-[0.08em]">Period</th>
            <th className="py-2 text-right font-normal uppercase tracking-[0.08em]">Hours below 150 GWs</th>
            <th className="py-2 pl-4 text-left font-normal uppercase tracking-[0.08em]">Kind</th>
          </tr>
        </thead>
        <tbody>
          {decision.trend.map((row) => (
            <tr key={row.period} className="border-b border-white/5">
              <td className="py-1.5">{row.period}</td>
              <td className="py-1.5 text-right">{row.hours.toLocaleString("en-GB")}</td>
              <td className="py-1.5 pl-4">
                <KindBadge kind={row.kind} slug={slug} testId="trend-kind" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
        Method, data and schema: every rule and all {decision.events} events →
      </Link>
      <p className="mt-6 text-xs leading-relaxed text-white/40">{decision.attribution}</p>
    </section>
  );
}
