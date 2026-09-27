"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import type { Ref } from "react";

export type Label = {
  id: string;
  text: string;
  /** Artboard units. */
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  tone: "white" | "cyan" | "violet";
  /** Optional leader from the label to the thing it names, artboard units. */
  leader?: readonly [number, number, number, number];
};

const TONE = {
  white: "rgba(255,255,255,0.72)",
  cyan: "oklch(0.78 0.14 195)",
  violet: "oklch(0.72 0.2 300)",
} as const;

type Props = {
  labels: readonly Label[];
  /** 0–1, scrubbed by the director. Labels arrive in order across it. */
  progress: MotionValue<number>;
  /** Artboard units per screen pixel at full zoom, so type lands at a fixed size. */
  unitsPerPx: number;
  /** The director positions this group over the illustration every frame. */
  groupRef: Ref<SVGGElement>;
};

/**
 * Labels for an illustration, drawn in SVG in the illustration's own
 * coordinates. The director moves one group; nothing here re-renders per frame.
 */
export function AnnotationLayer({ labels, progress, unitsPerPx, groupRef }: Props) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      aria-hidden
      data-testid="annotation-layer"
    >
      <g ref={groupRef}>
        {labels.map((label, i) => (
          <AnnotationLabel
            key={label.id}
            label={label}
            progress={progress}
            index={i}
            count={labels.length}
            unitsPerPx={unitsPerPx}
          />
        ))}
      </g>
    </svg>
  );
}

function AnnotationLabel({
  label,
  progress,
  index,
  count,
  unitsPerPx,
}: {
  label: Label;
  progress: MotionValue<number>;
  index: number;
  count: number;
  unitsPerPx: number;
}) {
  const start = (index / count) * 0.5;
  const opacity = useTransform(progress, [start, start + 0.5], [0, 1], { clamp: true });
  const draw = useTransform(progress, [start, start + 0.35], [0, 1], { clamp: true });
  const colour = TONE[label.tone];
  return (
    <motion.g style={{ opacity }} data-label={label.id}>
      {label.leader ? (
        <motion.line
          x1={label.leader[0]}
          y1={label.leader[1]}
          x2={label.leader[2]}
          y2={label.leader[3]}
          stroke={colour}
          strokeWidth={unitsPerPx}
          style={{ pathLength: draw }}
        />
      ) : null}
      <text
        x={label.x}
        y={label.y}
        textAnchor={label.anchor}
        fill={colour}
        fontSize={11 * unitsPerPx}
        letterSpacing={1.6 * unitsPerPx}
        style={{ fontFamily: "var(--font-mono), ui-monospace, monospace", textTransform: "uppercase" }}
      >
        {label.text}
      </text>
    </motion.g>
  );
}
