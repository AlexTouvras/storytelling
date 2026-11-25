import { motion, useReducedMotion } from "framer-motion";
import type {
  DailyPoint,
  EnsembleDay,
  ForecastBundle,
  HourlyPoint,
  Place,
  StoryAnalytics,
} from "../lib/types";
import {
  areaPath,
  linePath,
  niceDomain,
  scale,
  shortDay,
  shortHour,
} from "./charts/chartUtils";
import type { MapLayer } from "../lib/idwField";
import { CountryField } from "./CountryField";

export const STORY_BEATS = [
  "now",
  "country",
  "today",
  "tonight",
  "days",
  "precip",
  "wind",
  "air",
  "confidence",
  "seasonal",
  "do",
] as const;

export type StoryBeat = (typeof STORY_BEATS)[number];

type Props = {
  beat: string;
  place: Place;
  bundle: ForecastBundle;
  analytics: StoryAnalytics;
  mapLayer: MapLayer;
  onMapLayer: (layer: MapLayer) => void;
  next48: ForecastBundle["hourly"];
};

const TITLES: Record<string, string> = {
  now: "Right now",
  country: "Across the country",
  today: "Today’s hours",
  tonight: "Tonight",
  days: "Two-week outlook",
  precip: "Rain risk",
  wind: "Wind & pressure",
  air: "UV & air",
  confidence: "Model confidence",
  seasonal: "Vs last year",
  do: "What matters",
};

type Surface = "hours" | "map" | "outlook";

function surfaceFor(beat: string): Surface {
  if (beat === "country") return "map";
  if (
    beat === "days" ||
    beat === "precip" ||
    beat === "air" ||
    beat === "confidence" ||
    beat === "seasonal" ||
    beat === "do"
  ) {
    return "outlook";
  }
  // now / today / tonight / wind — same hourly runway, camera & layers morph
  return "hours";
}

function hoursForBeat(
  beat: string,
  a: StoryAnalytics,
  next48: HourlyPoint[],
): HourlyPoint[] {
  if (beat === "tonight") {
    return a.tonightHours.length ? a.tonightHours : a.nextHours;
  }
  if (beat === "today") {
    return a.todayHours.length ? a.todayHours : a.nextHours;
  }
  if (beat === "wind") return next48.slice(0, 36);
  return a.nextHours;
}

function annotationFor(
  beat: string,
  a: StoryAnalytics,
  place: Place,
): string | null {
  if (beat === "now") {
    return `${Math.round(a.nextHours[0]?.temperature ?? 0)}° now in ${place.name}`;
  }
  if (beat === "today" && a.peakHeatHour) {
    return `Warmest near ${shortHour(a.peakHeatHour.time)} · ${Math.round(a.peakHeatHour.temperature)}°`;
  }
  if (beat === "tonight") {
    return `Overnight low near ${Math.round(a.today.tempMin)}°`;
  }
  if (beat === "air") {
    return [a.uvAdvice, a.aqiAdvice].filter(Boolean).join(" · ") || null;
  }
  if (beat === "do") {
    return a.practical[0] ?? null;
  }
  if (beat === "confidence") {
    return `Confidence ${a.confidence.score}/100 · ${a.confidence.label}`;
  }
  return null;
}

