import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  buildAnalytics,
  formatHourLabel,
} from "../lib/analytics";
import { formatPlace } from "../lib/location";
import { weatherLabel } from "../lib/weatherCode";
import type {
  DailyPoint,
  EnsembleDay,
  ForecastBundle,
  HourlyPoint,
  Place,
} from "../lib/types";
import type { MapLayer } from "../lib/idwField";
import {
  areaPath,
  linePath,
  niceDomain,
  scale,
  shortDay,
  shortHour,
} from "./charts/chartUtils";
import { CountryField } from "./CountryField";

const BEATS = [
  "now",
  "country",
  "today",
  "tonight",
  "days",
  "precip",
  "confidence",
  "do",
] as const;

type BeatId = (typeof BEATS)[number];

const BEAT_COPY: Record<
  BeatId,
  { kicker: string; title: string; line: string }
> = {
  now: {
    kicker: "Right now",
    title: "The hour you are in",
    line: "Temperature draws first. Feels-like rides beside it as a second path.",
  },
  country: {
    kicker: "Across the country",
    title: "Your place on the map",
    line: "OpenStreetMap under a national weather overlay — borders, cities, and the warmest and coldest spots called out.",
  },
  today: {
    kicker: "Today",
    title: "The day unfolds",
    line: "The same runway stretches through daylight. Watch where the heat peaks.",
  },
  tonight: {
    kicker: "Tonight",
    title: "Into the evening",
    line: "The camera slides toward night. The overnight low is the floor.",
  },
  days: {
    kicker: "Two weeks",
    title: "Highs and lows ahead",
    line: "Daily range opens as a band. The next fortnight, one continuous shape.",
  },
  precip: {
    kicker: "Rain",
    title: "Where water falls",
    line: "A precip strip under the outlook — amount through the fortnight, not just chance.",
  },
  confidence: {
    kicker: "Confidence",
    title: "How wide the band is",
    line: "Ensemble spread widens the story. Narrow is sure; wide is a range.",
  },
  do: {
    kicker: "What matters",
    title: "Take the short list",
    line: "The same forecast, reduced to what you actually do next.",
  },
};

type Props = {
  place: Place;
  bundle: ForecastBundle;
};

