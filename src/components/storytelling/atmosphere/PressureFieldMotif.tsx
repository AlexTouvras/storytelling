"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { buildPopulationMarks } from "@/components/storytelling/grammar";
import { cn } from "@/lib/cn";
import { isHeroLike, motifShell, type MotifProps } from "./types";

const MARKS = buildPopulationMarks(40);

/**
 * Shot: living residual-capacity field under rate pressure.
 * Thin = violet, thick = cyan. Focal point = lower third field.
 */
export function PressureFieldMotif({
  className,
  intensity = "hero",
}: MotifProps) {
  const reduced = usePrefersReducedMotion();
  const hero = isHeroLike(intensity);
  const subtle = intensity === "subtle";

  return (
    <div className={motifShell(className)} aria-hidden>
      <div
        className={cn(
          "absolute inset-0",
          hero &&
            "bg-[radial-gradient(80%_60%_at_50%_20%,oklch(0.22_0.04_250)_0%,oklch(0.10_0.02_264)_55%,oklch(0.08_0.02_264)_100%)]",
          subtle && "bg-transparent",
        )}
      />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex items-end justify-center gap-px px-[4%]",
          hero ? "h-[58%]" : "h-full",
          subtle && "opacity-35",
          intensity === "curtain" && "opacity-70 h-[70%]",
        )}
      >
        {MARKS.map((m, i) => {
          const base = Math.max(0.12, m.height);
          const hPct = base * (hero ? 92 : 70);
          return (
            <motion.div
              key={m.id}
              className={cn(
                "w-full max-w-[10px] flex-1 rounded-t-[1px]",
                m.thin ? "bg-neon-violet/45" : "bg-neon-cyan/30",
              )}
              initial={false}
              animate={
                reduced
                  ? { height: `${hPct}%`, opacity: m.thin ? 0.55 : 0.35 }
                  : {
                      height: [
                        `${hPct * 0.92}%`,
                        `${hPct}%`,
                        `${hPct * 0.88}%`,
                        `${hPct}%`,
                      ],
                      opacity: m.thin
                        ? [0.4, 0.65, 0.45, 0.6]
                        : [0.22, 0.38, 0.28, 0.35],
                    }
              }
              transition={
                reduced
                  ? { duration: 0 }
                  : {
                      duration: 5.5 + (i % 7) * 0.35,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: (i % 11) * 0.12,
                    }
              }
            />
          );
        })}
      </div>
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-[oklch(0.10_0.02_264)] to-transparent",
          hero ? "h-32" : "h-16",
        )}
      />
      {hero ? (
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[oklch(0.10_0.02_264)] to-transparent" />
      ) : null}
    </div>
  );
}
