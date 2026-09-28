"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useReader } from "@/components/reader/ReaderContext";
import { KindKey } from "@/components/reader/KindBadge";
import { methodHref } from "@/lib/reader/kinds";
import { cn } from "@/lib/cn";

type Props = {
  /** The beat on screen; terms from later beats are marked as still to come. */
  beat?: number;
  className?: string;
};

/**
 * Every term the film teaches, reachable at any point. A disclosure rather
 * than a modal: the film keeps scrolling behind it, and Escape or the same
 * button closes it and returns focus.
 */
export function TermsDrawer({ beat, className }: Props) {
  const { slug, beats, terms } = useReader();
  const [open, setOpen] = useState(false);
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const byBeat = beats.map((name, index) => ({
    name,
    index,
    terms: terms.filter((t) => t.beat === index),
  }));

  return (
    <div className={cn("fixed right-4 top-4 z-40 flex flex-col items-end", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        data-testid="terms-toggle"
        onClick={() => setOpen((o) => !o)}
        className="focus-ring rounded-full border border-white/20 bg-void/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/75 backdrop-blur hover:border-white/45 hover:text-white"
      >
        {open ? "Close terms" : "Terms"}
      </button>
      <div
        ref={panelRef}
        id={id}
        role="region"
        aria-label="Terms used in this story"
        tabIndex={-1}
        hidden={!open}
        data-testid="terms-drawer"
        className="mt-2 max-h-[calc(100dvh-5rem)] w-[min(92vw,24rem)] overflow-y-auto rounded-lg border border-white/15 bg-void/95 p-5 text-left shadow-2xl outline-none backdrop-blur"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon-cyan/80">Terms</p>
        <div className="mt-3 space-y-5">
          {byBeat
            .filter((group) => group.terms.length > 0)
            .map((group) => {
              const later = beat !== undefined && group.index > beat;
              return (
                <section key={group.index} className={later ? "opacity-55" : undefined}>
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
                    {group.name}
                    {later ? " · still to come" : ""}
                  </h3>
                  <dl className="mt-2 space-y-3">
                    {group.terms.map((term) => (
                      <div key={term.id} data-testid="drawer-term" data-term={term.id}>
                        <dt className="text-sm font-semibold text-white">
                          {term.word}{" "}
                          <span className="font-mono text-[10px] font-normal uppercase tracking-[0.1em] text-white/45">
                            {term.technical}
                          </span>
                        </dt>
                        <dd className="mt-0.5 text-sm leading-snug text-white/65">{term.definition}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              );
            })}
        </div>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
          Where each number comes from
        </p>
        <KindKey slug={slug} className="mt-2" />
        <Link
          href={methodHref(slug)}
          className="focus-ring mt-5 inline-block font-mono text-[11px] uppercase tracking-[0.14em] text-neon-cyan/85 hover:text-neon-cyan"
        >
          Method, data and schema →
        </Link>
      </div>
    </div>
  );
}
