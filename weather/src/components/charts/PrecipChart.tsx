import type { DailyPoint, EnsembleDay } from "../../lib/types";
import { niceDomain, scale, shortDay } from "./chartUtils";

type Props = {
  daily: DailyPoint[];
  ensembleDays?: EnsembleDay[];
};

export function PrecipChart({ daily, ensembleDays }: Props) {
  if (!daily.length) return null;
  const w = 720;
  const h = 240;
  const pad = { t: 20, r: 16, b: 40, l: 40 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const ensMax = ensembleDays?.map((d) => d.precipMax).filter(Number.isFinite) ?? [];
  const domain = niceDomain(
    0,
    Math.max(
      ...daily.map((d) => d.precipSum),
      ...daily.map((d) => d.precipProbMax / 10),
      ...ensMax,
      1,
    ),
    0.05,
  );
  domain[0] = 0;

  const xAt = (i: number) =>
    pad.l + scale(i + 0.5, [0, daily.length], [0, innerW]);
  const yAt = (v: number) => pad.t + scale(v, domain, [innerH, 0]);
  const barW = Math.max(innerW / daily.length - 6, 5);

  const ticks = daily
    .map((_, i) => i)
    .filter((i) => i % Math.ceil(daily.length / 7) === 0);

  return (
    <figure className="chart">
      <figcaption className="chart__caption">
        <span>Rain: chance vs amount</span>
        <span className="chart__legend">
          <i className="swatch swatch--rain" /> Expected mm
          <i className="swatch swatch--prob" /> Chance (scaled)
          {ensembleDays && (
            <>
              <i className="swatch swatch--ensemble" /> Ensemble amount range
            </>
          )}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Precipitation chance and amount">
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
                {val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {daily.map((d, i) => {
          const ens = ensembleDays?.[i];
          const x = xAt(i) - barW / 2;
          const y = yAt(d.precipSum);
          const probH = ((d.precipProbMax / 100) * innerH) / Math.max(domain[1], 1);
          return (
            <g key={d.date}>
              {ens && Number.isFinite(ens.precipMax) && (
                <line
                  x1={xAt(i)}
                  x2={xAt(i)}
                  y1={yAt(ens.precipMin)}
                  y2={yAt(ens.precipMax)}
                  className="chart__whisker"
                />
              )}
              <rect
                x={x}
                y={pad.t + innerH - probH}
                width={barW}
                height={probH}
                className="chart__prob-bar"
              />
              <rect
                x={x + 2}
                y={y}
                width={Math.max(barW - 4, 2)}
                height={pad.t + innerH - y}
                className="chart__rain-bar"
              />
            </g>
          );
        })}

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
        Tall muted bars = higher rain chance. Solid teal bars = expected rainfall
        (mm). Whiskers show ensemble min–max when available.
      </p>
    </figure>
  );
}
