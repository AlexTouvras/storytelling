import Link from "next/link";
import { KindKey } from "@/components/reader/KindBadge";
import { methodHref } from "@/lib/reader/kinds";
import { cn } from "@/lib/cn";

export const READING_LINE =
  "Scroll to move through it. Underlined words explain themselves when you tap them. Badges say where each number comes from.";

type Props = {
  slug: string;
  orientation: string;
  className?: string;
};

/**
 * Read before the first beat: what the story is about in plain words, how to
 * read the film, and where the full method lives. It teaches no terms; the
 * film does that where each one is first needed.
 */
export function OrientationCard({ slug, orientation, className }: Props) {
  return (
    <aside
      data-testid="orientation-card"
      aria-label="Before you start"
      className={cn("rounded-lg border border-white/12 bg-white/[0.03] p-5 md:p-6", className)}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon-cyan/80">Before you start</p>
      <p className="mt-3 text-base leading-relaxed text-white/80 md:text-lg">{orientation}</p>
      <p className="mt-4 text-sm leading-relaxed text-white/55">{READING_LINE}</p>
      <KindKey slug={slug} className="mt-3" />
      <Link
        href={methodHref(slug)}
        data-testid="method-link"
        className="focus-ring mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.14em] text-neon-cyan/85 hover:text-neon-cyan"
      >
        How this was made: method, data and schema →
      </Link>
    </aside>
  );
}
