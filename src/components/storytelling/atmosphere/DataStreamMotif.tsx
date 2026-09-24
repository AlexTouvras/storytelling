"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { cn } from "@/lib/cn";
import { isHeroLike, motifShell, type MotifProps } from "./types";

const GLYPHS = ["·", "│", "▌", "░", "0", "1", "┊", "·"] as const;
const COLS = 16;
const ROWS = 10;

/**
 * Shot: vertical glyph rain — tokens, not KPIs.
 * Focal point = mid-field density; no readable metrics.
 */
export function DataStreamMotif({
  className,
  intensity = "hero",
}: MotifProps) {
  const reduced = usePrefersReducedMotion();
  const hero = isHeroLike(intensity);
  const baseOp = intensity === "subtle" ? 0.2 : intensity === "curtain" ? 0.5 : 0.35;

  return (
    <div className={motifShell(className)} aria-hidden>
      {hero ? (
        <div className="absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_0%,oklch(0.20_0.05_195)_0%,oklch(0.09_0.02_264)_65%)]" />
      ) : null}
      <div
        className="absolute inset-0 flex justify-between px-[3%] pt-[8%]"
        style={{ opacity: baseOp }}
      >
        {Array.from({ length: COLS }, (_, c) => (
          <div key={c} className="flex flex-col gap-2 font-mono text-[10px] text-neon-cyan/80 sm:text-xs">
            {Array.from({ length: ROWS }, (_, r) => {
              const g = GLYPHS[(c + r * 3) % GLYPHS.length];
              return (
                <motion.span
                  key={r}
                  className={cn(r % 4 === 0 && "text-white/50")}
                  animate={
                    reduced
                      ? undefined
                      : {
                          y: [0, 12, 0],
                          opacity: [0.15, 0.85, 0.2],
                        }
                  }
                  transition={{
                    duration: 4 + (c % 5) * 0.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: (c * 0.08 + r * 0.05) % 3,
                  }}
                >
                  {g}
                </motion.span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[oklch(0.10_0.02_264)] to-transparent" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[oklch(0.10_0.02_264)] to-transparent" />
    </div>
  );
}
