import Link from "next/link";
import { methodHref } from "@/lib/reader/kinds";
import { cn } from "@/lib/cn";

type Props = {
  slug: string;
  /** What the reader will find there, in this story's words. */
  label?: string;
  className?: string;
};

/** The film's last line: the way into the method page, where the limits live. */
export function MethodLink({ slug, label = "Method, data, schema and limits", className }: Props) {
  return (
    <p className={cn("mx-auto max-w-3xl px-5 pb-28", className)}>
      <Link
        href={methodHref(slug)}
        data-testid="end-method-link"
        className="focus-ring font-mono text-[11px] uppercase tracking-[0.16em] text-neon-cyan/85 hover:text-neon-cyan"
      >
        {label} →
      </Link>
    </p>
  );
}
