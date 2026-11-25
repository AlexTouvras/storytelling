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
    line: "Temperature draws first. Pressure and rain wait in the wings.",
  },
  country: {
    kicker: "Across the country",
    title: "The field, not the pin",
    line: "A continuous surface clipped to the border — one place inside a national pattern.",
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
    line: "Rain amount rises through the same outlook — amount, not just chance.",
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

function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function smoothstep(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function beatAt(progress: number): BeatId {
  const i = Math.min(
    BEATS.length - 1,
    Math.max(0, Math.floor(progress * BEATS.length)),
  );
  return BEATS[i];
}

function beatLocal(progress: number): number {
  const n = BEATS.length;
  const x = progress * n;
  return x - Math.floor(x);
}

type Props = {
  place: Place;
  bundle: ForecastBundle;
};

export function WeatherFilm({ place, bundle }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [mapLayer, setMapLayer] = useState<MapLayer>("temp");
  const reduce = useReducedMotion();
  const a = useMemo(() => buildAnalytics(bundle), [bundle]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      const total = el.offsetHeight - window.innerHeight;
      const scrolled = -el.getBoundingClientRect().top;
      setProgress(total <= 0 ? 0 : clamp01(scrolled / total));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const beat = beatAt(progress);
  const local = beatLocal(progress);
  const copy = BEAT_COPY[beat];

  // Surface weights — soft morphs, but only one surface leads (no ghost charts)
  const hoursW =
    beat === "now" || beat === "today" || beat === "tonight"
      ? 1
      : beat === "country"
        ? 1 - smoothstep(Math.min(1, local * 2.2))
        : 0;
  const mapW =
    beat === "country"
      ? smoothstep(0.15 + local * 0.85)
      : beat === "today"
        ? Math.max(0, 1 - smoothstep(local * 1.8))
        : 0;
  const outlookW =
    beat === "days" ||
    beat === "precip" ||
    beat === "confidence" ||
    beat === "do"
      ? 1
      : beat === "tonight"
        ? smoothstep(Math.max(0, local - 0.7) / 0.3) * 0 // keep hours through tonight
        : 0;

  const mapPlace =
    place.countryCode || !bundle.grid?.countryCode
      ? place
      : { ...place, countryCode: bundle.grid.countryCode };

  const hours = hoursFor(beat, a, bundle);
  const annotation = annotationFor(beat, a, place, bundle);

  return (
    <div className="weather-film">
      <section className="film-prologue">
        <p className="kicker">Before you scroll</p>
        <h2>The forecast as a film, not a dashboard</h2>
        <p className="section__lede">
          One stage. Scroll moves the camera — hours stretch, the country field
          fills its border, the fortnight opens.{" "}
          {formatPlace(place)}.
        </p>
      </section>

      <div
        ref={trackRef}
        className="weather-film__track"
        style={{ height: `${BEATS.length * 95}vh` }}
        data-beat={beat}
      >
        <div className="weather-film__stage">
          <div className="film-stage__viz">
            <div
              className="film-layer"
              style={{
                opacity: hoursW,
                pointerEvents: hoursW > 0.4 ? "auto" : "none",
              }}
              aria-hidden={hoursW < 0.2}
            >
              <HoursRunway
                hours={hours}
                beat={beat}
                showPressure={beat === "now"}
                reduce={!!reduce}
                camera={
                  beat === "tonight" ? 0.65 : beat === "today" ? 0.35 : 0.15
                }
              />
            </div>

            <div
              className="film-layer film-layer--map"
              style={{
                opacity: mapW,
                pointerEvents: mapW > 0.4 ? "auto" : "none",
              }}
              aria-hidden={mapW < 0.2}
            >
              <CountryField
                place={mapPlace}
                cells={bundle.grid?.cells}
                bbox={bundle.grid?.bbox}
                countryLabel={bundle.grid?.countryName || place.country}
                layer={mapLayer}
                onLayerChange={setMapLayer}
                reveal={mapW}
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
              className="film-layer"
              style={{
                opacity: outlookW,
                pointerEvents: outlookW > 0.4 ? "auto" : "none",
              }}
              aria-hidden={outlookW < 0.2}
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
            <p className="film-stage__kicker">{copy.kicker}</p>
            <motion.h3
              key={copy.title}
              className="film-stage__title"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
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

        {/* Invisible beat anchors for scroll length + a11y headings */}
        {BEATS.map((id) => (
          <section
            key={id}
            id={id}
            className="film-beat-spacer"
            aria-label={BEAT_COPY[id].title}
          />
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
          . Borders: Natural Earth. No map tile API. Updated{" "}
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
  reduce,
  camera,
}: {
  hours: HourlyPoint[];
  beat: BeatId;
  showPressure: boolean;
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
            ? "Today, hour by hour"
            : "Next twelve hours"}
      </text>
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
  const showPrecip = beat === "precip" || beat === "do";
  const showEnsemble = beat === "confidence" || beat === "days" || beat === "do";
  const w = 960;
  const h = 420;
  const pad = { t: 36, r: 28, b: 44, l: 52 };
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
  const yPrecip = (v: number) =>
    pad.t + scale(v, [0, precipMax * 1.15], [innerH, 0]);
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
      {showPrecip &&
        daily.map((d, i) => (
          <rect
            key={d.date}
            x={xAt(i) - 5}
            width={10}
            y={yPrecip(d.precipSum)}
            height={Math.max(0, pad.t + innerH - yPrecip(d.precipSum))}
            className="chart__rain-bar"
            opacity={beat === "precip" ? 0.9 : 0.4}
          />
        ))}
      {daily
        .map((_, i) => i)
        .filter((i) => i % Math.ceil(daily.length / 7) === 0)
        .map((i) => (
          <text
            key={daily[i].date}
            x={xAt(i)}
            y={h - 14}
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
