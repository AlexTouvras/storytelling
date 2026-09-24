"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { cn } from "@/lib/cn";
import { isHeroLike, motifShell, type MotifProps } from "./types";

const COLS = 12;
const ROWS = 8;

/**
 * Shot: soft ledger grid; tick marks drift like tape.
 * Focal point = center lattice; edges fade.
 */
export function LedgerDriftMotif({
  className,
  intensity = "hero",
}: MotifProps) {
  const reduced = usePrefersReducedMotion();
  const hero = isHeroLike(intensity);
  const opacity = intensity === "subtle" ? 0.25 : intensity === "curtain" ? 0.55 : 0.4;

  return (
    <div className={motifShell(className)} aria-hidden>
      {hero ? (
        <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_40%,oklch(0.18_0.03_250)_0%,oklch(0.09_0.02_264)_70%)]" />
      ) : null}
      <motion.div
        className="absolute inset-[8%] border border-white/[0.06]"
        style={{ opacity }}
        animate={reduced ? undefined : { x: [0, 6, 0], y: [0, -4, 0] }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 18, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: `${100 / COLS}% ${100 / ROWS}%`,
          }}
        />
        {Array.from({ length: COLS * 2 }, (_, i) => (
          <motion.span
            key={i}
            className={cn(
              "absolute h-px bg-neon-cyan/40",
              i % 3 === 0 ? "w-6" : "w-3",
            )}
            style={{
              top: `${12 + (i % ROWS) * (76 / ROWS)}%`,
              left: `${(i * 7) % 88}%`,
            }}
            animate={
              reduced
                ? undefined
                : { x: [0, 40 + (i % 5) * 8, 0], opacity: [0.2, 0.7, 0.2] }
            }
            transition={{
              duration: 10 + (i % 6),
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.15,
            }}
          />
        ))}
      </motion.div>
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[oklch(0.10_0.02_264)] to-transparent" />
    </div>
  );
}
