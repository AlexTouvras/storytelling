import type { HourlyPoint } from "../../lib/types";
import {
  linePath,
  niceDomain,
  scale,
  shortHour,
} from "./chartUtils";

type Props = {
  hours: HourlyPoint[];
  title?: string;
  showPressure?: boolean;
};

export function HourlySeriesChart({
  hours,
  title = "Next hours",
  showPressure = false,
}: Props) {
  if (!hours.length) return null;

  const hasRain = hours.some((h) => h.precipMm > 0.05 || h.precipProb >= 15);
  const w = 720;
  const h = 260;
  const pad = { t: 28, r: showPressure ? 52 : 16, b: 36, l: 40 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const temps = hours.map((x) => x.temperature);
  const apps = hours.map((x) => x.apparent);
  const tempsDomain = niceDomain(
    Math.min(...temps, ...apps),
    Math.max(...temps, ...apps),
  );
  const precipMax = Math.max(...hours.map((x) => x.precipMm), 0.5);
  const precipDomain: [number, number] = [0, precipMax * 1.2];
  const pressVals = hours.map((x) => x.pressure).filter((v) => v > 800);
  const pressDomain = niceDomain(
    Math.min(...pressVals, 1000),
    Math.max(...pressVals, 1020),
    0.02,
  );

  const xAt = (i: number) =>
    pad.l + scale(i, [0, Math.max(hours.length - 1, 1)], [0, innerW]);
  const yTemp = (v: number) => pad.t + scale(v, tempsDomain, [innerH, 0]);
  const yPrecip = (v: number) => pad.t + scale(v, precipDomain, [innerH, 0]);
  const yPress = (v: number) => pad.t + scale(v, pressDomain, [innerH, 0]);

  const tempLine = hours.map((pt, i) => ({
    x: xAt(i),
    y: yTemp(pt.temperature),
  }));
  const appLine = hours.map((pt, i) => ({
    x: xAt(i),
    y: yTemp(pt.apparent),
  }));
  const pressLine = hours.map((pt, i) => ({
    x: xAt(i),
    y: yPress(pt.pressure || pressDomain[0]),
  }));

  const tickIdx = hours
    .map((_, i) => i)
    .filter((i) => i % Math.ceil(hours.length / 6) === 0);

  return (
    <figure className="chart">
      <figcaption className="chart__caption">
        <span>{title}</span>
        <span className="chart__legend">
          <i className="swatch swatch--temp" /> Temp
          <i className="swatch swatch--feel" /> Feels like
          {hasRain && (
            <>
              <i className="swatch swatch--rain" /> Rain mm
            </>
          )}
          {showPressure && (
            <>
              <i className="swatch swatch--pressure" /> Pressure (hPa)
            </>
          )}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={title}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.t + innerH * (1 - t);
          const val = tempsDomain[0] + (tempsDomain[1] - tempsDomain[0]) * t;
          const pVal = pressDomain[0] + (pressDomain[1] - pressDomain[0]) * t;
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
                {Math.round(val)}°
              </text>
              {showPressure && (
                <text
                  x={pad.l + innerW + 8}
                  y={y + 4}
                  className="chart__tick chart__tick--pressure"
                  textAnchor="start"
                >
                  {Math.round(pVal)}
                </text>
              )}
            </g>
          );
        })}

        {hasRain &&
          hours.map((pt, i) => {
            if (pt.precipMm <= 0) return null;
            const barW = Math.max(innerW / hours.length - 4, 4);
            const x = xAt(i) - barW / 2;
            const y = yPrecip(pt.precipMm);
            return (
              <rect
                key={`p-${pt.time}`}
                x={x}
                y={y}
                width={barW}
                height={pad.t + innerH - y}
                className="chart__rain-bar"
                opacity={0.35 + (pt.precipProb / 100) * 0.45}
              />
            );
          })}

        <path
          d={linePath(appLine)}
          className="chart__line chart__line--feel"
          fill="none"
        />
        <path
          d={linePath(tempLine)}
          className="chart__line chart__line--temp"
          fill="none"
        />
        {showPressure && (
          <path
            d={linePath(pressLine)}
            className="chart__line chart__line--pressure"
            fill="none"
          />
        )}

        {tickIdx.map((i) => (
          <text
            key={hours[i].time}
            x={xAt(i)}
            y={h - 10}
            className="chart__tick"
            textAnchor="middle"
          >
            {shortHour(hours[i].time)}
          </text>
        ))}

        {showPressure && (
          <text
            x={pad.l + innerW + 8}
            y={pad.t - 8}
            className="chart__tick chart__tick--pressure"
            textAnchor="start"
          >
            hPa
          </text>
        )}
      </svg>
    </figure>
  );
}
