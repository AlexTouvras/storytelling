"use client";

import { arrival, clamp01 } from "@/components/film/craft";

export type SeasonMonth = {
  month: string;
  days: number;
  late_share: number;
  carry_all: number;
  carry_commuter: number;
  carry_long_distance: number;
};

type Props = {
  /** 0–1 from the frame. Act VI is the only beat that raises this. */
  strength: number;
  months: readonly SeasonMonth[];
};

const W = 560;
const H = 236;
const PAD = { t: 30, r: 46, b: 34, l: 44 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

/** Left axis: monthly share of arrivals running late. */
const LATE_MAX = 0.08;
/** Right axis: monthly carry-over. Zoomed, because the whole point is the width. */
const CARRY_MIN = 0.6;
const CARRY_MAX = 1;

const INITIALS = "JFMAMJJASOND";

function monthInitial(key: string): string {
  return INITIALS[Number(key.slice(5, 7)) - 1] ?? "?";
}

function pct(share: number, digits = 1): string {
  return `${(share * 100).toFixed(digits)}%`;
}

/**
 * Act VI, *A year of it* — twelve months of lateness volume against what happens
 * to a delay once it exists. Deliberately the shortest beat in the film and the
 * only one whose whole content is a panel, which is why the cue table reports a
 * hold here: nothing on the canvas moves.
 *
 * The two carry-over traces are commuter and long-distance rather than one
 * national line, because the winter rise is not shared — long-distance peaks in
 * February *and* April. A single line would have invited the reader to supply a
 * cause the data does not carry.
 *
 * No interaction. The reader is being told something, not asked to explore it.
 */
export function SeasonPanel({ strength, months }: Props) {
  const k = clamp01(strength);
  if (k < 0.01 || months.length === 0) return null;

  const band = PLOT_W / months.length;
  const xOf = (index: number) => PAD.l + (index + 0.5) * band;
  const yLate = (share: number) =>
    PAD.t + (1 - Math.min(share, LATE_MAX) / LATE_MAX) * PLOT_H;
  const yCarry = (share: number) =>
    PAD.t +
    (1 - (clamp01(share) - CARRY_MIN) / (CARRY_MAX - CARRY_MIN)) * PLOT_H;

  const line = (read: (month: SeasonMonth) => number) =>
    months
      .map((month, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yCarry(read(month)).toFixed(1)}`)
      .join(" ");

  const bandPath = `${line((m) => m.carry_commuter)} ${[...months]
    .reverse()
    .map((month, i) => {
      const index = months.length - 1 - i;
      return `L${xOf(index).toFixed(1)},${yCarry(month.carry_long_distance).toFixed(1)}`;
    })
    .join(" ")} Z`;

  const carryValues = months.map((m) => m.carry_all);
  const lateValues = months.map((m) => m.late_share);
  const carryLow = Math.min(...carryValues);
  const carryHigh = Math.max(...carryValues);

  // The traces draw on left to right instead of fading up as a sheet.
  const revealed = PAD.l + PLOT_W * arrival(1, k, 0.55);

  return (
    <figure
      data-testid="season-panel"
      className="pointer-events-none absolute left-1/2 top-1/2 w-[min(94vw,40rem)] -translate-x-1/2 -translate-y-[58%] border border-white/10 bg-void/80 p-4 backdrop-blur-sm md:p-5"
      style={{ opacity: k }}
    >
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
          Twelve months · observed
        </p>
        <ul className="flex flex-wrap gap-3 font-mono text-[9px] uppercase tracking-[0.12em] text-white/45">
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-1.5 bg-neon-violet/45" /> Late
            share (left)
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-px w-4 bg-neon-cyan" /> Carry-over
            (right)
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 bg-neon-cyan/15" />{" "}
            Commuter to long-distance
          </li>
        </ul>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 h-auto w-full"
        role="img"
        aria-label={`Monthly share of arrivals running late swings from ${pct(
          Math.min(...lateValues),
        )} to ${pct(Math.max(...lateValues))}, while carry-over at the next stop stays between ${pct(
          carryLow,
          0,
        )} and ${pct(carryHigh, 0)} in every month of the year.`}
      >
        <defs>
          <clipPath id="season-reveal">
            <rect
              x={PAD.l}
              y={0}
              width={Math.max(0, revealed - PAD.l)}
              height={H}
            />
          </clipPath>
        </defs>

        {/* Carry-over gridlines, so "never leaves this band" is readable. */}
        {[0.6, 0.7, 0.8, 0.9, 1].map((share) => (
          <g key={`carry-${share}`}>
            <line
              x1={PAD.l}
              x2={PAD.l + PLOT_W}
              y1={yCarry(share)}
              y2={yCarry(share)}
              stroke="rgba(255,255,255,0.06)"
            />
            <text
              x={PAD.l + PLOT_W + 7}
              y={yCarry(share) + 3}
              fill="rgba(92,214,226,0.5)"
              fontSize="9"
              fontFamily="ui-monospace, monospace"
            >
              {pct(share, 0)}
            </text>
          </g>
        ))}

        {[0, 0.04, 0.08].map((share) => (
          <text
            key={`late-${share}`}
            x={PAD.l - 7}
            y={yLate(share) + 3}
            textAnchor="end"
            fill="rgba(186,104,255,0.55)"
            fontSize="9"
            fontFamily="ui-monospace, monospace"
          >
            {pct(share, 0)}
          </text>
        ))}

        {months.map((month, i) => {
          const on = arrival(i / (months.length - 1), k, 0.2);
          if (on <= 0.001) return null;
          const top = yLate(month.late_share);
          const full = PAD.t + PLOT_H - top;
          const height = full * on;
          const width = band * 0.42;
          return (
            <rect
              key={`bar-${month.month}`}
              x={xOf(i) - width / 2}
              y={PAD.t + PLOT_H - height}
              width={width}
              height={height}
              fill="rgba(186,104,255,0.42)"
            />
          );
        })}

        <g clipPath="url(#season-reveal)">
          <path d={bandPath} fill="rgba(92,214,226,0.13)" />
          <path
            d={line((m) => m.carry_commuter)}
            fill="none"
            stroke="rgba(92,214,226,0.4)"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <path
            d={line((m) => m.carry_long_distance)}
            fill="none"
            stroke="rgba(92,214,226,0.4)"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <path
            d={line((m) => m.carry_all)}
            fill="none"
            stroke="rgb(92,214,226)"
            strokeWidth="2"
          />
        </g>

        {months.map((month, i) => (
          <text
            key={`tick-${month.month}`}
            x={xOf(i)}
            y={H - 16}
            textAnchor="middle"
            fill="rgba(255,255,255,0.35)"
            fontSize="10"
            fontFamily="ui-monospace, monospace"
          >
            {monthInitial(month.month)}
          </text>
        ))}
        <text
          x={PAD.l}
          y={H - 3}
          fill="rgba(255,255,255,0.3)"
          fontSize="9"
          fontFamily="ui-monospace, monospace"
        >
          {months[0].month} → {months[months.length - 1].month}
        </text>

        <text
          x={PAD.l + 4}
          y={PAD.t - 10}
          fill="rgba(92,214,226,0.6)"
          fontSize="9"
          fontFamily="ui-monospace, monospace"
        >
          carry-over stays {pct(carryLow, 0)}–{pct(carryHigh, 0)} all year
        </text>
      </svg>
    </figure>
  );
}
