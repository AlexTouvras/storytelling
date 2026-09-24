import { cn } from "@/lib/cn";

export type EvidenceKind =
  | "modeled"
  | "observed"
  | "hypothetical"
  | "calculated";

const STYLES: Record<
  EvidenceKind,
  { label: string; className: string }
> = {
  modeled: {
    label: "Modeled",
    className: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  },
  observed: {
    label: "Observed",
    className: "border-emerald-400/35 bg-emerald-400/10 text-emerald-100",
  },
  hypothetical: {
    label: "Hypothetical",
    className: "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan",
  },
  calculated: {
    label: "Calculated",
    className: "border-violet-300/35 bg-violet-300/10 text-violet-100",
  },
};

type Props = {
  kind: EvidenceKind;
  lines: string[];
  compact?: boolean;
  className?: string;
};

/**
 * Epistemic badge — reusable Orbit visual language for provenance.
 */
export function EvidenceBadge({ kind, lines, compact, className }: Props) {
  const s = STYLES[kind];
  return (
    <div
      className={cn(
        "rounded-lg border font-mono",
        s.className,
        compact ? "px-2 py-1.5 text-[9px] leading-snug" : "px-3 py-2 text-[10px] leading-snug",
        className,
      )}
    >
      <p className="uppercase tracking-[0.14em]">{s.label}</p>
      {lines.map((line) => (
        <p key={line} className="mt-0.5 opacity-90">
          {line}
        </p>
      ))}
    </div>
  );
}
