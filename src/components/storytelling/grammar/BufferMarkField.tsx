"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { BufferMark } from "./types";

const ease = [0.22, 1, 0.36, 1] as const;

type Props = {
  marks: BufferMark[];
  dur: number;
  /** When set, non-matching marks dim (filter / sleeve). */
  keep?: (m: BufferMark) => boolean;
  dock?: boolean;
  className?: string;
};

/**
 * Stable vertical marks — same encoding across zoom levels.
 * Height = residual buffer; violet = thin; cyan = thick.
 */
export function BufferMarkField({
  marks,
  dur,
  keep,
  dock,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex w-full items-end gap-px",
        dock ? "h-24" : "h-32",
        className,
      )}
      role="img"
      aria-label={`${marks.length} buffer marks`}
    >
      {marks.map((m, i) => {
        const visible = keep ? keep(m) : true;
        const h = Math.max(8, Math.round(m.height * (dock ? 88 : 120)));
        return (
          <motion.div
            key={m.id}
            layout
            className={cn(
              "relative flex-1 rounded-t-[1px]",
              m.thin ? "bg-neon-violet/60" : "bg-neon-cyan/45",
            )}
            initial={false}
            animate={{
              height: h,
              opacity: visible ? 1 : 0.07,
            }}
            transition={{
              duration: dur,
              delay: Math.min(i * 0.004, 0.2),
              ease,
              layout: { duration: dur * 0.8 },
            }}
            title={m.label}
          />
        );
      })}
    </div>
  );
}

/** Deterministic population field — shared ids across book / sleeve / annotate. */
export function buildPopulationMarks(count = 48): BufferMark[] {
  return Array.from({ length: count }, (_, i) => {
    const h = (12 + ((i * 17) % 30) + (i % 6 === 0 ? 38 : 0)) / 50;
    const height = Math.min(1, h);
    const thin = height < 0.56;
    const floating = i % 3 !== 0;
    return {
      id: `loan-${i}`,
      height,
      thin,
      floating,
    };
  });
}

export const SEGMENT_MARKS: BufferMark[] = [
  { id: "seg-high", height: 0.82, thin: false, floating: true, label: "High" },
  { id: "seg-med", height: 0.36, thin: false, floating: true, label: "Medium" },
  { id: "seg-low", height: 0.1, thin: true, floating: true, label: "Low" },
];

export const HOUSEHOLD_MARKS: BufferMark[] = [
  {
    id: "hh-buffer",
    height: 0.25,
    thin: false,
    floating: true,
    label: "Buffer 25%→10%",
  },
];

export const STUB_MARKS: BufferMark[] = [
  { id: "stub-rates", height: 0.55, thin: false, floating: false, label: "Rates ↑" },
  { id: "stub-pay", height: 0.7, thin: false, floating: true, label: "Payment ↑" },
  { id: "stub-buf", height: 0.22, thin: true, floating: true, label: "Buffer ↓" },
];
