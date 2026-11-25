import {
  buildAnalytics,
  formatDayLabel,
  formatHourLabel,
} from "../lib/analytics";
import { weatherLabel } from "../lib/weatherCode";
import type { ForecastBundle, Place } from "../lib/types";
import { formatPlace } from "../lib/location";

type Props = {
  place: Place;
  bundle: ForecastBundle;
};

export function Story({ place, bundle }: Props) {
  const a = buildAnalytics(bundle);
  const tz = bundle.timezone;

  return (
    <div className="story">
      <section className="section" id="now">
        <p className="kicker">Now · next hours</p>
        <h2>{a.nowLabel}</h2>
        <p className="section__lede">
          Right now in {formatPlace(place)}. The next twelve hours show how
          temperature, rain chance, and wind move from this moment.
        </p>
        <div className="metric-row">
          <div className="metric">
            <span className="metric__label">Feels like</span>
            <div className="metric__value">
              {Math.round(bundle.current.apparent)}°
            </div>
          </div>
          <div className="metric">
            <span className="metric__label">Wind</span>
            <div className="metric__value">
              {Math.round(bundle.current.windSpeed)}{" "}
              <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>km/h</span>
            </div>
          </div>
          <div className="metric">
            <span className="metric__label">Humidity</span>
            <div className="metric__value">{bundle.current.humidity}%</div>
          </div>
        </div>
        <div className="hour-strip" role="list" aria-label="Next hours">
          {a.nextHours.map((h) => (
            <div className="hour-chip" role="listitem" key={h.time}>
              <div className="hour-chip__t">{formatHourLabel(h.time)}</div>
              <div className="hour-chip__v">{Math.round(h.temperature)}°</div>
              <div className="hour-chip__s">
                {Math.round(h.precipProb)}% · {Math.round(h.windSpeed)} km/h
              </div>
            </div>
          ))}
        </div>
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
            : "Daytime range from the daily forecast."}{" "}
          {a.tempAnomalyToday != null
            ? `High is ${a.tempAnomalyToday >= 0 ? "about" : "about"} ${Math.abs(a.tempAnomalyToday).toFixed(1)}° ${a.tempAnomalyToday >= 0 ? "warmer" : "cooler"} than this date last year.`
            : a.trendPhrase}
        </p>
        <div className="metric-row">
          <div className="metric">
            <span className="metric__label">Rain chance</span>
            <div className="metric__value">
              {Math.round(a.today.precipProbMax)}%
            </div>
          </div>
          <div className="metric">
            <span className="metric__label">Rain amount</span>
            <div className="metric__value">
              {a.today.precipSum.toFixed(1)} mm
            </div>
          </div>
          <div className="metric">
            <span className="metric__label">UV max</span>
            <div className="metric__value">{a.today.uvMax.toFixed(0)}</div>
          </div>
        </div>
        {a.peakPrecipHour && a.peakPrecipHour.precipProb >= 30 && (
          <p className="note">
            Peak rain probability around {formatHourLabel(a.peakPrecipHour.time)}{" "}
            ({Math.round(a.peakPrecipHour.precipProb)}%,{" "}
            {a.peakPrecipHour.precipMm.toFixed(1)} mm in that hour). Probability
            and amount are different — a high chance of a light shower is not a
            washout.
          </p>
        )}
      </section>

      <section className="section" id="tonight">
        <p className="kicker">Tonight</p>
        <h2>
          {a.tonightHours.length
            ? `Evening settles toward ${Math.round(a.tonightHours[a.tonightHours.length - 1]?.temperature ?? a.today.tempMin)}°`
            : `Overnight low near ${Math.round(a.today.tempMin)}°`}
        </h2>
        <p className="section__lede">
          From 6pm onward: how the air cools, and whether rain or wind hangs on
          into the night.
        </p>
        {a.tonightHours.length > 0 ? (
          <div className="hour-strip" role="list" aria-label="Tonight hours">
            {a.tonightHours.map((h) => (
              <div className="hour-chip" role="listitem" key={h.time}>
                <div className="hour-chip__t">{formatHourLabel(h.time)}</div>
                <div className="hour-chip__v">{Math.round(h.temperature)}°</div>
                <div className="hour-chip__s">
                  feels {Math.round(h.apparent)}° · {Math.round(h.precipProb)}%
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="note">
            Tonight&apos;s hourly detail rolls in after late afternoon in local
            time. Overnight low is {Math.round(a.today.tempMin)}°.
          </p>
        )}
      </section>

      <section className="section" id="days">
        <p className="kicker">Day by day · 14 days</p>
        <h2>{a.trendPhrase}</h2>
        <p className="section__lede">
          Highs, lows, and rain for the fortnight. Farther days are less sharp —
          read them as a direction, not a clock-time plan.
        </p>
        <div className="day-strip">
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
                    ? `±${(spread / 2).toFixed(1)}° model spread`
                    : `gusts ${Math.round(d.windGustsMax)} km/h`}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section" id="precip">
        <p className="kicker">Rain & storm risk</p>
        <h2>
          {a.wettestDay && a.wettestDay.precipSum >= 1
            ? `Wettest stretch: ${formatDayLabel(a.wettestDay.date, tz)}`
            : "No heavy rain stands out"}
        </h2>
        <p className="section__lede">
          Days with a real chance of wet weather, plus any storm-flagged days
          (thunder codes or heavy rain with strong gusts).
        </p>
        {a.precipRiskDays.length ? (
          <ul className="list">
            {a.precipRiskDays.map((d) => (
              <li key={d.date}>
                <strong>{formatDayLabel(d.date, tz)}</strong> —{" "}
                {Math.round(d.precipProbMax)}% chance, {d.precipSum.toFixed(1)}{" "}
                mm expected.{" "}
                {d.precipProbMax >= 60 && d.precipSum < 2
                  ? "Likely light amounts despite a high chance."
                  : d.precipSum >= 8
                    ? "Amounts look consequential — plan around it."
                    : "Worth a jacket; not necessarily a write-off day."}
                <div className="bar" aria-hidden>
                  <span
                    style={{
                      width: `${Math.min(100, d.precipProbMax)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="note">
            No day in the next fortnight clears a 40% rain chance with meaningful
            amounts. Still watch hourly updates near any front.
          </p>
        )}
        {a.stormyDays.length > 0 && (
          <p className="note">
            Storm risk days:{" "}
            {a.stormyDays.map((d) => formatDayLabel(d.date, tz)).join(", ")}.
          </p>
        )}
        {a.precipAnomalyToday != null && (
          <p className="note">
            Today&apos;s rain total is {a.precipAnomalyToday >= 0 ? "+" : ""}
            {a.precipAnomalyToday.toFixed(1)} mm versus the same date last year
            (a seasonal snapshot, not a 30-year normal).
          </p>
        )}
      </section>

      <section className="section" id="wind">
        <p className="kicker">Wind & feel</p>
        <h2>
          {a.windiestDay
            ? `Windiest: ${formatDayLabel(a.windiestDay.date, tz)}`
            : "Wind stays modest"}
        </h2>
        <p className="section__lede">
          Apparent temperature is what it feels like with wind and humidity.
          Gusts matter more than average wind for bikes, balconies, and outdoor
          plans.
        </p>
        <div className="metric-row">
          <div className="metric">
            <span className="metric__label">Now feels like</span>
            <div className="metric__value">
              {Math.round(bundle.current.apparent)}°
            </div>
          </div>
          <div className="metric">
            <span className="metric__label">Now gusts</span>
            <div className="metric__value">
              {Math.round(bundle.current.windGusts)} km/h
            </div>
          </div>
          <div className="metric">
            <span className="metric__label">Peak gust ahead</span>
            <div className="metric__value">
              {Math.round(
                Math.max(...bundle.daily.map((d) => d.windGustsMax), 0),
              )}{" "}
              km/h
            </div>
          </div>
        </div>
        <p className="note">
          Today&apos;s feel range {Math.round(a.today.apparentMin)}° to{" "}
          {Math.round(a.today.apparentMax)}°. Dress for the apparent
          temperature, not the thermometer alone.
        </p>
      </section>

      {(a.uvAdvice || a.aqiAdvice) && (
        <section className="section" id="air">
          <p className="kicker">Air & light</p>
          <h2>UV and air quality</h2>
          <p className="section__lede">
            Extra signals when the models provide them — useful for midday plans
            and sensitive lungs.
          </p>
          <ul className="list">
            {a.uvAdvice && <li>{a.uvAdvice}</li>}
            {a.aqiAdvice && <li>{a.aqiAdvice}</li>}
          </ul>
        </section>
      )}

      <section className="section" id="confidence">
        <p className="kicker">Confidence</p>
        <h2>How sure is this story?</h2>
        <p className="section__lede">
          Near days are sharper. Ensemble spread and far-out rain chances pull
          confidence down when models disagree.
        </p>
        <div className="confidence">
          <div className="confidence__score">
            {a.confidence.score}
            <span style={{ fontSize: "1.1rem", marginLeft: "0.35rem" }}>
              / 100 · {a.confidence.label}
            </span>
          </div>
          <ul className="list">
            {a.confidence.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" id="do">
        <p className="kicker">What to do</p>
        <h2>Practical takeaways</h2>
        <p className="section__lede">
          Plain actions from the same forecast — what matters for the next days,
          without the chart clutter.
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
        (forecast, archive baseline, ensemble, air quality). Updated{" "}
        {new Date(bundle.fetchedAt).toLocaleString()}. Skylore stores only your
        last place on this device.
      </footer>
    </div>
  );
}
