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
  const pad = { t: 20, r: 44, b: 40, l: 40 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const ensMax =
    ensembleDays?.map((d) => d.precipMax).filter(Number.isFinite) ?? [];
  const mmDomain = niceDomain(
    0,
    Math.max(...daily.map((d) => d.precipSum), ...ensMax, 1),
    0.08,
  );
  mmDomain[0] = 0;

  const xAt = (i: number) =>
    pad.l + scale(i + 0.5, [0, daily.length], [0, innerW]);
  const yMm = (v: number) => pad.t + scale(v, mmDomain, [innerH, 0]);
  // Chance uses its own 0–100% scale so bars stay readable.
  const yProb = (pct: number) =>
    pad.t + scale(pct, [0, 100], [innerH, 0]);
  const barW = Math.max(innerW / daily.length - 6, 5);

  const ticks = daily
    .map((_, i) => i)
    .filter((i) => i % Math.ceil(daily.length / 7) === 0);

  return (
    <figure className="chart">
      <figcaption className="chart__caption">
        <span>Rain: chance vs amount</span>
        <span className="chart__legend">
          <i className="swatch swatch--prob" /> Chance %
          <i className="swatch swatch--rain" /> Expected mm
          {ensembleDays && (
            <>
              <i className="swatch swatch--ensemble" /> Ensemble mm range
            </>
          )}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label="Precipitation chance and amount"
      >
        {[0, 0.5, 1].map((t) => {
          const y = pad.t + innerH * (1 - t);
          const mm = mmDomain[0] + (mmDomain[1] - mmDomain[0]) * t;
          return (
            <g key={t}>
              <line
                x1={pad.l}
                x2={pad.l + innerW}
                y1={y}
                y2={y}
                className="chart__grid"
              />
              <text
                x={pad.l - 8}
                y={y + 4}
                className="chart__tick"
                textAnchor="end"
              >
                {mm.toFixed(0)}
              </text>
              <text
                x={pad.l + innerW + 8}
                y={y + 4}
                className="chart__tick"
                textAnchor="start"
              >
                {Math.round(t * 100)}%
              </text>
            </g>
          );
        })}

        {daily.map((d, i) => {
          const ens = ensembleDays?.[i];
          const x = xAt(i) - barW / 2;
          const yAmount = yMm(d.precipSum);
          const yChance = yProb(d.precipProbMax);
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={yChance}
                width={barW}
                height={Math.max(pad.t + innerH - yChance, 0)}
                className="chart__prob-bar"
              />
              {ens && Number.isFinite(ens.precipMax) && (
                <line
                  x1={xAt(i)}
                  x2={xAt(i)}
                  y1={yMm(ens.precipMin)}
                  y2={yMm(ens.precipMax)}
                  className="chart__whisker"
                />
              )}
              <rect
                x={x + barW * 0.22}
                y={yAmount}
                width={Math.max(barW * 0.56, 3)}
                height={Math.max(pad.t + innerH - yAmount, 0)}
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
        Wide muted bars = rain chance (right axis). Solid teal bars = expected
        rainfall in mm (left axis). Whiskers show ensemble min–max when
        available.
      </p>
    </figure>
  );
}
