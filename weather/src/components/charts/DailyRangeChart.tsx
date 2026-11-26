import type { DailyPoint, EnsembleDay } from "../../lib/types";
import { areaPath, linePath, niceDomain, scale, shortDay } from "./chartUtils";

type Props = {
  daily: DailyPoint[];
  ensembleDays?: EnsembleDay[];
  climateHighs?: number[];
};

export function DailyRangeChart({ daily, ensembleDays, climateHighs }: Props) {
  if (!daily.length) return null;
  const w = 720;
  const h = 280;
  const pad = { t: 24, r: 16, b: 40, l: 40 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const ensMax = ensembleDays?.map((d) => d.tempMaxMax).filter(Number.isFinite) ?? [];
  const ensMin = ensembleDays?.map((d) => d.tempMaxMin).filter(Number.isFinite) ?? [];
  const all = [
    ...daily.map((d) => d.tempMax),
    ...daily.map((d) => d.tempMin),
    ...ensMax,
    ...ensMin,
    ...(climateHighs ?? []).filter(Number.isFinite),
  ];
  const domain = niceDomain(Math.min(...all), Math.max(...all));

  const xAt = (i: number, n = daily.length) =>
    pad.l + scale(i, [0, Math.max(n - 1, 1)], [0, innerW]);
  const yAt = (v: number) => pad.t + scale(v, domain, [innerH, 0]);

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
  const ensMean =
    ensembleDays?.map((d, i) => ({
      x: xAt(i, ensembleDays.length),
      y: yAt(d.tempMaxMean),
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
    <figure className="chart">
      <figcaption className="chart__caption">
        <span>14-day temperature range</span>
        <span className="chart__legend">
          <i className="swatch swatch--band" /> High–low
          {ensembleDays && (
            <>
              <i className="swatch swatch--ensemble" /> Ensemble high band
            </>
          )}
          {climateHighs && (
            <>
              <i className="swatch swatch--climate" /> Same dates last year
            </>
          )}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Daily temperature range">
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
              <text x={pad.l - 8} y={y + 4} className="chart__tick" textAnchor="end">
                {Math.round(val)}°
              </text>
            </g>
          );
        })}

        {ensTop.length > 0 && (
          <path d={areaPath(ensTop, ensBot)} className="chart__ensemble-band" />
        )}
        <path d={band} className="chart__temp-band" />
        <path d={linePath(highLine)} className="chart__line chart__line--temp" fill="none" />
        <path d={linePath(lowLine)} className="chart__line chart__line--low" fill="none" />
        {ensMean.length > 0 && (
          <path
            d={linePath(ensMean)}
            className="chart__line chart__line--ensemble"
            fill="none"
          />
        )}
        {climateLine.length > 0 && (
          <path
            d={linePath(climateLine)}
            className="chart__line chart__line--climate"
            fill="none"
          />
        )}

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
    </figure>
  );
}
