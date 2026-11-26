import type { DailyPoint } from "../../lib/types";
import { linePath, niceDomain, scale, shortDay } from "./chartUtils";

type Props = {
  daily: DailyPoint[];
  climateHighs?: number[];
  climatePrecip?: number[];
};

export function SeasonalCompareChart({
  daily,
  climateHighs,
  climatePrecip,
}: Props) {
  if (!daily.length || !climateHighs?.length) return null;

  const n = Math.min(daily.length, climateHighs.length);
  const w = 720;
  const h = 220;
  const pad = { t: 20, r: 16, b: 40, l: 40 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const vals = [
    ...daily.slice(0, n).map((d) => d.tempMax),
    ...climateHighs.slice(0, n).filter(Number.isFinite),
  ];
  const domain = niceDomain(Math.min(...vals), Math.max(...vals));
  const xAt = (i: number) => pad.l + scale(i, [0, Math.max(n - 1, 1)], [0, innerW]);
  const yAt = (v: number) => pad.t + scale(v, domain, [innerH, 0]);

  const forecast = daily.slice(0, n).map((d, i) => ({ x: xAt(i), y: yAt(d.tempMax) }));
  const lastYear = climateHighs.slice(0, n).map((v, i) => ({ x: xAt(i), y: yAt(v) }));

  const anomalies = daily.slice(0, n).map((d, i) => {
    const base = climateHighs[i];
    return Number.isFinite(base) ? d.tempMax - base : 0;
  });
  const avgAnom =
    anomalies.reduce((a, b) => a + b, 0) / Math.max(anomalies.length, 1);

  const precipDelta =
    climatePrecip && climatePrecip.length
      ? daily.slice(0, n).reduce((s, d, i) => {
          const base = climatePrecip[i];
          return s + (Number.isFinite(base) ? d.precipSum - base : 0);
        }, 0)
      : null;

  const ticks = [...Array(n).keys()].filter(
    (i) => i % Math.ceil(n / 7) === 0,
  );

  return (
    <figure className="chart">
      <figcaption className="chart__caption">
        <span>Highs vs same dates last year</span>
        <span className="chart__legend">
          <i className="swatch swatch--temp" /> Forecast
          <i className="swatch swatch--climate" /> Last year
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Seasonal temperature comparison">
        {[0, 0.5, 1].map((t) => {
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
              <text x={pad.l - 8} y={y + 4} className="chart__tick" textAnchor="end">
                {Math.round(val)}°
              </text>
            </g>
          );
        })}
        <path d={linePath(lastYear)} className="chart__line chart__line--climate" fill="none" />
        <path d={linePath(forecast)} className="chart__line chart__line--temp" fill="none" />
        {ticks.map((i) => (
          <text
            key={daily[i].date}
            x={xAt(i)}
            y={h - 12}
            className="chart__tick"
            textAnchor="middle"
          >
            {shortDay(daily[i].date)}
          </text>
        ))}
      </svg>
      <p className="chart__note">
        Average high anomaly: {avgAnom >= 0 ? "+" : ""}
        {avgAnom.toFixed(1)}° vs last year
        {precipDelta != null && (
          <>
            {" "}
            · Rain total difference: {precipDelta >= 0 ? "+" : ""}
            {precipDelta.toFixed(1)} mm over the same window
          </>
        )}
        . This is a same-calendar-window comparison, not a 30-year climate normal.
      </p>
    </figure>
  );
}