export function LivingStage({
  beat,
  place,
  bundle,
  analytics: a,
  mapLayer,
  onMapLayer,
  next48,
}: Props) {
  const reduce = useReducedMotion();
  const title = TITLES[beat] ?? "Forecast";
  const surface = surfaceFor(beat);
  const hours = hoursForBeat(beat, a, next48);
  const note = annotationFor(beat, a, place);

  const mapPlace =
    place.countryCode || !bundle.grid?.countryCode
      ? place
      : { ...place, countryCode: bundle.grid.countryCode };

  return (
    <div className="story-stage living-stage" aria-live="polite" data-beat={beat}>
      <div className="story-stage__chrome">
        <p className="story-stage__kicker">Live view</p>
        <motion.h3
          key={title}
          className="story-stage__title"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {title}
        </motion.h3>
      </div>

      <div className="living-stage__viewport">
        {/* Persistent hours surface — camera/window morphs */}
        <motion.div
          className="living-layer"
          animate={{
            opacity: surface === "hours" ? 1 : 0,
            scale: surface === "hours" ? 1 : 0.97,
          }}
          transition={{ duration: reduce ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ pointerEvents: surface === "hours" ? "auto" : "none" }}
          aria-hidden={surface !== "hours"}
        >
          <HoursNarrative
            hours={hours}
            beat={beat}
            showPressure={beat === "now" || beat === "wind"}
            showWind={beat === "wind"}
            reduce={!!reduce}
          />
        </motion.div>

        {/* Persistent map — fades in for country beat */}
        <motion.div
          className="living-layer living-layer--map"
          animate={{
            opacity: surface === "map" ? 1 : 0,
            scale: surface === "map" ? 1 : 1.02,
          }}
          transition={{ duration: reduce ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ pointerEvents: surface === "map" ? "auto" : "none" }}
          aria-hidden={surface !== "map"}
        >
          <CountryField
            place={mapPlace}
            cells={bundle.grid?.cells}
            bbox={bundle.grid?.bbox}
            countryLabel={bundle.grid?.countryName || place.country}
            layer={mapLayer}
            onLayerChange={onMapLayer}
            reveal={1}
          />
        </motion.div>

        {/* Persistent outlook — layers reveal with scroll */}
        <motion.div
          className="living-layer"
          animate={{
            opacity: surface === "outlook" ? 1 : 0,
            scale: surface === "outlook" ? 1 : 0.97,
          }}
          transition={{ duration: reduce ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ pointerEvents: surface === "outlook" ? "auto" : "none" }}
          aria-hidden={surface !== "outlook"}
        >
          <OutlookNarrative
            beat={beat}
            daily={bundle.daily}
            ensembleDays={bundle.ensemble?.days}
            climateHighs={bundle.climate?.tempMeanMax}
            reduce={!!reduce}
          />
        </motion.div>

        {note && (
          <motion.p
            key={note}
            className="living-annotation"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {note}
          </motion.p>
        )}
      </div>
    </div>
  );
}

