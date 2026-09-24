"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { isHeroLike, motifShell, type MotifProps } from "./types";

function ribbonPath(phase: number, amp: number, y0: number): string {
  const w = 1000;
  const steps = 40;
  let d = `M 0 ${y0}`;
  for (let i = 1; i <= steps; i++) {
    const x = (i / steps) * w;
    const y = y0 + Math.sin((i / steps) * Math.PI * 4 + phase) * amp;
    d += ` L ${x} ${y}`;
  }
  return d;
}

/**
 * Shot: layered sine ribbons — oscilloscope calm.
 * Focal point = horizontal mid ribbons; slow phase.
 */
export function SignalRibbonMotif({
  className,
  intensity = "hero",
}: MotifProps) {
  const reduced = usePrefersReducedMotion();
  const hero = isHeroLike(intensity);
  const op = intensity === "subtle" ? 0.3 : intensity === "curtain" ? 0.65 : 0.5;

  const ribbons = [
    { phase: 0, amp: 28, y: 180, color: "oklch(0.78 0.14 195 / 0.55)" },
    { phase: 1.2, amp: 40, y: 220, color: "oklch(0.62 0.16 255 / 0.4)" },
    { phase: 2.4, amp: 22, y: 260, color: "oklch(0.62 0.22 300 / 0.35)" },
  ];

  return (
    <div className={motifShell(className)} aria-hidden>
      {hero ? (
        <div className="absolute inset-0 bg-[radial-gradient(80%_50%_at_50%_50%,oklch(0.16_0.04_255)_0%,oklch(0.09_0.02_264)_70%)]" />
      ) : null}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1000 480"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: op }}
      >
        {ribbons.map((r, i) => (
          <motion.path
            key={i}
            fill="none"
            stroke={r.color}
            strokeWidth={1.4}
            d={ribbonPath(r.phase, r.amp, r.y)}
            animate={
              reduced
                ? undefined
                : {
                    d: [
                      ribbonPath(r.phase, r.amp, r.y),
                      ribbonPath(r.phase + 1.2, r.amp, r.y),
                      ribbonPath(r.phase + 2.4, r.amp, r.y),
                      ribbonPath(r.phase, r.amp, r.y),
                    ],
                  }
            }
            transition={{
              duration: 14 + i * 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[oklch(0.10_0.02_264)] to-transparent" />
    </div>
  );
}
