"use client";

import { AtmosphereLayer } from "@/components/storytelling/atmosphere";
import { cn } from "@/lib/cn";
import type { AtmosphereMotifId } from "@/stories/schemas/atmosphereAllowlist";

type Props = {
  title?: string;
  body: string;
  caveat: string;
  className?: string;
  /** Optional outro curtain behind the card. */
  motifId?: AtmosphereMotifId | string;
};

/**
 * Closing decision frame — meant to be screenshot-durable.
 */
export function DecisionCard({
  title = "The decision lens",
  body,
  caveat,
  className,
  motifId,
}: Props) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      {motifId ? (
        <AtmosphereLayer
          motifId={motifId}
          role="outro"
          className="opacity-90"
        />
      ) : null}
      <aside
        className={cn(
          "relative z-10 border border-neon-cyan/30 bg-[oklch(0.11_0.025_264)]/85 p-5 backdrop-blur-sm sm:p-6",
          motifId ? "rounded-2xl" : "rounded-2xl bg-neon-cyan/[0.06]",
        )}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neon-cyan">
          {title}
        </p>
        <p className="mt-3 text-base leading-relaxed text-white sm:text-lg">
          {body}
        </p>
        <p className="mt-4 font-mono text-[10px] leading-snug text-white/45">
          {caveat}
        </p>
      </aside>
    </div>
  );
}