function HoursNarrative({
  hours,
  beat,
  showPressure,
  showWind,
  reduce,
}: {
  hours: HourlyPoint[];
  beat: string;
  showPressure: boolean;
  showWind: boolean;
  reduce: boolean;
}) {
  if (!hours.length) {
    return <p className="story-stage__empty">Hourly detail is loading…</p>;
  }

  const w = 720;
  const h = 280;
  const pad = { t: 28, r: showPressure || showWind ? 52 : 16, b: 36, l: 40 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const temps = hours.map((x) => x.temperature);
  const apps = hours.map((x) => x.apparent);
  const tempsDomain = niceDomain(
    Math.min(...temps, ...apps),
    Math.max(...temps, ...apps),
  );
  const precipMax = Math.max(...hours.map((x) => x.precipMm), 0.5);
  const precipDomain: [number, number] = [0, precipMax * 1.2];
  const pressVals = hours.map((x) => x.pressure).filter((v) => v > 800);
  const pressDomain = niceDomain(
    Math.min(...pressVals, 1000),
    Math.max(...pressVals, 1020),
    0.02,
  );
  const windVals = hours.map((x) => x.windSpeed);
  const windDomain = niceDomain(0, Math.max(...windVals, 10));

  const xAt = (i: number) =>
    pad.l + scale(i, [0, Math.max(hours.length - 1, 1)], [0, innerW]);
  const yTemp = (v: number) => pad.t + scale(v, tempsDomain, [innerH, 0]);
  const yPrecip = (v: number) => pad.t + scale(v, precipDomain, [innerH, 0]);
  const yPress = (v: number) => pad.t + scale(v, pressDomain, [innerH, 0]);
  const yWind = (v: number) => pad.t + scale(v, windDomain, [innerH, 0]);

  const tempLine = hours.map((pt, i) => ({ x: xAt(i), y: yTemp(pt.temperature) }));
  const appLine = hours.map((pt, i) => ({ x: xAt(i), y: yTemp(pt.apparent) }));
  const pressLine = hours.map((pt, i) => ({
    x: xAt(i),
    y: yPress(pt.pressure || pressDomain[0]),
  }));
  const windLine = hours.map((pt, i) => ({
    x: xAt(i),
    y: yWind(pt.windSpeed),
  }));

  const focusEnd =
    beat === "now" ? Math.min(11, hours.length - 1) : hours.length - 1;
  const cameraW = Math.max(xAt(focusEnd) - pad.l + 8, innerW * 0.35);

  const tickIdx = hours
    .map((_, i) => i)
    .filter((i) => i % Math.ceil(hours.length / 6) === 0);

  const hasRain = hours.some((h) => h.precipMm > 0.05 || h.precipProb >= 15);

  return (
    <figure className="chart living-chart">
      <figcaption className="chart__caption">
        <span>
          {beat === "tonight"
            ? "Evening into night"
            : beat === "today"
              ? "Today, hour by hour"
              : beat === "wind"
                ? "Next 36 hours · wind"
                : "Next 12 hours"}
        </span>
        <span className="chart__legend">
          <i className="swatch swatch--temp" /> Temp
          {!showWind && (
            <>
              <i className="swatch swatch--feel" /> Feels like
            </>
          )}
          {hasRain && beat !== "wind" && (
            <>
              <i className="swatch swatch--rain" /> Rain
            </>
          )}
          {showPressure && (
            <>
              <i className="swatch swatch--pressure" /> Pressure
            </>
          )}
          {showWind && (
            <>
              <i className="swatch swatch--feel" /> Wind
            </>
          )}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Hourly forecast">
        {/* Camera focus — dim outside window on "now" */}
        {beat === "now" && (
          <motion.rect
            x={pad.l}
            y={pad.t}
            height={innerH}
            fill="url(#camGlow)"
            initial={false}
            animate={{ width: cameraW }}
            transition={{ duration: reduce ? 0 : 0.55 }}
            opacity={0.12}
          />
        )}
        <defs>
          <linearGradient id="camGlow" x1="0" x2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.t + innerH * (1 - t);
          const val = tempsDomain[0] + (tempsDomain[1] - tempsDomain[0]) * t;
          return (
            <g key={t}>
              <line
                x1={pad.l}
                x2={pad.l + innerW}
                y1={y}
                y2={y}
                className="chart__grid"
              />
              <text x={pad.l - 8} y={y + 4} textAnchor="end" className="chart__tick">
                {Math.round(val)}°
              </text>
            </g>
          );
        })}

        {hasRain &&
          beat !== "wind" &&
          hours.map((pt, i) => (
            <motion.rect
              key={`r-${pt.time}`}
              x={xAt(i) - 3}
              width={6}
              y={yPrecip(pt.precipMm)}
              height={Math.max(0, pad.t + innerH - yPrecip(pt.precipMm))}
              className="chart__rain-bar"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 0.55 }}
              transition={{ delay: reduce ? 0 : i * 0.015 }}
            />
          ))}

        <motion.path
          d={linePath(appLine)}
          fill="none"
          className="chart__line chart__line--feel"
          initial={false}
          animate={{ pathLength: 1, opacity: showWind ? 0.25 : 0.85 }}
          transition={{ duration: reduce ? 0 : 0.6 }}
        />
        <motion.path
          d={linePath(tempLine)}
          fill="none"
          className="chart__line chart__line--temp"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduce ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
        {showPressure && (
          <motion.path
            d={linePath(pressLine)}
            fill="none"
            className="chart__line chart__line--pressure"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45 }}
          />
        )}
        {showWind && (
          <motion.path
            d={linePath(windLine)}
            fill="none"
            className="chart__line chart__line--feel"
            strokeWidth={2}
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduce ? 0 : 0.65 }}
          />
        )}

        {tickIdx.map((i) => (
          <text
            key={hours[i].time}
            x={xAt(i)}
            y={h - 10}
            textAnchor="middle"
            className="chart__tick"
          >
            {shortHour(hours[i].time)}
          </text>
        ))}
      </svg>
    </figure>
  );
}

