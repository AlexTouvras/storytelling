"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { isHeroLike, motifShell, type MotifProps } from "./types";

type Node = { id: string; x: number; y: number; r: number };

const NODES: Node[] = [
  { id: "a", x: 18, y: 32, r: 3 },
  { id: "b", x: 42, y: 22, r: 2.5 },
  { id: "c", x: 68, y: 28, r: 3.5 },
  { id: "d", x: 28, y: 58, r: 2 },
  { id: "e", x: 55, y: 52, r: 4 },
  { id: "f", x: 78, y: 62, r: 2.5 },
  { id: "g", x: 12, y: 72, r: 2 },
  { id: "h", x: 88, y: 40, r: 3 },
  { id: "i", x: 48, y: 78, r: 2.5 },
];

const EDGES: [string, string][] = [
  ["a", "b"],
  ["b", "c"],
  ["a", "d"],
  ["b", "e"],
  ["c", "h"],
  ["d", "e"],
  ["e", "f"],
  ["e", "i"],
  ["d", "g"],
  ["c", "f"],
];

/**
 * Shot: sparse constellation — systems / AI vernacular without logo neurons.
 * Focal point = central hub (e); edges faint; slow drift.
 */
export function ConstellationMotif({
  className,
  intensity = "hero",
}: MotifProps) {
  const reduced = usePrefersReducedMotion();
  const hero = isHeroLike(intensity);
  const op = intensity === "subtle" ? 0.28 : intensity === "curtain" ? 0.6 : 0.45;
  const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));

  return (
    <div className={motifShell(className)} aria-hidden>
      {hero ? (
        <div className="absolute inset-0 bg-[radial-gradient(55%_55%_at_50%_45%,oklch(0.18_0.06_300)_0%,oklch(0.09_0.02_264)_70%)]" />
      ) : null}
      <motion.svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: op }}
        animate={reduced ? undefined : { x: [0, 1.2, 0], y: [0, -0.8, 0] }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 22, repeat: Infinity, ease: "easeInOut" }
        }
      >
        {EDGES.map(([a, b]) => {
          const na = byId[a];
          const nb = byId[b];
          return (
            <line
              key={`${a}-${b}`}
              x1={na.x}
              y1={na.y}
              x2={nb.x}
              y2={nb.y}
              stroke="oklch(0.78 0.14 195 / 0.25)"
              strokeWidth={0.15}
            />
          );
        })}
        {NODES.map((n, i) => (
          <motion.circle
            key={n.id}
            cx={n.x}
            cy={n.y}
            r={n.r * 0.35}
            fill={
              n.id === "e"
                ? "oklch(0.78 0.14 195 / 0.85)"
                : "oklch(0.85 0.02 264 / 0.55)"
            }
            animate={
              reduced
                ? undefined
                : {
                    opacity: [0.35, 0.9, 0.4],
                    r: [n.r * 0.3, n.r * 0.4, n.r * 0.3],
                  }
            }
            transition={{
              duration: 5 + (i % 4),
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          />
        ))}
      </motion.svg>
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[oklch(0.10_0.02_264)] to-transparent" />
    </div>
  );
}
