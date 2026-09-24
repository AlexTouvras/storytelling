"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";

/**
 * ONE persistent mechanism diagram for visualId `rate-risk-mechanism`.
 * Engine fixture — not the platform reference story.
 */

type Stage = {
  rate: number;
  rateLabel: string;
  debt: number;
  buffer: number;
  stress: number;
  showTransmission: boolean;
  showBands: boolean;
  showSegments: boolean;
  showConclusion: boolean;
  caption: string;
};

function stageFor(state: string): Stage {
  switch (state) {
    case "baseline":
      return {
        rate: 0.22,
        rateLabel: "r₀",
        debt: 0.32,
        buffer: 0.78,
        stress: 0.15,
        showTransmission: false,
        showBands: false,
        showSegments: false,
        showConclusion: false,
        caption: "Baseline: hypothetical rate + healthy cash-flow buffer",
      };
    case "rate-step-up":
      return {
        rate: 0.48,
        rateLabel: "r₁",
        debt: 0.48,
        buffer: 0.68,
        stress: 0.28,
        showTransmission: true,
        showBands: false,
        showSegments: false,
        showConclusion: false,
        caption: "Transmission: policy → lending → debt service",
      };
    case "buffer-shrink":
      return {
        rate: 0.82,
        rateLabel: "r↑",
        debt: 0.86,
        buffer: 0.22,
        stress: 0.78,
        showTransmission: true,
        showBands: false,
        showSegments: false,
        showConclusion: false,
        caption: "Mechanism: higher rate → higher debt service → thinner buffer",
      };
    case "risk-band-shift":
      return {
        rate: 0.82,
        rateLabel: "r↑",
        debt: 0.86,
        buffer: 0.22,
        stress: 0.8,
        showTransmission: false,
        showBands: true,
        showSegments: false,
        showConclusion: false,
        caption: "Illustrative risk bands — not observed default rates",
      };
    case "segment-focus":
      return {
        rate: 0.82,
        rateLabel: "r↑",
        debt: 0.86,
        buffer: 0.22,
        stress: 0.85,
        showTransmission: false,
        showBands: true,
        showSegments: true,
        showConclusion: false,
        caption: "Segments: thin-buffer borrowers feel pressure first (toy model)",
      };
    case "conclusion":
      return {
        rate: 0.82,
        rateLabel: "r↑",
        debt: 0.86,
        buffer: 0.22,
        stress: 0.88,
        showTransmission: false,
        showBands: false,
        showSegments: false,
        showConclusion: true,
        caption: "Full pathway — illustrative mechanism, not a forecast",
      };
    default:
      return {
        rate: 0.22,
        rateLabel: "r₀",
        debt: 0.32,
        buffer: 0.78,
        stress: 0.15,
        showTransmission: false,
        showBands: false,
        showSegments: false,
        showConclusion: false,
        caption: "Baseline: hypothetical rate + healthy cash-flow buffer",
      };
  }
}

const ease = [0.22, 1, 0.36, 1] as const;

const COL = { x: 48, w: 244 } as const;
const NODE = {
  rate: { y: 26, h: 34 },
  debt: { y: 78, h: 30 },
  buffer: { y: 128, h: 36 },
  stress: { y: 184, h: 26 },
} as const;

type Props = {
  visualState: string;
  className?: string;
  density?: "full" | "dock";
};

function FillBar({
  x,
  y,
  maxW,
  h,
  fill,
  color,
  dur,
}: {
  x: number;
  y: number;
  maxW: number;
  h: number;
  fill: number;
  color: string;
  dur: number;
}) {
  const w = Math.max(6, maxW * fill);
  return (
    <>
      <rect
        x={x}
        y={y}
        width={maxW}
        height={h}
        rx="4"
        fill="oklch(1 0 0 / 0.06)"
      />
      <motion.rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="4"
        fill={color}
        initial={false}
        animate={{ width: w }}
        transition={{ duration: dur, ease }}
      />
    </>
  );
}

