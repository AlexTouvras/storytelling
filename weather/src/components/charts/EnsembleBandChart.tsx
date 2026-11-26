import type { EnsembleDay } from "../../lib/types";
import { areaPath, linePath, niceDomain, scale, shortDay } from "./chartUtils";

type Props = {
  days: EnsembleDay[];
  memberCount: number;
};

export function EnsembleBandChart({ days, memberCount }: Props) {
  const usable = days.filter((d) => Number.isFinite(d.tempMaxMean));
  if (!usable.length) return null;

  const w = 720;
  const h = 220;
  const pad = { t: 20, r: 16, b: 40, l: 40 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const all = usable.flatMap((d) => [d.tempMaxMin, d.tempMaxMean, d.tempMaxMax]);
  const domain = niceDomain(Math.min(...all), Math.max(...all));
  const xAt = (i: number) =>
    pad.l + scale(i, [0, Math.max(usable.length - 1, 1)], [0, innerW]);
  const yAt = (v: number) => pad.t + scale(v, domain, [innerH, 0]);

  const top = usable.map((d, i) => ({ x: xAt(i), y: yAt(d.tempMaxMax) }));
  const bot = usable.map((d, i) => ({ x: xAt(i), y: yAt(d.tempMaxMin) }));
  const mean = usable.map((d, i) => ({ x: xAt(i), y: yAt(d.tempMaxMean) }));

  const ticks = usable
    .map((_, i) => i)
    .filter((i) => i % Math.ceil(usable.length / 7) === 0);

  return (
    <figure className="chart">
      <figcaption className="chart__caption">
        <span>Ensemble spread on daily highs ({memberCount} members)</span>
        <span className="chart__legend">
          <i className="swatch swatch--ensemble" /> Min–max band
          <i className="swatch swatch--temp" /> Member mean
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Ensemble temperature spread">
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
        <path d={areaPath(top, bot)} className="chart__ensemble-band" />
        <path d={linePath(mean)} className="chart__line chart__line--temp" fill="none" />
        {ticks.map((i) => (
          <text
            key={usable[i].date || i}
            x={xAt(i)}
            y={h - 12}
            className="chart__tick"
            textAnchor="middle"
          >
            {shortDay(usable[i].date)}
          </text>
        ))}
      </svg>
      <p className="chart__note">
        Narrow band = models agree. Wider band = treat that day as a temperature
        range, not a single number.
      </p>
    </figure>
  );
}
