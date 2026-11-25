import {
  buildAnalytics,
  formatDayLabel,
  formatHourLabel,
} from "../lib/analytics";
import { formatPlace } from "../lib/location";
import { weatherLabel } from "../lib/weatherCode";
import type { ForecastBundle, Place } from "../lib/types";
import { DailyRangeChart } from "./charts/DailyRangeChart";
import { EnsembleBandChart } from "./charts/EnsembleBandChart";
import { HourlySeriesChart } from "./charts/HourlySeriesChart";
import { PrecipChart } from "./charts/PrecipChart";
import { SeasonalCompareChart } from "./charts/SeasonalCompareChart";
import { WindPressureChart } from "./charts/WindPressureChart";
import { RegionalMap } from "./RegionalMap";

type Props = {
  place: Place;
  bundle: ForecastBundle;
};

export function Story({ place, bundle }: Props) {
  const a = buildAnalytics(bundle);
  const tz = bundle.timezone;
  const next48 = (() => {
    const idx = Math.max(
      0,
      bundle.hourly.findIndex((h) => h.time >= bundle.current.time),
    );
    return bundle.hourly.slice(idx, idx + 48);
  })();

  return (
    <div className="story">
      <section className="section" id="now">
        <p className="kicker">Right now</p>
        <h2>
          {Math.round(bundle.current.temperature)}° and{" "}
          {weatherLabel(bundle.current.weatherCode).toLowerCase()} in{" "}
          {place.name}
        </h2>
        <p className="section__lede">
          Feels like {Math.round(bundle.current.apparent)}°. Wind{" "}
          {Math.round(bundle.current.windSpeed)} km/h, gusts{" "}
          {Math.round(bundle.current.windGusts)} km/h. Pressure{" "}
          {Math.round(bundle.current.pressure)} hPa · humidity{" "}
          {bundle.current.humidity}%.
        </p>
        <div className="metric-row">
          <div className="metric">
            <span className="metric__label">Feels like</span>
            <div className="metric__value">
              {Math.round(bundle.current.apparent)}°
            </div>
          </div>
          <div className="metric">
            <span className="metric__label">Wind / gusts</span>
            <div className="metric__value">
              {Math.round(bundle.current.windSpeed)}
              <span className="metric__unit">
                /{Math.round(bundle.current.windGusts)} km/h
              </span>
            </div>
          </div>
          <div className="metric">
            <span className="metric__label">Pressure</span>
            <div className="metric__value">
              {Math.round(bundle.current.pressure)}
              <span className="metric__unit"> hPa</span>
            </div>
          </div>
          <div className="metric">
            <span className="metric__label">Humidity</span>
            <div className="metric__value">{bundle.current.humidity}%</div>
          </div>
        </div>
        <HourlySeriesChart
          hours={a.nextHours}
          title="Next 12 hours — temperature, feels-like, and rain"
          showPressure
        />
      </section>

      <section className="section" id="map">
        <p className="kicker">Around you</p>
        <h2>Regional conditions map</h2>
        <p className="section__lede">
          A local Open-Meteo grid over OpenStreetMap. Switch layers for
          temperature, rain, wind, or pressure near {formatPlace(place)}.
        </p>
        <RegionalMap
          place={place}
          cells={bundle.grid?.cells}
          spanDeg={bundle.grid?.spanDeg}
        />
      </section>

      <section className="section" id="today">
        <p className="kicker">Today</p>
        <h2>
          {weatherLabel(a.today.weatherCode)} · {Math.round(a.today.tempMin)}° to{" "}
          {Math.round(a.today.tempMax)}°
        </h2>
        <p className="section__lede">
          {a.peakHeatHour
            ? `Warmest around ${formatHourLabel(a.peakHeatHour.time)}.`
            : "Daytime temperature range from the daily forecast."}{" "}
          {a.tempAnomalyToday != null
            ? `Today’s high is ${Math.abs(a.tempAnomalyToday).toFixed(1)}° ${a.tempAnomalyToday >= 0 ? "warmer" : "cooler"} than the same date last year.`
            : null}
        </p>
        <div className="metric-row">
          <div className="metric">
            <span className="metric__label">Rain chance</span>
            <div className="metric__value">
              {Math.round(a.today.precipProbMax)}%
            </div>
          </div>
          <div className="metric">
            <span className="metric__label">Expected rain</span>
            <div className="metric__value">
              {a.today.precipSum.toFixed(1)}
              <span className="metric__unit"> mm</span>
            </div>
          </div>
          <div className="metric">
            <span className="metric__label">UV max</span>
            <div className="metric__value">{a.today.uvMax.toFixed(0)}</div>
          </div>
        </div>
        <HourlySeriesChart
          hours={a.todayHours.length ? a.todayHours : a.nextHours}
          title="Today’s hourly temperature and rain"
        />
        {a.peakPrecipHour && a.peakPrecipHour.precipProb >= 30 && (
          <p className="note">
            Highest rain chance around {formatHourLabel(a.peakPrecipHour.time)} (
            {Math.round(a.peakPrecipHour.precipProb)}%,{" "}
            {a.peakPrecipHour.precipMm.toFixed(1)} mm that hour). A high chance
            of light rain is not the same as a heavy downpour.
          </p>
        )}
      </section>

      <section className="section" id="tonight">
        <p className="kicker">Tonight</p>
        <h2>
          Overnight low near {Math.round(a.today.tempMin)}°
          {a.tonightHours.length
            ? ` · evening tracking toward ${Math.round(a.tonightHours[a.tonightHours.length - 1]?.temperature ?? a.today.tempMin)}°`
            : ""}
        </h2>
        <p className="section__lede">
          From 6pm onward: cooling, rain chance, and whether wind stays up after
          dark.
        </p>
        {a.tonightHours.length > 0 ? (
          <HourlySeriesChart
            hours={a.tonightHours}
            title="Tonight — temperature and rain"
          />
        ) : (
          <p className="note">
            Evening hourly detail appears after late afternoon local time.
            Overnight low is forecast at {Math.round(a.today.tempMin)}°.
          </p>
        )}
      </section>

      <section className="section" id="days">
        <p className="kicker">Next 14 days</p>
        <h2>{a.trendPhrase}</h2>
        <p className="section__lede">
          Daily highs and lows for the fortnight. Farther days are less precise —
          use them for planning ranges, not exact hours.
        </p>
        <DailyRangeChart
          daily={bundle.daily}
          ensembleDays={bundle.ensemble?.days}
          climateHighs={bundle.climate?.tempMeanMax}
        />
        <div className="day-strip day-strip--compact">
          {bundle.daily.map((d, i) => {
            const spread = bundle.ensemble?.dailyTempMaxSpread?.[i];
            return (
              <div className="day-row" key={d.date}>
                <div>
                  <div className="day-row__t">{formatDayLabel(d.date, tz)}</div>
                  <div className="day-row__s">{weatherLabel(d.weatherCode)}</div>
                </div>
                <div className="day-row__v">
                  {Math.round(d.tempMin)}° / {Math.round(d.tempMax)}°
                </div>
                <div className="day-row__s">
                  {Math.round(d.precipProbMax)}% · {d.precipSum.toFixed(1)} mm
                </div>
                <div className="day-row__s">
                  {spread != null && Number.isFinite(spread)
                    ? `ensemble ±${(spread / 2).toFixed(1)}°`
                    : `gusts ${Math.round(d.windGustsMax)} km/h`}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section" id="precip">
        <p className="kicker">Rain and storms</p>
        <h2>
          {a.wettestDay && a.wettestDay.precipSum >= 1
            ? `Wettest day: ${formatDayLabel(a.wettestDay.date, tz)} (~${a.wettestDay.precipSum.toFixed(1)} mm)`
            : "No heavy rain stands out in the next two weeks"}
        </h2>
        <p className="section__lede">
          Rain chance and expected amount are different. The chart shows both,
          plus ensemble ranges where the models provide them.
        </p>
        <PrecipChart
          daily={bundle.daily}
          ensembleDays={bundle.ensemble?.days}
        />
        {a.precipRiskDays.length > 0 && (
          <ul className="list">
            {a.precipRiskDays.slice(0, 6).map((d) => (
              <li key={d.date}>
                <strong>{formatDayLabel(d.date, tz)}</strong> —{" "}
                {Math.round(d.precipProbMax)}% chance, {d.precipSum.toFixed(1)}{" "}
                mm expected.{" "}
                {d.precipProbMax >= 60 && d.precipSum < 2
                  ? "Likely light amounts despite a high chance."
                  : d.precipSum >= 8
                    ? "Amounts look significant — plan around it."
                    : "Bring a jacket; not necessarily a washout."}
              </li>
            ))}
          </ul>
        )}
        {a.stormyDays.length > 0 && (
          <p className="note">
            Thunderstorm or heavy rain+gust risk:{" "}
            {a.stormyDays.map((d) => formatDayLabel(d.date, tz)).join(", ")}.
          </p>
        )}
      </section>

      <section className="section" id="wind">
        <p className="kicker">Wind and how it feels</p>
        <h2>
          {a.windiestDay
            ? `Strongest gusts: ${formatDayLabel(a.windiestDay.date, tz)} (${Math.round(a.windiestDay.windGustsMax)} km/h)`
            : "Wind looks modest over the period"}
        </h2>
        <p className="section__lede">
          “Feels like” includes wind and humidity. Gusts matter more than average
          wind for cycling, balconies, and outdoor plans.
        </p>
        <WindPressureChart hours={next48} />
        <p className="note">
          Today’s feels-like range {Math.round(a.today.apparentMin)}° to{" "}
          {Math.round(a.today.apparentMax)}°. Dress for that, not the raw
          thermometer alone.
        </p>
      </section>

      {(a.uvAdvice || a.aqiAdvice) && (
        <section className="section" id="air">
          <p className="kicker">UV and air quality</p>
          <h2>Sun strength and air quality</h2>
          <p className="section__lede">
            Useful for midday outdoor plans and anyone sensitive to pollution.
          </p>
          <ul className="list">
            {a.uvAdvice && <li>{a.uvAdvice}</li>}
            {a.aqiAdvice && <li>{a.aqiAdvice}</li>}
          </ul>
          {bundle.airQuality && (
            <AqiSpark
              times={bundle.airQuality.time}
              values={bundle.airQuality.europeanAqi}
            />
          )}
        </section>
      )}

      <section className="section" id="confidence">
        <p className="kicker">Forecast confidence</p>
        <h2>
          Confidence: {a.confidence.label.toLowerCase()} ({a.confidence.score}
          /100)
        </h2>
        <p className="section__lede">
          Near-term days are usually sharper. When ensemble members disagree,
          treat later temperatures and rain totals as a range.
        </p>
        {bundle.ensemble?.days && (
          <EnsembleBandChart
            days={bundle.ensemble.days}
            memberCount={bundle.ensemble.memberCount}
          />
        )}
        <ul className="list">
          {a.confidence.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      {bundle.climate?.tempMeanMax && (
        <section className="section" id="seasonal">
          <p className="kicker">Compared with last year</p>
          <h2>How this period lines up with the same dates last year</h2>
          <p className="section__lede">
            A same-calendar-window check — helpful context, not a 30-year climate
            normal.
          </p>
          <SeasonalCompareChart
            daily={bundle.daily}
            climateHighs={bundle.climate.tempMeanMax}
            climatePrecip={bundle.climate.precipMean}
          />
        </section>
      )}

      <section className="section" id="do">
        <p className="kicker">What to do</p>
        <h2>Practical takeaways</h2>
        <p className="section__lede">
          The short list from the same forecast — what matters most for the days
          ahead.
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
        (forecast, archive, ensemble, air quality) and{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          OpenStreetMap
        </a>{" "}
        tiles. Updated {new Date(bundle.fetchedAt).toLocaleString()}. Skylore
        stores only your last place on this device.
      </footer>
    </div>
  );
}

function AqiSpark({
  times,
  values,
}: {
  times: string[];
  values: (number | null)[];
}) {
  const pts = times
    .map((t, i) => ({ t, v: values[i] }))
    .filter((p): p is { t: string; v: number } => p.v != null)
    .slice(0, 48);
  if (pts.length < 2) return null;
  const w = 720;
  const h = 120;
  const pad = { t: 12, r: 12, b: 24, l: 36 };
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v), min + 1);
  const x = (i: number) =>
    pad.l + (i / (pts.length - 1)) * (w - pad.l - pad.r);
  const y = (v: number) =>
    pad.t + (1 - (v - min) / (max - min)) * (h - pad.t - pad.b);
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`)
    .join(" ");
  return (
    <figure className="chart">
      <figcaption className="chart__caption">
        <span>European AQI — next hours</span>
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Air quality trend">
        <path d={d} className="chart__line chart__line--temp" fill="none" />
        <text x={pad.l - 6} y={y(max) + 4} className="chart__tick" textAnchor="end">
          {Math.round(max)}
        </text>
        <text x={pad.l - 6} y={y(min) + 4} className="chart__tick" textAnchor="end">
          {Math.round(min)}
        </text>
      </svg>
    </figure>
  );
}