export function RateRiskPanel({
  visualState,
  className,
  density = "full",
}: Props) {
  const reduced = usePrefersReducedMotion();
  const S = stageFor(visualState);
  const dur = reduced ? 0 : 0.45;
  const rateMarkerX = COL.x + 14 + S.rate * (COL.w - 44);
  const bands = S.showBands
    ? ([0.18, 0.34, 0.48] as const)
    : ([0.34, 0.4, 0.26] as const);
  const chainDim = S.showBands || S.showConclusion ? 0.22 : 1;
  const dock = density === "dock";

  return (
    <div className={cn("flex flex-col", dock ? "gap-1.5" : "gap-3", className)}>
      <p
        className={cn(
          "rounded-md border border-neon-cyan/25 bg-neon-cyan/10 font-mono text-neon-cyan",
          dock ? "px-2 py-1 text-[10px] leading-tight" : "px-3 py-2 text-xs",
        )}
      >
        Illustrative model — not observed evidence.
      </p>

      <div
        className={cn(
          "glass relative overflow-hidden rounded-2xl",
          dock ? "p-2" : "p-3 sm:p-4",
        )}
        role="img"
        aria-label={S.caption}
        data-visual-id="rate-risk-mechanism"
        data-visual-state={visualState}
      >
        <svg
          viewBox="0 0 340 280"
          className={cn(
            "mx-auto h-auto w-full",
            dock && "max-h-[28vh]",
          )}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            width="340"
            height="280"
            rx="12"
            fill="oklch(0.14 0.028 264)"
          />

          {/* Persistent dashed spine */}
          <motion.g
            initial={false}
            animate={{ opacity: S.showConclusion ? 0.15 : 0.9 }}
            transition={{ duration: dur }}
          >
            {(
              [
                [NODE.rate.y + NODE.rate.h, NODE.debt.y],
                [NODE.debt.y + NODE.debt.h, NODE.buffer.y],
                [NODE.buffer.y + NODE.buffer.h, NODE.stress.y],
              ] as const
            ).map(([y1, y2], i) => (
              <g key={i}>
                <line
                  x1="170"
                  y1={y1}
                  x2="170"
                  y2={y2}
                  stroke="oklch(0.78 0.14 195 / 0.4)"
                  strokeWidth="2"
                  strokeDasharray="3 4"
                />
                <polygon
                  points={`170,${y2 - 1} 166,${y2 - 7} 174,${y2 - 7}`}
                  fill="oklch(0.78 0.14 195 / 0.5)"
                />
              </g>
            ))}
          </motion.g>

          {/* ===== RATE ===== */}
          <motion.g
            initial={false}
            animate={{ opacity: chainDim }}
            transition={{ duration: dur }}
          >
            <text
              x={COL.x}
              y={NODE.rate.y - 6}
              fill="oklch(0.68 0.025 264)"
              fontSize="10"
              fontFamily="ui-monospace, monospace"
            >
              1 · Hypothetical rate
            </text>
            <rect
              x={COL.x}
              y={NODE.rate.y}
              width={COL.w}
              height={NODE.rate.h}
              rx="8"
              fill="oklch(1 0 0 / 0.04)"
              stroke="oklch(1 0 0 / 0.14)"
            />
            <line
              x1={COL.x + 14}
              x2={COL.x + COL.w - 14}
              y1={NODE.rate.y + NODE.rate.h / 2}
              y2={NODE.rate.y + NODE.rate.h / 2}
              stroke="oklch(1 0 0 / 0.18)"
              strokeWidth="2"
            />
            <motion.circle
              cy={NODE.rate.y + NODE.rate.h / 2}
              r="8"
              fill="oklch(0.78 0.14 195)"
              initial={false}
              animate={{ cx: rateMarkerX }}
              transition={{ duration: dur, ease }}
            />
            <motion.text
              y={NODE.rate.y + NODE.rate.h / 2 + 4}
              fill="oklch(0.93 0.015 264)"
              fontSize="12"
              fontFamily="ui-monospace, monospace"
              fontWeight="600"
              initial={false}
              animate={{ x: rateMarkerX + 12 }}
              transition={{ duration: dur, ease }}
            >
              {S.rateLabel}
            </motion.text>
          </motion.g>

          <motion.text
            x="178"
            y={NODE.rate.y + NODE.rate.h + 12}
            fill="oklch(0.78 0.14 195)"
            fontSize="8"
            fontFamily="ui-monospace, monospace"
            initial={false}
            animate={{
              opacity: S.showTransmission && !S.showConclusion ? 1 : 0,
            }}
            transition={{ duration: dur }}
          >
            policy → lending → debt svc
          </motion.text>

          {/* ===== DEBT SERVICE ===== */}
          <motion.g
            initial={false}
            animate={{ opacity: chainDim }}
            transition={{ duration: dur }}
          >
            <text
              x={COL.x}
              y={NODE.debt.y - 6}
              fill="oklch(0.68 0.025 264)"
              fontSize="10"
              fontFamily="ui-monospace, monospace"
            >
              2 · Debt service (hyp.)
            </text>
            <rect
              x={COL.x}
              y={NODE.debt.y}
              width={COL.w}
              height={NODE.debt.h}
              rx="8"
              fill="oklch(1 0 0 / 0.04)"
              stroke="oklch(1 0 0 / 0.14)"
            />
            <FillBar
              x={COL.x + 8}
              y={NODE.debt.y + 7}
              maxW={COL.w - 16}
              h={NODE.debt.h - 14}
              fill={S.debt}
              color="oklch(0.62 0.16 255)"
              dur={dur}
            />
          </motion.g>

          {/* ===== BUFFER ===== */}
          <motion.g
            initial={false}
            animate={{ opacity: S.showBands || S.showConclusion ? 0.12 : 1 }}
            transition={{ duration: dur }}
          >
            <text
              x={COL.x}
              y={NODE.buffer.y - 6}
              fill="oklch(0.68 0.025 264)"
              fontSize="10"
              fontFamily="ui-monospace, monospace"
            >
              3 · Borrower cash-flow buffer (hyp.)
            </text>
            <rect
              x={COL.x}
              y={NODE.buffer.y}
              width={COL.w}
              height={NODE.buffer.h}
              rx="8"
              fill="oklch(1 0 0 / 0.04)"
              stroke="oklch(1 0 0 / 0.14)"
            />
            <FillBar
              x={COL.x + 8}
              y={NODE.buffer.y + 8}
              maxW={COL.w - 16}
              h={NODE.buffer.h - 16}
              fill={S.buffer}
              color="oklch(0.78 0.14 195)"
              dur={dur}
            />
            <text
              x={COL.x + 12}
              y={NODE.buffer.y + NODE.buffer.h - 5}
              fill="oklch(0.12 0.025 264)"
              fontSize="8"
              fontFamily="ui-monospace, monospace"
              fontWeight="600"
            >
              remaining spare capacity
            </text>
          </motion.g>

          {/* ===== STRESS ===== */}
          <motion.g
            initial={false}
            animate={{ opacity: S.showBands || S.showConclusion ? 0.12 : 1 }}
            transition={{ duration: dur }}
          >
            <text
              x={COL.x}
              y={NODE.stress.y - 6}
              fill="oklch(0.68 0.025 264)"
              fontSize="10"
              fontFamily="ui-monospace, monospace"
            >
              4 · Stress pressure (concept)
            </text>
            <rect
              x={COL.x}
              y={NODE.stress.y}
              width={COL.w}
              height={NODE.stress.h}
              rx="8"
              fill="oklch(1 0 0 / 0.04)"
              stroke="oklch(1 0 0 / 0.14)"
            />
            <FillBar
              x={COL.x + 8}
              y={NODE.stress.y + 6}
              maxW={COL.w - 16}
              h={NODE.stress.h - 12}
              fill={S.stress}
              color="oklch(0.62 0.22 300)"
              dur={dur}
            />
          </motion.g>

          {/* ===== RISK BANDS (same slot as buffer/stress) ===== */}
          <motion.g
            initial={false}
            animate={{ opacity: S.showBands && !S.showConclusion ? 1 : 0 }}
            transition={{ duration: dur }}
            style={{
              pointerEvents:
                S.showBands && !S.showConclusion ? "auto" : "none",
            }}
          >
            <text
              x={COL.x}
              y={NODE.buffer.y - 6}
              fill="oklch(0.68 0.025 264)"
              fontSize="10"
              fontFamily="ui-monospace, monospace"
            >
              5 · Illustrative risk bands (same borrowers)
            </text>
            <text
              x={COL.x}
              y={NODE.buffer.y + 10}
              fill="oklch(0.62 0.22 300)"
              fontSize="8"
              fontFamily="ui-monospace, monospace"
            >
              hypothetical weights — not default probabilities
            </text>
            {(["Lower", "Mid", "Higher"] as const).map((label, i) => {
              const colors = [
                "oklch(0.78 0.14 195)",
                "oklch(0.62 0.16 255)",
                "oklch(0.62 0.22 300)",
              ];
              const gap = 8;
              const bw = (COL.w - 16 - gap * 2) / 3;
              const x = COL.x + 8 + i * (bw + gap);
              const h = 20 + bands[i] * 48;
              const y = NODE.stress.y + NODE.stress.h - 4 - h;
              const emphasize = S.showSegments && i === 2;
              const dim = S.showSegments && i !== 2;
              return (
                <g key={label}>
                  <motion.rect
                    x={x}
                    width={bw}
                    rx="5"
                    fill={colors[i]}
                    initial={false}
                    animate={{
                      height: h,
                      y,
                      fillOpacity: dim ? 0.28 : emphasize ? 1 : 0.85,
                    }}
                    transition={{
                      duration: dur,
                      ease,
                      delay: reduced ? 0 : i * 0.04,
                    }}
                    stroke={emphasize ? "oklch(0.93 0.015 264)" : "none"}
                    strokeWidth={emphasize ? 1.5 : 0}
                  />
                  <text
                    x={x + bw / 2}
                    y={NODE.stress.y + NODE.stress.h + 14}
                    textAnchor="middle"
                    fill={
                      emphasize
                        ? "oklch(0.78 0.14 195)"
                        : "oklch(0.68 0.025 264)"
                    }
                    fontSize="9"
                    fontFamily="ui-monospace, monospace"
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </motion.g>

          {/* Segment buffer stubs */}
          <motion.g
            initial={false}
            animate={{
              opacity: S.showSegments && !S.showConclusion ? 1 : 0,
            }}
            transition={{ duration: dur }}
          >
            <text
              x={COL.x}
              y="246"
              fill="oklch(0.78 0.14 195)"
              fontSize="8"
              fontFamily="ui-monospace, monospace"
            >
              Buffer by segment — low buffer feels the shock first
            </text>
            {(
              [
                { label: "High", fill: 0.85 },
                { label: "Med", fill: 0.5 },
                { label: "Low", fill: 0.18 },
              ] as const
            ).map((seg, i) => {
              const gap = 8;
              const bw = (COL.w - 16 - gap * 2) / 3;
              const x = COL.x + 8 + i * (bw + gap);
              const fragile = i === 2;
              return (
                <g key={seg.label}>
                  <rect
                    x={x}
                    y="252"
                    width={bw}
                    height="12"
                    rx="3"
                    fill="oklch(1 0 0 / 0.06)"
                    stroke={
                      fragile
                        ? "oklch(0.78 0.14 195 / 0.75)"
                        : "oklch(1 0 0 / 0.1)"
                    }
                  />
                  <rect
                    x={x}
                    y="252"
                    width={bw * seg.fill}
                    height="12"
                    rx="3"
                    fill={
                      fragile
                        ? "oklch(0.62 0.22 300)"
                        : "oklch(0.78 0.14 195 / 0.65)"
                    }
                  />
                </g>
              );
            })}
          </motion.g>

          {/* Conclusion pathway */}
          <motion.g
            initial={false}
            animate={{ opacity: S.showConclusion ? 1 : 0 }}
            transition={{ duration: dur }}
            style={{ pointerEvents: S.showConclusion ? "auto" : "none" }}
          >
            <text
              x={COL.x}
              y="40"
              fill="oklch(0.68 0.025 264)"
              fontSize="10"
              fontFamily="ui-monospace, monospace"
            >
              Causal pathway (illustrative)
            </text>
            {(
              [
                { t: "↑ rate", x: 48 },
                { t: "↑ debt", x: 112 },
                { t: "↓ buffer", x: 176 },
                { t: "↑ stress", x: 240 },
              ] as const
            ).map((step, i) => (
              <g key={step.t}>
                <rect
                  x={step.x}
                  y="52"
                  width="54"
                  height="34"
                  rx="8"
                  fill="oklch(1 0 0 / 0.06)"
                  stroke="oklch(0.78 0.14 195 / 0.45)"
                />
                <text
                  x={step.x + 27}
                  y="73"
                  textAnchor="middle"
                  fill="oklch(0.93 0.015 264)"
                  fontSize="10"
                  fontFamily="ui-monospace, monospace"
                >
                  {step.t}
                </text>
                {i < 3 && (
                  <text
                    x={step.x + 54}
                    y="73"
                    fill="oklch(0.78 0.14 195)"
                    fontSize="12"
                  >
                    →
                  </text>
                )}
              </g>
            ))}
            <rect
              x={COL.x}
              y="104"
              width={COL.w}
              height="40"
              rx="10"
              fill="oklch(0.62 0.22 300 / 0.18)"
              stroke="oklch(0.62 0.22 300 / 0.5)"
            />
            <text
              x={COL.x + COL.w / 2}
              y="128"
              textAnchor="middle"
              fill="oklch(0.93 0.015 264)"
              fontSize="12"
              fontFamily="ui-monospace, monospace"
            >
              → greater stress pressure
            </text>
            <text
              x={COL.x}
              y="168"
              fill="oklch(0.68 0.025 264)"
              fontSize="9"
              fontFamily="ui-monospace, monospace"
            >
              Same mechanism throughout · no observed defaults shown
            </text>
          </motion.g>

          <text
            x="24"
            y="274"
            fill="oklch(0.68 0.025 264)"
            fontSize="8"
            fontFamily="ui-monospace, monospace"
          >
            teaching labels only · not market data
          </text>
        </svg>
      </div>

      <p
        className={cn(
          "font-mono text-[oklch(var(--muted))]",
          dock ? "text-[10px] leading-snug" : "text-xs",
        )}
      >
        {S.caption}
      </p>
    </div>
  );
}
