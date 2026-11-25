import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ForecastBundle, Place, StoryAnalytics } from "../lib/types";
import { DailyRangeChart } from "./charts/DailyRangeChart";
import { EnsembleBandChart } from "./charts/EnsembleBandChart";
import { HourlySeriesChart } from "./charts/HourlySeriesChart";
import { PrecipChart } from "./charts/PrecipChart";
import { SeasonalCompareChart } from "./charts/SeasonalCompareChart";
import { WindPressureChart } from "./charts/WindPressureChart";
import { RegionalMap, type MapLayer } from "./RegionalMap";

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

export function StoryStage({
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

  return (
    <div className="story-stage" aria-live="polite">
      <div className="story-stage__chrome">
        <p className="story-stage__kicker">Live view</p>
        <h3 className="story-stage__title">{title}</h3>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={beat}
          className="story-stage__body"
          initial={
            reduce ? false : { opacity: 0, y: 18, filter: "blur(6px)", scale: 0.985 }
          }
          animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
          exit={
            reduce
              ? undefined
              : { opacity: 0, y: -12, filter: "blur(4px)", scale: 0.99 }
          }
          transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
        >
          {renderBeat({
            beat,
            place,
            bundle,
            a,
            mapLayer,
            onMapLayer,
            next48,
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function renderBeat({
  beat,
  place,
  bundle,
  a,
  mapLayer,
  onMapLayer,
  next48,
}: {
  beat: string;
  place: Place;
  bundle: ForecastBundle;
  a: StoryAnalytics;
  mapLayer: MapLayer;
  onMapLayer: (layer: MapLayer) => void;
  next48: ForecastBundle["hourly"];
}) {
  if (beat === "country") {
    const mapPlace =
      place.countryCode || !bundle.grid?.countryCode
        ? place
        : { ...place, countryCode: bundle.grid.countryCode };
    return (
      <RegionalMap
        place={mapPlace}
        cells={bundle.grid?.cells}
        bbox={bundle.grid?.bbox}
        countryLabel={bundle.grid?.countryName || place.country}
        layer={mapLayer}
        onLayerChange={onMapLayer}
        compact
      />
    );
  }
  if (beat === "now") {
    return (
      <HourlySeriesChart
        hours={a.nextHours}
        title="Next 12 hours"
        showPressure
      />
    );
  }
  if (beat === "today") {
    return (
      <HourlySeriesChart
        hours={a.todayHours.length ? a.todayHours : a.nextHours}
        title="Today, hour by hour"
      />
    );
  }
  if (beat === "tonight") {
    return a.tonightHours.length ? (
      <HourlySeriesChart hours={a.tonightHours} title="Evening into night" />
    ) : (
      <p className="story-stage__empty">
        Evening hourly detail appears after late afternoon local time. Overnight
        low near {Math.round(a.today.tempMin)}°.
      </p>
    );
  }
  if (beat === "days") {
    return (
      <DailyRangeChart
        daily={bundle.daily}
        ensembleDays={bundle.ensemble?.days}
        climateHighs={bundle.climate?.tempMeanMax}
      />
    );
  }
  if (beat === "precip") {
    return (
      <PrecipChart daily={bundle.daily} ensembleDays={bundle.ensemble?.days} />
    );
  }
  if (beat === "wind") {
    return <WindPressureChart hours={next48} />;
  }
  if (beat === "air") {
    if (!a.uvAdvice && !a.aqiAdvice) {
      return (
        <p className="story-stage__empty">
          UV and air-quality detail is limited for this location right now.
        </p>
      );
    }
    return (
      <ul className="story-stage__list">
        {a.uvAdvice && <li>{a.uvAdvice}</li>}
        {a.aqiAdvice && <li>{a.aqiAdvice}</li>}
      </ul>
    );
  }
  if (beat === "confidence") {
    return bundle.ensemble?.days ? (
      <EnsembleBandChart
        days={bundle.ensemble.days}
        memberCount={bundle.ensemble.memberCount}
      />
    ) : (
      <p className="story-stage__empty">
        Confidence score {a.confidence.score}/100 ({a.confidence.label}).
        Ensemble band unavailable for this load.
      </p>
    );
  }
  if (beat === "seasonal") {
    return bundle.climate?.tempMeanMax ? (
      <SeasonalCompareChart
        daily={bundle.daily}
        climateHighs={bundle.climate.tempMeanMax}
        climatePrecip={bundle.climate.precipMean}
      />
    ) : (
      <p className="story-stage__empty">
        Last-year comparison is unavailable for this load.
      </p>
    );
  }
  // "do" and fallback — compact takeaways in the stage
  return (
    <ul className="story-stage__list">
      {a.practical.slice(0, 4).map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}
