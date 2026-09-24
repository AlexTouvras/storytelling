"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useScrollScene } from "@/components/storytelling/ScrollScene";

type Props = {
  id: string;
  headline: string;
  children: ReactNode;
  className?: string;
};

function splitActHeadline(headline: string): { act?: string; title: string } {
  const m = headline.match(/^Act\s+(\d+)\s+[—–-]\s+(.+)$/i);
  if (!m) return { title: headline };
  return { act: `Act ${m[1]}`, title: m[2] };
}

/**
 * Narrative step. Act labels break the uniform “heading + two paragraphs” look.
 */
export function StorySection({ id, headline, children, className }: Props) {
  const { activeSectionId } = useScrollScene();
  const isActive = activeSectionId === id;
  const { act, title } = splitActHeadline(headline);

  return (
    <section
      id={id}
      data-section-id={id}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "min-h-[85vh] border-l-2 py-8 pl-5 transition-colors duration-300",
        "pt-[min(42vh,280px)] lg:min-h-[70vh] lg:pt-12",
        isActive ? "border-neon-cyan/70" : "border-white/10",
        className,
      )}
    >
      {act ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon-cyan">
          {act}
        </p>
      ) : null}
      <h2
        className={cn(
          "font-display text-white",
          act ? "mt-2 text-2xl lg:text-3xl" : "text-section",
        )}
      >
        {title}
      </h2>
      <div className="mt-4 max-w-prose space-y-4 text-[oklch(var(--muted))] leading-relaxed [&_strong]:text-white">
        {children}
      </div>
    </section>
  );
}
