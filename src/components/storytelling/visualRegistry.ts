import type { ComponentType } from "react";
import type { VisualId } from "@/stories/schemas/manifest";
import { RateRiskPanel } from "@/components/storytelling/visuals/RateRiskPanel";
import { CashflowPressurePanel } from "@/components/storytelling/visuals/CashflowPressurePanel";

export type VisualComponentProps = {
  visualState: string;
  className?: string;
  density?: "full" | "dock";
};

/**
 * Explicit allow-list: visualId → registered React component.
 * Manifests may only reference keys present here. Never eval component names.
 */
export const VISUAL_REGISTRY = {
  "rate-risk-mechanism": RateRiskPanel,
  "cashflow-pressure": CashflowPressurePanel,
} as const satisfies Record<VisualId, ComponentType<VisualComponentProps>>;

export type RegisteredVisualId = keyof typeof VISUAL_REGISTRY;

export function resolveVisual(
  visualId: string,
): ComponentType<VisualComponentProps> | null {
  if (visualId in VISUAL_REGISTRY) {
    return VISUAL_REGISTRY[visualId as RegisteredVisualId];
  }
  return null;
}

export function isRegisteredVisualId(id: string): id is RegisteredVisualId {
  return id in VISUAL_REGISTRY;
}
