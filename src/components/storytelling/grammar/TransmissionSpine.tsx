"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { TransmissionNodeId } from "./types";

const NODES: { id: TransmissionNodeId; label: string; short: string }[] = [
  { id: "central-bank", label: "Central bank", short: "CB" },
  { id: "market", label: "Market", short: "Mkt" },
  { id: "loan", label: "Loan rate", short: "Loan" },
  { id: "payment", label: "Payment", short: "Pay" },
  { id: "buffer", label: "Buffer", short: "Buf" },
];

type Props = {
  active: TransmissionNodeId[] | "all";
  dur: number;
  dock?: boolean;
};

/**
 * Persistent causal spine — same nodes every act; only emphasis changes.
 */
export function TransmissionSpine({ active, dur, dock }: Props) {
  const lit = (id: TransmissionNodeId) =>
    active === "all" || active.includes(id);

  return (
    <ol
      className={cn(
        "flex w-full items-stretch justify-between gap-0.5",
        dock ? "mb-2" : "mb-3",
      )}
      aria-label="Rate transmission chain"
    >
      {NODES.map((n, i) => {
        const on = lit(n.id);
        return (
          <li key={n.id} className="flex min-w-0 flex-1 items-center">
            <motion.div
              className={cn(
                "w-full rounded-md border px-1 text-center",
                dock ? "py-1" : "py-1.5",
                on
                  ? n.id === "buffer"
                    ? "border-neon-violet/50 bg-neon-violet/15 text-white"
                    : "border-neon-cyan/40 bg-neon-cyan/10 text-white"
                  : "border-white/8 bg-transparent text-white/30",
              )}
              initial={false}
              animate={{ opacity: on ? 1 : 0.45 }}
              transition={{ duration: dur }}
              title={n.label}
            >
              <span
                className={cn(
                  "block font-mono uppercase tracking-wider",
                  dock ? "text-[7px]" : "text-[8px]",
                )}
              >
                {dock ? n.short : n.label}
              </span>
            </motion.div>
            {i < NODES.length - 1 && (
              <span
                className="shrink-0 px-0.5 font-mono text-[9px] text-white/20"
                aria-hidden
              >
                →
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
