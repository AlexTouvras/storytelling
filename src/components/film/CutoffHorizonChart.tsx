"use client";

import { useId, useMemo } from "react";
import pack from "../../../data/figures/where-should-the-cutoff-sit.v1.json";

export type HorizonPoint = {
  cutoffPd: number;
  approvalRate: number;
  badRateApproved: number | null;
};

type Props = {
  /** Live PD gate (same slider as the sleeve). Marker + readout come from the OOT frontier. */
  cutoffPd: number;
  pdMin?: number;
  pdMax?: number;
};

const BAD_AXIS_MAX = 0.12;

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v !== "" && Number.isFinite(Number(v)))
    return Number(v);
  return null;
}

export function frontierSeries(): HorizonPoint[] {
  return pack.frontier.points
    .map((row) => {
      const cutoffPd = num(row.CutoffPD);
      const approvalRate = num(row.ApprovalRate);
      const bad = num(row.BadRateApproved);
      if (cutoffPd === null || approvalRate === null) return null;
      return {
        cutoffPd,
        approvalRate,
        badRateApproved: bad,
      };
    })
    .filter((p): p is HorizonPoint => p !== null)
    .sort((a, b) => a.cutoffPd - b.cutoffPd);
}

/** OOT approval + bad among approved at a PD gate (same source as the chart). */
export function ootAtCutoff(cutoffPd: number) {
  return frontierAt(frontierSeries(), cutoffPd);
}

/** Linear interpolate frozen OOT frontier at a PD cut. */
export function frontierAt(series: HorizonPoint[], cutoffPd: number) {
  if (series.length === 0) {
    return { approvalRate: 0, badRateApproved: 0 };
  }
  if (cutoffPd <= series[0].cutoffPd) {
    return {
      approvalRate: series[0].approvalRate,
      badRateApproved: series[0].badRateApproved ?? 0,
    };
  }
  const last = series[series.length - 1];
  if (cutoffPd >= last.cutoffPd) {
    return {
      approvalRate: last.approvalRate,
      badRateApproved: last.badRateApproved ?? 0,
    };
  }
  let i = 1;
  while (i < series.length && series[i].cutoffPd < cutoffPd) i += 1;
  const lo = series[i - 1];
  const hi = series[i];
  const span = hi.cutoffPd - lo.cutoffPd || 1;
  const t = (cutoffPd - lo.cutoffPd) / span;
  const approvalRate = lo.approvalRate + (hi.approvalRate - lo.approvalRate) * t;
  const loBad = lo.badRateApproved;
  const hiBad = hi.badRateApproved;
  const badRateApproved =
    loBad === null || hiBad === null
      ? (hiBad ?? loBad ?? 0)
      : loBad + (hiBad - loBad) * t;
  return { approvalRate, badRateApproved };
}

function pct(n: number, digits = 1) {
  return `${(100 * n).toFixed(digits)}%`;
}

/**
 * Frozen OOT frontier (approval + bad-among-approved vs PD cut)
 * with a live marker for the operable gate — same source as the curves.
 */