export function WeatherFilm({ place, bundle }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const sceneRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mapLayer, setMapLayer] = useState<MapLayer>("temp");
  const reduce = useReducedMotion();
  const a = useMemo(() => buildAnalytics(bundle), [bundle]);

  // Scroll-snap on the document while the film is mounted
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.scrollSnapType;
    root.style.scrollSnapType = "y proximity";
    root.classList.add("skylore-film-snap");
    return () => {
      root.style.scrollSnapType = prev;
      root.classList.remove("skylore-film-snap");
    };
  }, []);

  // IntersectionObserver — clear scene ownership
  useEffect(() => {
    const nodes = sceneRefs.current.filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        let best: { i: number; r: number } | null = null;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = Number((e.target as HTMLElement).dataset.beatIndex);
          if (Number.isNaN(i)) continue;
          if (!best || e.intersectionRatio > best.r) {
            best = { i, r: e.intersectionRatio };
          }
        }
        if (best) setActiveIndex(best.i);
      },
      { threshold: [0.35, 0.55, 0.75], rootMargin: "-10% 0px -25% 0px" },
    );
    for (const n of nodes) io.observe(n);
    return () => io.disconnect();
  }, []);

  const beat = BEATS[activeIndex] ?? "now";
  const copy = BEAT_COPY[beat];
  const progress = (activeIndex + 0.5) / BEATS.length;

  // Hard cuts between surface families; soft only within family
  const surface: "hours" | "map" | "outlook" =
    beat === "country"
      ? "map"
      : beat === "now" || beat === "today" || beat === "tonight"
        ? "hours"
        : "outlook";

  const mapPlace =
    place.countryCode || !bundle.grid?.countryCode
      ? place
      : { ...place, countryCode: bundle.grid.countryCode };

  const hours = hoursFor(beat, a, bundle);
  const annotation = annotationFor(beat, a, place, bundle);

  return (
    <div className="weather-film" data-beat={beat} data-surface={surface}>
      <section className="film-prologue">
        <p className="kicker">Before you scroll</p>
        <h2>The forecast as a film, not a dashboard</h2>
        <p className="section__lede">
          One stage. Each scene snaps into place — hours, the country field, then
          the fortnight. {formatPlace(place)}.
        </p>
      </section>

      <div ref={trackRef} className="weather-film__track">
        <div className="weather-film__stage">
          <div className="film-stage__viz">
            <div
              className={`film-layer ${surface === "hours" ? "is-lead" : ""}`}
              style={{
                opacity: surface === "hours" ? 1 : 0,
                pointerEvents: surface === "hours" ? "auto" : "none",
              }}
              aria-hidden={surface !== "hours"}
            >
              <HoursRunway
                hours={hours}
                beat={beat}
                showPressure={beat === "now"}
                showFeelsBand={beat === "now" || beat === "today"}
                reduce={!!reduce}
                camera={
                  beat === "tonight" ? 0.65 : beat === "today" ? 0.35 : 0.15
                }
              />
            </div>

            <div
              className={`film-layer film-layer--map ${surface === "map" ? "is-lead" : ""}`}
              style={{
                opacity: surface === "map" ? 1 : 0,
                pointerEvents: surface === "map" ? "auto" : "none",
              }}
              aria-hidden={surface !== "map"}
            >
              <CountryField
                place={mapPlace}
                cells={bundle.grid?.cells}
                bbox={bundle.grid?.bbox}
                countryLabel={bundle.grid?.countryName || place.country}
                layer={mapLayer}
                onLayerChange={setMapLayer}
                reveal={surface === "map" ? 1 : 0}
              />
              <div className="film-map-tabs" role="tablist">
                {(
                  [
                    ["temp", "Temp"],
                    ["precip", "Rain"],
                    ["wind", "Wind"],
                    ["pressure", "Pressure"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={mapLayer === key}
                    className={
                      mapLayer === key ? "map-tab map-tab--active" : "map-tab"
                    }
                    onClick={() => setMapLayer(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={`film-layer ${surface === "outlook" ? "is-lead" : ""}`}
              style={{
                opacity: surface === "outlook" ? 1 : 0,
                pointerEvents: surface === "outlook" ? "auto" : "none",
              }}
              aria-hidden={surface !== "outlook"}
            >
              <OutlookRunway
                beat={beat}
                daily={bundle.daily}
                ensembleDays={bundle.ensemble?.days}
                climateHighs={bundle.climate?.tempMeanMax}
                reduce={!!reduce}
              />
            </div>
          </div>

          <div className="film-stage__chrome">
            <div className="film-beat-rail" aria-hidden>
              {BEATS.map((id, i) => (
                <span
                  key={id}
                  className={
                    i === activeIndex
                      ? "film-beat-dot film-beat-dot--active"
                      : i < activeIndex
                        ? "film-beat-dot film-beat-dot--done"
                        : "film-beat-dot"
                  }
                />
              ))}
            </div>
            <p className="film-stage__kicker">
              <span className="film-stage__index">
                {String(activeIndex + 1).padStart(2, "0")} / {String(BEATS.length).padStart(2, "0")}
              </span>
              {copy.kicker}
            </p>
            <motion.h3
              key={copy.title}
              className="film-stage__title"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32 }}
            >
              {copy.title}
            </motion.h3>
            <p className="film-stage__line">{copy.line}</p>
            {annotation && (
              <p className="film-stage__annotation">{annotation}</p>
            )}
          </div>

          <div className="film-progress" aria-hidden>
            <div
              className="film-progress__bar"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {BEATS.map((id, i) => (
          <section
            key={id}
            id={id}
            data-beat-index={i}
            ref={(el) => {
              sceneRefs.current[i] = el;
            }}
            className={`film-scene ${i === activeIndex ? "is-active" : ""}`}
            aria-label={BEAT_COPY[id].title}
          >
            <div className="film-scene__card">
              <p className="film-scene__kicker">{BEAT_COPY[id].kicker}</p>
              <h3 className="film-scene__title">{BEAT_COPY[id].title}</h3>
              <p className="film-scene__line">{BEAT_COPY[id].line}</p>
            </div>
          </section>
        ))}
      </div>

      <section className="film-epilogue">
        <p className="kicker">Practical</p>
        <h2>What to do</h2>
        <ul className="list">
          {a.practical.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <footer className="footer">
          Data from{" "}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>
          . Basemap OpenStreetMap. Borders Natural Earth. Updated{" "}
          {new Date(bundle.fetchedAt).toLocaleString()}.
        </footer>
      </section>
    </div>
  );
}

function hoursFor(
  beat: BeatId,
  a: ReturnType<typeof buildAnalytics>,
  bundle: ForecastBundle,
): HourlyPoint[] {
  if (beat === "tonight") {
    return a.tonightHours.length ? a.tonightHours : a.nextHours;
  }
  if (beat === "today") {
    return a.todayHours.length ? a.todayHours : a.nextHours;
  }
  const idx = Math.max(
    0,
    bundle.hourly.findIndex((h) => h.time >= bundle.current.time),
  );
  return bundle.hourly.slice(idx, idx + 12);
}

function annotationFor(
  beat: BeatId,
  a: ReturnType<typeof buildAnalytics>,
  place: Place,
  bundle: ForecastBundle,
): string | null {
  if (beat === "now") {
    return `${Math.round(bundle.current.temperature)}° · ${weatherLabel(bundle.current.weatherCode)} in ${place.name}`;
  }
  if (beat === "today" && a.peakHeatHour) {
    return `Warmest near ${formatHourLabel(a.peakHeatHour.time)} · ${Math.round(a.peakHeatHour.temperature)}°`;
  }
  if (beat === "tonight") {
    return `Overnight low near ${Math.round(a.today.tempMin)}°`;
  }
  if (beat === "confidence") {
    return `Confidence ${a.confidence.score}/100 · ${a.confidence.label}`;
  }
  if (beat === "do") return a.practical[0] ?? null;
  return null;
}

function HoursRunway({
  hours,
  beat,
  showPressure,
  showFeelsBand,
  reduce,
  camera,
}: {
  hours: HourlyPoint[];
  beat: BeatId;
  showPressure: boolean;
  showFeelsBand: boolean;
  reduce: boolean;
  camera: number;
}) {
  if (!hours.length) {
    return <p className="story-stage__empty">Hourly detail loading…</p>;
  }
  const w = 960;
  const h = 420;
  const pad = { t: 36, r: showPressure ? 56 : 28, b: 44, l: 52 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const temps = hours.map((x) => x.temperature);
  const apps = hours.map((x) => x.apparent);
  const domain = niceDomain(
    Math.min(...temps, ...apps),
    Math.max(...temps, ...apps),
  );
  const precipMax = Math.max(...hours.map((x) => x.precipMm), 0.5);
  const pressVals = hours.map((x) => x.pressure).filter((v) => v > 800);
  const pressDomain = niceDomain(
    Math.min(...pressVals, 1000),
    Math.max(...pressVals, 1020),
    0.02,
  );
  const xAt = (i: number) =>
    pad.l + scale(i, [0, Math.max(hours.length - 1, 1)], [0, innerW]);
  const yTemp = (v: number) => pad.t + scale(v, domain, [innerH, 0]);
  const yPrecip = (v: number) =>
    pad.t + scale(v, [0, precipMax * 1.2], [innerH, 0]);
  const yPress = (v: number) => pad.t + scale(v, pressDomain, [innerH, 0]);
  const tempLine = hours.map((pt, i) => ({
    x: xAt(i),
    y: yTemp(pt.temperature),
  }));
  const appLine = hours.map((pt, i) => ({ x: xAt(i), y: yTemp(pt.apparent) }));
  // Alternate band between temp and feels-like (inspiration: hourly alts)
  const feelsHi = hours.map((pt, i) => ({
    x: xAt(i),
    y: yTemp(Math.max(pt.temperature, pt.apparent)),
  }));
  const feelsLo = hours.map((pt, i) => ({
    x: xAt(i),
    y: yTemp(Math.min(pt.temperature, pt.apparent)),
  }));
  const pressLine = hours.map((pt, i) => ({
    x: xAt(i),
    y: yPress(pt.pressure || pressDomain[0]),
  }));
  const hasRain = hours.some((h) => h.precipMm > 0.05);
  const camW = pad.l + innerW * (0.4 + camera * 0.55);

  return (
    <svg
      className="film-svg"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Hourly forecast runway"
    >
      <defs>
        <linearGradient id="filmCam" x1="0" x2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.rect
        x={pad.l}
        y={pad.t}
        height={innerH}
        fill="url(#filmCam)"
        initial={false}
        animate={{ width: Math.max(40, camW - pad.l) }}
        transition={{ duration: reduce ? 0 : 0.55 }}
      />
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = pad.t + innerH * (1 - t);
        const val = domain[0] + (domain[1] - domain[0]) * t;
        return (
          <g key={t}>
            <line
              x1={pad.l}
              x2={pad.l + innerW}
              y1={y}
              y2={y}
              className="chart__grid"
            />
            <text x={pad.l - 10} y={y + 4} textAnchor="end" className="chart__tick">
              {Math.round(val)}°
            </text>
          </g>
        );
      })}
      {showFeelsBand && (
        <path d={areaPath(feelsHi, feelsLo)} className="chart__feels-band" />
      )}
      {hasRain &&
        hours.map((pt, i) => (
          <rect
            key={pt.time}
            x={xAt(i) - 4}
            width={8}
            y={yPrecip(pt.precipMm)}
            height={Math.max(0, pad.t + innerH - yPrecip(pt.precipMm))}
            className="chart__rain-bar"
            opacity={0.45}
          />
        ))}
      <path d={linePath(appLine)} fill="none" className="chart__line chart__line--feel" />
      <motion.path
        d={linePath(tempLine)}
        fill="none"
        className="chart__line chart__line--temp"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reduce ? 0 : 0.8 }}
      />
      {showPressure && (
        <path
          d={linePath(pressLine)}
          fill="none"
          className="chart__line chart__line--pressure"
        />
      )}
      {hours
        .map((_, i) => i)
        .filter((i) => i % Math.ceil(hours.length / 6) === 0)
        .map((i) => (
          <text
            key={hours[i].time}
            x={xAt(i)}
            y={h - 14}
            textAnchor="middle"
            className="chart__tick"
          >
            {shortHour(hours[i].time)}
          </text>
        ))}
      <text x={pad.l} y={22} className="film-svg__caption">
        {beat === "tonight"
          ? "Evening into night"
          : beat === "today"
            ? "Today, hour by hour · temp vs feels-like"
            : "Next twelve hours · temp vs feels-like band"}
      </text>
      {showFeelsBand && (
        <g aria-hidden>
          <rect
            x={pad.l + innerW - 168}
            y={12}
            width={10}
            height={8}
            className="chart__feels-band"
          />
          <text
            x={pad.l + innerW - 152}
            y={20}
            className="chart__tick"
          >
            Feels-like spread
          </text>
        </g>
      )}
    </svg>
  );
}

