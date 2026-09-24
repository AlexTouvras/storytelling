"use client";

import { createElement } from "react";
import type { VisualId } from "@/stories/schemas/manifest";
import { isAllowlistedVisualState } from "@/stories/schemas/visualAllowlist";
import {
  VISUAL_REGISTRY,
  isRegisteredVisualId,
} from "@/components/storytelling/visualRegistry";

type Props = {
  visualId: VisualId | string;
  visualState: string;
  className?: string;
  density?: "full" | "dock";
};

/**
 * Looks up visualId in VISUAL_REGISTRY and renders that component with visualState.
 * Registry is the single allow-list — never eval free-form component names.
 */
export function SceneRenderer({
  visualId,
  visualState,
  className,
  density = "full",
}: Props) {
  if (!isRegisteredVisualId(visualId)) {
    return (
      <div
        className="glass rounded-2xl p-4 text-sm text-[oklch(var(--muted))]"
        role="alert"
        data-testid="visual-error"
        data-visual-id={visualId}
      >
        Unsupported visual configuration: {visualId}. Registered:{" "}
        {Object.keys(VISUAL_REGISTRY).join(", ")}.
      </div>
    );
  }

  if (!isAllowlistedVisualState(visualId, visualState)) {
    return (
      <div
        className="glass rounded-2xl p-4 text-sm text-[oklch(var(--muted))]"
        role="alert"
        data-testid="visual-error"
        data-visual-id={visualId}
        data-visual-state={visualState}
      >
        Unsupported visual state &quot;{visualState}&quot; for {visualId}.
      </div>
    );
  }

  return createElement(VISUAL_REGISTRY[visualId], {
    visualState,
    className,
    density,
  });
}