function OutlookNarrative({
  beat,
  daily,
  ensembleDays,
  climateHighs,
  reduce,
}: {
  beat: string;
  daily: DailyPoint[];
  ensembleDays?: EnsembleDay[];
  climateHighs?: number[];
  reduce: boolean;
}) {
  if (!daily.length) {
    return <p className="story-stage__empty">Daily outlook unavailable.</p>;
  }

  const showPrecip = beat === "precip" || beat === "do";
  const showEnsemble =
    beat === "confidence" || beat === "days" || beat === "do";
  const showClimate = beat === "seasonal" || beat === "do";
  const emphasizePrecip = beat === "precip";

  const w = 720;
  const h = 300;
  const pad = { t: 24, r: 16, b: 40, l: 40 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const ensMax =
    ensembleDays?.map((d) => d.tempMaxMax).filter(Number.isFinite) ?? [];
  const ensMin =
    ensembleDays?.map((d) => d.tempMaxMin).filter(Number.isFinite) ?? [];
  const all = [
    ...daily.map((d) => d.tempMax),
    ...daily.map((d) => d.tempMin),
    ...ensMax,
    ...ensMin,
    ...(climateHighs ?? []).filter(Number.isFinite),
  ];
  const domain = niceDomain(Math.min(...all), Math.max(...all));
  const precipMax = Math.max(...daily.map((d) => d.precipSum), 0.5);

  const xAt = (i: number, n = daily.length) =>
    pad.l + scale(i, [0, Math.max(n - 1, 1)], [0, innerW]);
  const yAt = (v: number) => pad.t + scale(v, domain, [innerH, 0]);
  const yPrecip = (v: number) =>
    pad.t + scale(v, [0, precipMax * 1.15], [innerH, 0]);

  const highLine = daily.map((d, i) => ({ x: xAt(i), y: yAt(d.tempMax) }));
  const lowLine = daily.map((d, i) => ({ x: xAt(i), y: yAt(d.tempMin) }));
  const band = areaPath(highLine, lowLine);

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

  const climateLine =
    climateHighs?.map((v, i) => ({
      x: xAt(i),
      y: yAt(v),
    })) ?? [];

  const ticks = daily
    .map((_, i) => i)
    .filter((i) => i % Math.ceil(daily.length / 7) === 0);

  return (
    <figure className="chart living-chart">
      <figcaption className="chart__caption">
        <span>
          {emphasizePrecip
            ? "Rain chance & amount"
            : beat === "confidence"
              ? "Ensemble high band"
              : beat === "seasonal"
                ? "Vs same dates last year"
                : "14-day temperature range"}
        </span>
        <span className="chart__legend">
          <i className="swatch swatch--band" /> High–low
          {showEnsemble && ensembleDays && (
            <>
              <i className="swatch swatch--ensemble" /> Ensemble
            </>
          )}
          {showClimate && climateHighs && (
            <>
              <i className="swatch swatch--climate" /> Last year
            </>
          )}
          {showPrecip && (
            <>
              <i className="swatch swatch--rain" /> Rain
            </>
          )}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Outlook">
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
              <text x={pad.l - 8} y={y + 4} textAnchor="end" className="chart__tick">
                {Math.round(val)}°
              </text>
            </g>
          );
        })}

        <motion.path
          d={band}
          className="chart__temp-band"
          initial={false}
          animate={{ opacity: emphasizePrecip ? 0.35 : 1 }}
          transition={{ duration: 0.4 }}
        />
        <motion.path
          d={linePath(highLine)}
          fill="none"
          className="chart__line chart__line--temp"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduce ? 0 : 0.65 }}
        />
        <motion.path
          d={linePath(lowLine)}
          fill="none"
          className="chart__line chart__line--low"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduce ? 0 : 0.65, delay: reduce ? 0 : 0.05 }}
        />

        {showEnsemble && ensTop.length > 0 && (
          <motion.path
            d={areaPath(ensTop, ensBot)}
            className="chart__ensemble-band"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: beat === "confidence" ? 0.85 : 0.45 }}
            transition={{ duration: 0.5 }}
          />
        )}

        {showClimate && climateLine.length > 0 && (
          <motion.path
            d={linePath(climateLine)}
            fill="none"
            className="chart__line chart__line--climate"
            initial={reduce ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: reduce ? 0 : 0.6 }}
          />
        )}

        {showPrecip &&
          daily.map((d, i) => (
            <motion.rect
              key={`p-${d.date}`}
              x={xAt(i) - 5}
              width={10}
              y={yPrecip(d.precipSum)}
              height={Math.max(0, pad.t + innerH - yPrecip(d.precipSum))}
              className="chart__rain-bar"
              initial={reduce ? false : { opacity: 0, scaleY: 0 }}
              animate={{
                opacity: emphasizePrecip ? 0.9 : 0.45,
                scaleY: 1,
              }}
              style={{ transformOrigin: `${xAt(i)}px ${pad.t + innerH}px` }}
              transition={{ delay: reduce ? 0 : i * 0.02, duration: 0.35 }}
            />
          ))}

        {ticks.map((i) => (
          <text
            key={daily[i].date}
            x={xAt(i)}
            y={h - 12}
            textAnchor="middle"
            className="chart__tick"
          >
            {shortDay(daily[i].date)}
          </text>
        ))}
      </svg>
    </figure>
  );
}
