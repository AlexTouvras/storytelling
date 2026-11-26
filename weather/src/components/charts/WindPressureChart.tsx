import type { HourlyPoint } from "../../lib/types";
import { linePath, niceDomain, scale, shortHour } from "./chartUtils";

type Props = {
  hours: HourlyPoint[];
};

export function WindPressureChart({ hours }: Props) {
  if (!hours.length) return null;
  const w = 720;
  const h = 220;
  const pad = { t: 24, r: 52, b: 40, l: 40 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const windDomain = niceDomain(
    0,
    Math.max(...hours.map((h) => Math.max(h.windSpeed, h.windGusts)), 1),
  );
  windDomain[0] = 0;
  const pressVals = hours.map((h) => h.pressure).filter((v) => v > 800);
  const pressDomain = niceDomain(
    Math.min(...pressVals, 1000),
    Math.max(...pressVals, 1025),
    0.02,
  );

  const xAt = (i: number) =>
    pad.l + scale(i, [0, Math.max(hours.length - 1, 1)], [0, innerW]);
  const yWind = (v: number) => pad.t + scale(v, windDomain, [innerH, 0]);
  const yPress = (v: number) => pad.t + scale(v, pressDomain, [innerH, 0]);

  const speed = hours.map((pt, i) => ({ x: xAt(i), y: yWind(pt.windSpeed) }));
  const gusts = hours.map((pt, i) => ({ x: xAt(i), y: yWind(pt.windGusts) }));
  const press = hours.map((pt, i) => ({
    x: xAt(i),
    y: yPress(pt.pressure || pressDomain[0]),
  }));

  const ticks = hours
    .map((_, i) => i)
    .filter((i) => i % Math.ceil(hours.length / 6) === 0);

  return (
    <figure className="chart">
      <figcaption className="chart__caption">
        <span>Wind and pressure</span>
        <span className="chart__legend">
          <i className="swatch swatch--temp" /> Wind (km/h)
          <i className="swatch swatch--feel" /> Gusts
          <i className="swatch swatch--pressure" /> Pressure (hPa, right)
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Wind and pressure">
        {[0, 0.5, 1].map((t) => {
          const y = pad.t + innerH * (1 - t);
          const windVal = windDomain[0] + (windDomain[1] - windDomain[0]) * t;
          const pressVal =
            pressDomain[0] + (pressDomain[1] - pressDomain[0]) * t;
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
                {Math.round(windVal)}
              </text>
              <text
                x={pad.l + innerW + 8}
                y={y + 4}
                className="chart__tick chart__tick--pressure"
                textAnchor="start"
              >
                {Math.round(pressVal)}
              </text>
            </g>
          );
        })}
        <path
          d={linePath(gusts)}
          className="chart__line chart__line--feel"
          fill="none"
        />
        <path
          d={linePath(speed)}
          className="chart__line chart__line--temp"
          fill="none"
        />
        <path
          d={linePath(press)}
          className="chart__line chart__line--pressure"
          fill="none"
        />
        {ticks.map((i) => (
          <text
            key={hours[i].time}
            x={xAt(i)}
            y={h - 12}
            className="chart__tick"
            textAnchor="middle"
          >
            {shortHour(hours[i].time)}
          </text>
        ))}
        <text
          x={pad.l + innerW + 8}
          y={pad.t - 8}
          className="chart__tick chart__tick--pressure"
          textAnchor="start"
        >
          hPa
        </text>
      </svg>
    </figure>
  );
}
