"use client";

import { memo, useEffect, useRef } from "react";
import type { AppFieldModel } from "@/lib/sim/app-field";
import type { CutoffFrame } from "@/components/film/cutoff-frame";
import { drawApps } from "@/components/film/draw-apps";

type Props = {
  model: AppFieldModel;
  progressRef?: React.RefObject<number>;
  reducedRef?: React.RefObject<boolean>;
  frame?: CutoffFrame;
  frameAtProgress?: (progress: number, reduced: boolean) => CutoffFrame;
  className?: string;
};

function fit(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { cssW: rect.width, cssH: rect.height, dpr };
}

export const AppField = memo(function AppField({
  model,
  progressRef,
  reducedRef,
  frame,
  frameAtProgress,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let alive = true;
    let visible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? true;
      },
      { threshold: 0 },
    );
    observer.observe(canvas);

    const paint = () => {
      if (!alive) return;
      const ctx = canvas.getContext("2d");
      if (!ctx || !visible) return;
      const { cssW, cssH, dpr } = fit(canvas);
      if (cssW < 2 || cssH < 2) return;
      const next =
        frame ??
        frameAtProgress?.(
          progressRef?.current ?? 0,
          reducedRef?.current ?? false,
        );
      if (!next) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawApps(ctx, cssW, cssH, model, next);
    };

    let raf = 0;
    const loop = () => {
      paint();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [model, progressRef, reducedRef, frame, frameAtProgress]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="app-field"
      className={className}
      aria-hidden
    />
  );
});
