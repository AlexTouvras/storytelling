"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Scrollama, Step } from "react-scrollama";
import type {
  StoryManifest,
  VisualId,
  VisualState,
} from "@/stories/schemas/manifest";
import { resolveScene } from "@/lib/resolveScene";

type ScrollSceneContextValue = {
  activeSectionId: string;
  visualState: VisualState;
  visualId: VisualId;
};

const ScrollSceneContext = createContext<ScrollSceneContextValue | null>(null);

type EnterHandler = (args: {
  data: unknown;
  direction?: string;
}) => void;

type ScrollamaContextValue = {
  onStepEnter: EnterHandler;
  offset: number | string;
};

const ScrollamaApiContext = createContext<ScrollamaContextValue | null>(null);

export { resolveScene };

type ProviderProps = {
  manifest: StoryManifest;
  /**
   * Scrollama trigger. Prefer a fraction (0–1). Pixel strings are supported but
   * only applied after mount when `innerHeight` is known (react-scrollama divides
   * px by height on first paint — 0 height → broken observer).
   */
  offset?: number | string;
  children: ReactNode;
};

function useSafeScrollamaOffset(preferred: number | string): number | string {
  const [safe, setSafe] = useState<number | string>(() =>
    typeof preferred === "number" ? preferred : 0.35,
  );

  useEffect(() => {
    if (typeof preferred === "number") {
      setSafe(preferred);
      return;
    }
    if (typeof preferred === "string" && preferred.endsWith("px")) {
      const px = Number.parseFloat(preferred);
      const apply = () => {
        const h = window.innerHeight;
        if (h > 0 && Number.isFinite(px)) {
          setSafe(Math.min(0.55, Math.max(0.15, px / h)));
        }
      };
      apply();
      window.addEventListener("resize", apply);
      return () => window.removeEventListener("resize", apply);
    }
    setSafe(preferred);
  }, [preferred]);

  return safe;
}

/**
 * Provides active section → visual state. Pair with <StoryScrollama> whose
 * direct children are <Step> elements from react-scrollama.
 */
export function ScrollSceneProvider({
  manifest,
  offset = "280px",
  children,
}: ProviderProps) {
  const [activeSectionId, setActiveSectionId] = useState(
    manifest.sections[0].id,
  );
  const safeOffset = useSafeScrollamaOffset(offset);

  const onStepEnter = useCallback<EnterHandler>(({ data }) => {
    if (typeof data === "string" && data) {
      setActiveSectionId(data);
    }
  }, []);

  const scene = resolveScene(manifest, activeSectionId);

  const value = useMemo<ScrollSceneContextValue>(
    () => ({
      activeSectionId,
      visualState: scene.visualState,
      visualId: scene.visualId,
    }),
    [activeSectionId, scene.visualState, scene.visualId],
  );

  const api = useMemo(
    () => ({ onStepEnter, offset: safeOffset }),
    [onStepEnter, safeOffset],
  );

  return (
    <ScrollSceneContext.Provider value={value}>
      <ScrollamaApiContext.Provider value={api}>
        {children}
      </ScrollamaApiContext.Provider>
    </ScrollSceneContext.Provider>
  );
}

/** Scrollama wrapper — children must be <Step> nodes (or fragments of them). */
export function StoryScrollama({ children }: { children: ReactNode }) {
  const api = useContext(ScrollamaApiContext);
  if (!api) {
    throw new Error("StoryScrollama must be used within ScrollSceneProvider");
  }
  return (
    <Scrollama offset={api.offset} onStepEnter={api.onStepEnter}>
      {children}
    </Scrollama>
  );
}

export { Step as StoryStep };

export function useScrollScene() {
  const ctx = useContext(ScrollSceneContext);
  if (!ctx) {
    throw new Error("useScrollScene must be used within ScrollSceneProvider");
  }
  return ctx;
}