function OutlookRunway({
  beat,
  daily,
  ensembleDays,
  climateHighs,
  reduce,
}: {
  beat: BeatId;
  daily: DailyPoint[];
  ensembleDays?: EnsembleDay[];
  climateHighs?: number[];
  reduce: boolean;
}) {
  if (!daily.length) {
    return <p className="story-stage__empty">Outlook unavailable.</p>;
  }
  const showPrecip = beat === "precip" || beat === "do" || beat === "days";
  const showEnsemble = beat === "confidence" || beat === "days" || beat === "do";
  const w = 960;
  const h = 440;
  const precipStrip = 56;
  const pad = { t: 36, r: 28, b: showPrecip ? 52 + precipStrip : 44, l: 52 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const all = [
    ...daily.map((d) => d.tempMax),
    ...daily.map((d) => d.tempMin),
    ...(ensembleDays?.map((d) => d.tempMaxMax) ?? []),
    ...(ensembleDays?.map((d) => d.tempMaxMin) ?? []),
    ...(climateHighs ?? []),
  ];
  const domain = niceDomain(Math.min(...all), Math.max(...all));
  const precipMax = Math.max(...daily.map((d) => d.precipSum), 0.5);
  const xAt = (i: number, n = daily.length) =>
    pad.l + scale(i, [0, Math.max(n - 1, 1)], [0, innerW]);
  const yAt = (v: number) => pad.t + scale(v, domain, [innerH, 0]);
  const stripTop = h - precipStrip - 18;
  const yPrecipStrip = (v: number) =>
    stripTop + scale(v, [0, precipMax * 1.1], [precipStrip - 8, 0]);
  const high = daily.map((d, i) => ({ x: xAt(i), y: yAt(d.tempMax) }));
  const low = daily.map((d, i) => ({ x: xAt(i), y: yAt(d.tempMin) }));
  const ensTop =
    ensembleDays?.map((d, i) => ({
      x: xAt(i, ensembleDays.length),
      y: yAt(d.tempMaxMax),
    })) ?? [];
  const ensBot =
    ensembleDays?.map((d, i) => ({
      x: xAt(i, ensembleDays.length),
      y: yAt(d.tempMaxMin),
    })) ?? [];

  return (
    <svg
      className="film-svg"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Two-week outlook"
    >
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = pad.t + innerH * (1 - t);
        const val = domain[0] + (domain[1] - domain[0]) * t;
        return (
          <g key={t}>
            <line
              x1={pad.l}
              x2={pad.l + innerW}
              y1={y}
              y2={y}
              className="chart__grid"
            />
            <text x={pad.l - 10} y={y + 4} textAnchor="end" className="chart__tick">
              {Math.round(val)}°
            </text>
          </g>
        );
      })}
      <path d={areaPath(high, low)} className="chart__temp-band" />
      <motion.path
        d={linePath(high)}
        fill="none"
        className="chart__line chart__line--temp"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reduce ? 0 : 0.7 }}
      />
      <path d={linePath(low)} fill="none" className="chart__line chart__line--low" />
      {showEnsemble && ensTop.length > 0 && (
        <motion.path
          d={areaPath(ensTop, ensBot)}
          className="chart__ensemble-band"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: beat === "confidence" ? 0.9 : 0.45 }}
        />
      )}
      {showPrecip && (
        <g className="film-precip-strip" aria-hidden={beat !== "precip"}>
          <text x={pad.l} y={stripTop - 6} className="film-svg__caption">
            Precip mm
          </text>
          <line
            x1={pad.l}
            x2={pad.l + innerW}
            y1={stripTop + precipStrip - 8}
            y2={stripTop + precipStrip - 8}
            className="chart__grid"
          />
          {daily.map((d, i) => (
            <rect
              key={d.date}
              x={xAt(i) - 5}
              width={10}
              y={yPrecipStrip(d.precipSum)}
              height={Math.max(
                0,
                stripTop + precipStrip - 8 - yPrecipStrip(d.precipSum),
              )}
              className="chart__rain-bar"
              opacity={beat === "precip" ? 0.95 : 0.55}
            />
          ))}
        </g>
      )}
      {daily
        .map((_, i) => i)
        .filter((i) => i % Math.ceil(daily.length / 7) === 0)
        .map((i) => (
          <text
            key={daily[i].date}
            x={xAt(i)}
            y={h - 8}
            textAnchor="middle"
            className="chart__tick"
          >
            {shortDay(daily[i].date)}
          </text>
        ))}
      <text x={pad.l} y={22} className="film-svg__caption">
        {beat === "precip"
          ? "Rain through the fortnight"
          : beat === "confidence"
            ? "Ensemble high band"
            : "14-day temperature range"}
      </text>
    </svg>
  );
}