export function CutoffHorizonChart({
  cutoffPd,
  pdMin = 0.02,
  pdMax = 0.25,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const series = useMemo(() => frontierSeries(), []);
  const mark = useMemo(
    () => frontierAt(series, cutoffPd),
    [series, cutoffPd],
  );
  const operatingPd = pack.policy.operating.cutoffPd;
  const youdenPd = pack.policy.youdenReference.cutoffPd;
  const appetite = pack.policy.appetite.budgetedBadRate;

  const W = 640;
  const H = 280;
  const pad = { t: 28, r: 52, b: 44, l: 48 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  const xOf = (pd: number) =>
    pad.l + ((pd - pdMin) / (pdMax - pdMin)) * plotW;
  const yApproval = (r: number) => pad.t + (1 - r) * plotH;
  const yBad = (r: number) =>
    pad.t + (1 - Math.min(r, BAD_AXIS_MAX) / BAD_AXIS_MAX) * plotH;

  const inWindow = series.filter(
    (p) => p.cutoffPd >= pdMin && p.cutoffPd <= pdMax,
  );
  const approvalPath = inWindow
    .map((p, i) => {
      const x = xOf(p.cutoffPd);
      const y = yApproval(p.approvalRate);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const badPts = inWindow.filter((p) => p.badRateApproved !== null);
  const badPath = badPts
    .map((p, i) => {
      const x = xOf(p.cutoffPd);
      const y = yBad(p.badRateApproved as number);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const clampedPd = Math.min(pdMax, Math.max(pdMin, cutoffPd));
  const liveX = xOf(clampedPd);
  const liveYa = yApproval(mark.approvalRate);
  const liveYb = yBad(mark.badRateApproved);
  const appetiteY = yBad(appetite);

  return (
    <figure
      data-testid="cutoff-horizon"
      className="mt-10 border border-white/10 bg-white/[0.02] p-4 md:p-5"
    >
      <figcaption className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
            Acceptance horizon · calculated OOT
          </p>
          <p className="mt-1 text-sm text-white/60">
            Both curves are the frozen Home Credit frontier. The crosshair is
            your gate on that same frontier — not the illustrative cloud.
          </p>
        </div>
        <ul className="flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-[0.12em] text-white/50">
          <li className="flex items-center gap-2">
            <span className="inline-block h-px w-4 bg-neon-cyan" /> Approval
            (left)
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-px w-4 bg-neon-violet" /> Bad among
            approved (right)
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-white" /> Live
            gate
          </li>
        </ul>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 h-auto w-full"
        role="img"
        aria-label={`At PD cut-off ${pct(cutoffPd)}, OOT approval ${pct(mark.approvalRate)}, OOT bad among approved ${pct(mark.badRateApproved)}`}
      >
        <defs>
          <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(92,214,226)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="rgb(92,214,226)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* left grid = approval 0–100% */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.t + (1 - t) * plotH;
          return (
            <g key={`a-${t}`}>
              <line
                x1={pad.l}
                x2={pad.l + plotW}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
              />
              <text
                x={pad.l - 8}
                y={y + 3}
                textAnchor="end"
                fill="rgba(92,214,226,0.45)"
                fontSize="10"
                fontFamily="ui-monospace, monospace"
              >
                {Math.round(t * 100)}%
              </text>
            </g>
          );
        })}

        {/* right ticks = bad 0–12% */}
        {[0, 0.04, 0.08, 0.12].map((r) => {
          const y = yBad(r);
          return (
            <text
              key={`b-${r}`}
              x={pad.l + plotW + 8}
              y={y + 3}
              fill="rgba(186,104,255,0.55)"
              fontSize="10"
              fontFamily="ui-monospace, monospace"
            >
              {pct(r, 0)}
            </text>
          );
        })}

        {/* appetite on bad-rate scale */}
        <line
          x1={pad.l}
          x2={pad.l + plotW}
          y1={appetiteY}
          y2={appetiteY}
          stroke="rgba(186,104,255,0.45)"
          strokeDasharray="3 5"
        />
        <text
          x={pad.l + 4}
          y={appetiteY - 6}
          fill="rgba(186,104,255,0.7)"
          fontSize="9"
          fontFamily="ui-monospace, monospace"
        >
          appetite {pct(appetite, 0)}
        </text>

        {/* operating / youden guides — reference anchors, not a second live gate */}
        {[
          { pd: youdenPd, label: "youden", color: "rgba(255,255,255,0.18)" },
          { pd: operatingPd, label: "op", color: "rgba(92,214,226,0.4)" },
        ].map((g) => (
          <g key={g.label}>
            <line
              x1={xOf(g.pd)}
              x2={xOf(g.pd)}
              y1={pad.t}
              y2={pad.t + plotH}
              stroke={g.color}
              strokeDasharray="2 4"
            />
            <text
              x={xOf(g.pd) + 4}
              y={pad.t + 12}
              fill={g.color}
              fontSize="9"
              fontFamily="ui-monospace, monospace"
            >
              {g.label}
            </text>
          </g>
        ))}

        {approvalPath ? (
          <>
            <path
              d={`${approvalPath} L${xOf(inWindow[inWindow.length - 1]?.cutoffPd ?? pdMax).toFixed(1)},${(pad.t + plotH).toFixed(1)} L${xOf(inWindow[0]?.cutoffPd ?? pdMin).toFixed(1)},${(pad.t + plotH).toFixed(1)} Z`}
              fill={`url(#fill-${uid})`}
            />
            <path
              d={approvalPath}
              fill="none"
              stroke="rgb(92,214,226)"
              strokeWidth="2"
            />
          </>
        ) : null}

        {badPath ? (
          <path
            d={badPath}
            fill="none"
            stroke="rgb(186,104,255)"
            strokeWidth="1.75"
            strokeDasharray="5 4"
          />
        ) : null}

        <line
          x1={liveX}
          x2={liveX}
          y1={pad.t}
          y2={pad.t + plotH}
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="1"
        />
        <circle
          data-testid="horizon-approval-dot"
          cx={liveX}
          cy={liveYa}
          r="5"
          fill="rgb(92,214,226)"
          stroke="rgb(8,12,18)"
          strokeWidth="2"
        />
        <circle
          data-testid="horizon-bad-dot"
          cx={liveX}
          cy={liveYb}
          r="4"
          fill="rgb(186,104,255)"
          stroke="rgb(8,12,18)"
          strokeWidth="2"
        />

        {[0.05, 0.1, 0.15, 0.2, 0.25].map((pd) => (
          <text
            key={pd}
            x={xOf(pd)}
            y={H - 14}
            textAnchor="middle"
            fill="rgba(255,255,255,0.35)"
            fontSize="10"
            fontFamily="ui-monospace, monospace"
          >
            {pct(pd, 0)}
          </text>
        ))}
        <text
          x={pad.l + plotW / 2}
          y={H - 2}
          textAnchor="middle"
          fill="rgba(255,255,255,0.4)"
          fontSize="10"
          fontFamily="ui-monospace, monospace"
        >
          Cut-off PD →
        </text>

        <text
          x={W - 4}
          y={pad.t + 8}
          textAnchor="end"
          fill="rgba(186,104,255,0.55)"
          fontSize="9"
          fontFamily="ui-monospace, monospace"
        >
          bad
        </text>
        <text
          x={12}
          y={pad.t + 8}
          fill="rgba(92,214,226,0.55)"
          fontSize="9"
          fontFamily="ui-monospace, monospace"
        >
          approval
        </text>
      </svg>

      <p
        data-testid="horizon-readout"
        className="mt-3 font-mono text-xs tracking-wide text-white/55"
      >
        Gate PD ≤ {pct(cutoffPd)} · OOT approval {pct(mark.approvalRate)} · OOT
        bad among approved {pct(mark.badRateApproved)}
      </p>
    </figure>
  );
}
