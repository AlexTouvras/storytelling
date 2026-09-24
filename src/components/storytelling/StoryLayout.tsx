"use client";

import type { ReactNode } from "react";
import type { StoryManifest } from "@/stories/schemas/manifest";
import { cn } from "@/lib/cn";
import {
  ScrollSceneProvider,
  StoryScrollama,
  StoryStep,
} from "@/components/storytelling/ScrollScene";
import { StoryHero } from "@/components/storytelling/StoryHero";
import { StorySection } from "@/components/storytelling/StorySection";
import { StickyVisual } from "@/components/storytelling/StickyVisual";
import { AtmosphereProvider } from "@/components/storytelling/AtmosphereContext";

/** Minimal markdown: paragraphs + **bold**. No HTML from the manifest. */
function renderBody(body: string): ReactNode {
  return body.split(/\n\n+/).map((para, i) => {
    const parts = para.split(/(\*\*[^*]+\*\*)/g).map((chunk, j) => {
      if (chunk.startsWith("**") && chunk.endsWith("**")) {
        return <strong key={j}>{chunk.slice(2, -2)}</strong>;
      }
      return <span key={j}>{chunk}</span>;
    });
    return (
      <p key={i} className="whitespace-pre-line">
        {parts}
      </p>
    );
  });
}

type Props = {
  manifest: StoryManifest;
};

function StoryFooter({ manifest }: { manifest: StoryManifest }) {
  const { sources, methodology, limitations, dataRefs } = manifest;
  return (
    <footer className="mt-16 space-y-8 border-t border-white/10 pt-10 lg:mt-20">
      <div>
        <h2 className="font-display text-xl text-white">Methodology</h2>
        <p className="mt-2 text-sm leading-relaxed text-[oklch(var(--muted))]">
          {methodology}
        </p>
      </div>
      <div>
        <h2 className="font-display text-xl text-white">Limitations</h2>
        <p className="mt-2 text-sm leading-relaxed text-[oklch(var(--muted))]">
          {limitations}
        </p>
      </div>
      {dataRefs.length > 0 && (
        <div>
          <h2 className="font-display text-xl text-white">Data references</h2>
          <ul className="mt-2 space-y-2 text-sm text-[oklch(var(--muted))]">
            {dataRefs.map((ref) => (
              <li key={ref.id}>
                <span className="font-mono text-xs text-neon-cyan">
                  [{ref.kind}]
                </span>{" "}
                {ref.label}
                {ref.note ? ` — ${ref.note}` : null}
              </li>
            ))}
          </ul>
        </div>
      )}
      {sources.length > 0 && (
        <div>
          <h2 className="font-display text-xl text-white">Sources</h2>
          <ul className="mt-2 space-y-2 text-sm text-[oklch(var(--muted))]">
            {sources.map((source) => (
              <li key={source.id}>
                {source.url ? (
                  <a
                    href={source.url}
                    className={cn(
                      "focus-ring text-neon-cyan underline-offset-2 hover:underline",
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {source.label}
                  </a>
                ) : (
                  source.label
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </footer>
  );
}

/**
 * Sticky scrolly stage. StoryHero when meta.hero is set (reference stories).
 */
export function StoryLayout({ manifest }: Props) {
  const { meta, sections, a11y } = manifest;
  const heroDeck =
    "Rates lift payments. Payments eat buffers. Watch where that pressure concentrates.";

  return (
    <ScrollSceneProvider manifest={manifest} offset={0.4}>
      <AtmosphereProvider atmosphere={meta.atmosphere}>
      <article className="pb-24">
        {meta.hero ? (
          <>
            <StoryHero
              kicker={meta.hero.kicker}
              title={meta.hero.title}
              question={meta.hero.question}
              deck={heroDeck}
              motifId={
                meta.atmosphere?.roles.includes("intro")
                  ? meta.atmosphere.motifId
                  : undefined
              }
            />
            <p className="sr-only" id="a11y-note">
              {a11y.reducedMotionNote}
            </p>
          </>
        ) : (
          <header className="mx-auto mb-10 max-w-5xl px-4 pt-16 lg:mb-12">
            <p className="font-mono text-xs uppercase tracking-widest text-neon-cyan">
              Scrolling narrative · {meta.date}
            </p>
            <h1 className="mt-3 font-display text-display text-white">
              {meta.title}
            </h1>
            <p className="mt-4 text-lg text-[oklch(var(--muted))]">
              {meta.summary}
            </p>
            <p className="mt-3 text-sm text-[oklch(var(--muted))]" id="a11y-note">
              {a11y.reducedMotionNote}
            </p>
          </header>
        )}

        <div className="mx-auto flex max-w-5xl flex-col px-4 lg:flex-row-reverse lg:items-start lg:gap-14">
          <aside
            className={cn(
              "sticky top-16 z-10 w-full shrink-0 lg:top-20 lg:w-[min(100%,400px)]",
              "border-b border-white/5 bg-[oklch(0.10_0.02_264)]/90 pb-2 backdrop-blur-md",
              "lg:border-b-0 lg:bg-transparent lg:pb-0 lg:backdrop-blur-none",
              "max-h-[40vh] overflow-y-auto lg:max-h-none lg:overflow-visible",
            )}
          >
            <StickyVisual />
            <p className="sr-only">{a11y.alt}</p>
          </aside>

          <div className="min-w-0 flex-1">
            <StoryScrollama>
              {sections.map((section) => (
                <StoryStep data={section.id} key={section.id}>
                  <div>
                    <StorySection id={section.id} headline={section.headline}>
                      {renderBody(section.body)}
                    </StorySection>
                  </div>
                </StoryStep>
              ))}
            </StoryScrollama>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4">
          <StoryFooter manifest={manifest} />
        </div>
      </article>
      </AtmosphereProvider>
    </ScrollSceneProvider>
  );
}
