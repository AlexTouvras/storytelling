"use client";

import { useScrollScene } from "@/components/storytelling/ScrollScene";
import { SceneRenderer } from "@/components/storytelling/SceneRenderer";
import { cn } from "@/lib/cn";
import { useIsCompactViewport } from "@/lib/use-is-compact-viewport";

/**
 * Active-scene visual. Stickiness is CSS on the parent aside.
 * No scene-debug chrome — the diagram carries the state.
 */
export function StickyVisual({ className }: { className?: string }) {
  const { visualId, visualState, activeSectionId } = useScrollScene();
  const compact = useIsCompactViewport();

  return (
    <div
      className={cn(className)}
      data-testid="sticky-visual"
      data-active-section={activeSectionId}
      data-visual-id={visualId}
      data-visual-state={visualState}
    >
      <SceneRenderer
        visualId={visualId}
        visualState={visualState}
        density={compact ? "dock" : "full"}
      />
    </div>
  );
}
