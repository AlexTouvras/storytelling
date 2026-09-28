import Link from "next/link";
import { cn } from "@/lib/cn";
import { KIND_INFO, kindAnchor, methodHref, type EvidenceKind } from "@/lib/reader/kinds";

type Props = {
  kind: EvidenceKind;
  slug: string;
  className?: string;
  testId?: string;
};

/** Where a figure comes from, linked to that label's entry on the method page. */
export function KindBadge({ kind, slug, className, testId = "beat-badge" }: Props) {
  const info = KIND_INFO[kind];
  return (
    <Link
      href={methodHref(slug, kindAnchor(kind))}
      data-testid={testId}
      data-kind={kind}
      title={info.definition}
      className={cn(
        "focus-ring pointer-events-auto rounded-full border border-white/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/55 transition-colors hover:border-white/45 hover:text-white/85",
        className,
      )}
    >
      {info.label}
    </Link>
  );
}

/** The label key, once, where the reader is told how to read the film. */
export function KindKey({ slug, className }: { slug: string; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-2", className)} aria-label="Where each number comes from">
      {(Object.keys(KIND_INFO) as EvidenceKind[]).map((kind) => (
        <li key={kind}>
          <KindBadge kind={kind} slug={slug} testId="kind-key" />
        </li>
      ))}
    </ul>
  );
}
