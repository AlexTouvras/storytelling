import { useMemo, useRef, useState } from "react";
import {
  buildAnalytics,
  formatDayLabel,
  formatHourLabel,
} from "../lib/analytics";
import { useActiveBeat } from "../hooks/useActiveBeat";
import { formatPlace } from "../lib/location";
import { weatherLabel } from "../lib/weatherCode";
import type { ForecastBundle, Place } from "../lib/types";
import { STORY_BEATS, StoryStage } from "./StoryStage";
import type { MapLayer } from "./RegionalMap";

type Props = {
  place: Place;
  bundle: ForecastBundle;
};

export function Story({ place, bundle }: Props) {
  const a = buildAnalytics(bundle);
  const tz = bundle.timezone;
  const rootRef = useRef<HTMLDivElement>(null);
  const beatIds = useMemo(() => [...STORY_BEATS], []);
  const activeBeat = useActiveBeat(rootRef, beatIds, "now");
  const [mapLayer, setMapLayer] = useState<MapLayer>("temp");

  const next48 = useMemo(() => {
    const idx = Math.max(
      0,
      bundle.hourly.findIndex((h) => h.time >= bundle.current.time),
    );
    return bundle.hourly.slice(idx, idx + 48);
  }, [bundle]);

  const countryLabel =
    bundle.grid?.countryName || place.country || place.name;

  return (
    <div className="story" ref={rootRef}>
      <div className="story-layout">
        <aside className="story-stage-wrap" aria-label="Forecast visual">
          <StoryStage
            beat={activeBeat}
            place={place}
            bundle={bundle}
            analytics={a}
            mapLayer={mapLayer}
            onMapLayer={setMapLayer}
            next48={next48}
          />
        </aside>

        <div className="story-chapters">
          <section className="chapter" data-beat="now" id="now">
            <p className="kicker">Right now</p>
            <h2>
              {Math.round(bundle.current.temperature)}° and{" "}
              {weatherLabel(bundle.current.weatherCode).toLowerCase()} in{" "}
              {place.name}
            </h2>
            <p className="section__lede">
              Feels like {Math.round(bundle.current.apparent)}°. Wind{" "}
              {Math.round(bundle.current.windSpeed)} km/h with gusts to{" "}
              {Math.round(bundle.current.windGusts)} km/h. Humidity{" "}
              {bundle.current.humidity}% · pressure{" "}
              {Math.round(bundle.current.pressure)} hPa.
            </p>
            <p className="chapter__hint">
              The panel shows the next twelve hours as you read.
            </p>
          </section>

          <section className="chapter" data-beat="country" id="country">
            <p className="kicker">Across the country</p>
            <h2>Conditions over {countryLabel}</h2>
            <p className="section__lede">
              A national field for {formatPlace(place)} — not just the city
              block. Switch temperature, rain, wind, or pressure in the live
              view.
            </p>
            <div className="map-panel__toolbar chapter__tools" role="tablist">
              {(
                [
                  ["temp", "Temperature"],
                  ["precip", "Precipitation"],
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
          </section>

          <section className="chapter" data-beat="today" id="today">
            <p className="kicker">Today</p>
            <h2>
              {weatherLabel(a.today.weatherCode)} · {Math.round(a.today.tempMin)}
              ° to {Math.round(a.today.tempMax)}°
            </h2>
            <p className="section__lede">
              {a.peakHeatHour
                ? `Warmest around ${formatHourLabel(a.peakHeatHour.time)}.`
                : "Daytime range from the daily forecast."}{" "}
              Rain chance peaks at {Math.round(a.today.precipProbMax)}%
              {a.today.precipSum > 0
                ? ` with about ${a.today.precipSum.toFixed(1)} mm expected.`
                : "."}
              {a.tempAnomalyToday != null
                ? ` High is ${Math.abs(a.tempAnomalyToday).toFixed(1)}° ${a.tempAnomalyToday >= 0 ? "warmer" : "cooler"} than this date last year.`
                : ""}
            </p>
            {a.peakPrecipHour && a.peakPrecipHour.precipProb >= 30 && (
              <p className="note">
                Highest rain chance around{" "}
                {formatHourLabel(a.peakPrecipHour.time)} (
                {Math.round(a.peakPrecipHour.precipProb)}%).
              </p>
            )}
          </section>

          <section className="chapter" data-beat="tonight" id="tonight">
            <p className="kicker">Tonight</p>
            <h2>Overnight low near {Math.round(a.today.tempMin)}°</h2>
            <p className="section__lede">
              From 6pm onward: how fast it cools, and whether rain or wind hangs
              on after dark.
            </p>
          </section>

          <section className="chapter" data-beat="days" id="days">
            <p className="kicker">Next 14 days</p>
            <h2>{a.trendPhrase}</h2>
            <p className="section__lede">
              Highs, lows, and how far models agree. Farther days are ranges for
              planning — not clock-time promises.
            </p>
            <ol className="chapter__days">
              {bundle.daily.slice(0, 7).map((d, i) => {
                const spread = bundle.ensemble?.dailyTempMaxSpread?.[i];
                return (
                  <li key={d.date}>
                    <strong>{formatDayLabel(d.date, tz)}</strong>{" "}
                    {Math.round(d.tempMin)}°/{Math.round(d.tempMax)}° ·{" "}
                    {Math.round(d.precipProbMax)}% rain
                    {spread != null && Number.isFinite(spread)
                      ? ` · ensemble ±${(spread / 2).toFixed(1)}°`
                      : ""}
                  </li>
                );
              })}
            </ol>
            <p className="chapter__hint">
              Days 8–14 stay on the chart in the live view.
            </p>
          </section>

          <section className="chapter" data-beat="precip" id="precip">
            <p className="kicker">Rain and storms</p>
            <h2>
              {a.wettestDay && a.wettestDay.precipSum >= 1
                ? `Wettest day: ${formatDayLabel(a.wettestDay.date, tz)}`
                : "No heavy rain stands out"}
            </h2>
            <p className="section__lede">
              Chance and amount are different. The live view shows both, with
              ensemble ranges when models provide them.
            </p>
            {a.stormyDays.length > 0 && (
              <p className="note">
                Storm risk:{" "}
                {a.stormyDays.map((d) => formatDayLabel(d.date, tz)).join(", ")}.
              </p>
            )}
          </section>

          <section className="chapter" data-beat="wind" id="wind">
            <p className="kicker">Wind and feel</p>
            <h2>
              {a.windiestDay
                ? `Strongest gusts ${formatDayLabel(a.windiestDay.date, tz)}`
                : "Wind looks modest"}
            </h2>
            <p className="section__lede">
              Feels-like includes wind and humidity. Gusts matter more than
              average wind for bikes, balconies, and outdoor plans. Today:{" "}
              {Math.round(a.today.apparentMin)}° to{" "}
              {Math.round(a.today.apparentMax)}° feels-like.
            </p>
          </section>

          {(a.uvAdvice || a.aqiAdvice) && (
            <section className="chapter" data-beat="air" id="air">
              <p className="kicker">UV and air quality</p>
              <h2>Sun strength and air quality</h2>
              <p className="section__lede">
                Useful for midday outdoor plans and anyone sensitive to
                pollution.
              </p>
            </section>
          )}

          <section className="chapter" data-beat="confidence" id="confidence">
            <p className="kicker">Forecast confidence</p>
            <h2>
              Confidence: {a.confidence.label.toLowerCase()} (
              {a.confidence.score}/100)
            </h2>
            <p className="section__lede">
              Near days are usually sharper. When ensemble members disagree,
              treat later temperatures and rain totals as a range.
            </p>
            <ul className="list">
              {a.confidence.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>

          {bundle.climate?.tempMeanMax && (
            <section className="chapter" data-beat="seasonal" id="seasonal">
              <p className="kicker">Compared with last year</p>
              <h2>Same calendar window, last year</h2>
              <p className="section__lede">
                A same-dates check for context — not a 30-year climate normal.
              </p>
            </section>
          )}

          <section className="chapter" data-beat="do" id="do">
            <p className="kicker">What to do</p>
            <h2>Practical takeaways</h2>
            <p className="section__lede">
              The short list from the same forecast — what matters most for the
              days ahead.
            </p>
            <ul className="list">
              {a.practical.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <footer className="footer">
            Data from{" "}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>{" "}
            and{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
            >
              OpenStreetMap
            </a>
            . Updated {new Date(bundle.fetchedAt).toLocaleString()}. Skylore
            stores only your last place on this device.
          </footer>
        </div>
      </div>
    </div>
  );
}
