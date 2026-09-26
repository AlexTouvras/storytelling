"use client";

import { memo, useEffect, useRef } from "react";
import type { DelayFieldModel } from "@/lib/sim/delay-field";
import type { RecoveryFrame } from "@/components/film/recovery-frame";
import { drawDelays, type DelayDrawContext } from "@/components/film/draw-delays";

type Props = {
  model: DelayFieldModel;
  contextRef: React.RefObject<DelayDrawContext>;
  progressRef: React.RefObject<number>;
  reducedRef: React.RefObject<boolean>;
  /** Top of the narration in stage pixels, so the stage can stop above it. */
  copyTopRef: React.RefObject<number>;
  frameAtProgress: (progress: number, reduced: boolean) => RecoveryFrame;
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

export const DelayField = memo(function DelayField({
  model,
  contextRef,
  progressRef,
  reducedRef,
  copyTopRef,
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

    const started = performance.now();

    const paint = (now: number) => {
      if (!alive) return;
      const ctx = canvas.getContext("2d");
      if (!ctx || !visible) return;
      const { cssW, cssH, dpr } = fit(canvas);
      if (cssW < 2 || cssH < 2) return;
      const reduced = reducedRef.current ?? false;
      const context = contextRef.current;
      if (!context) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawDelays(
        ctx,
        cssW,
        cssH,
        model,
        frameAtProgress(progressRef.current ?? 0, reduced),
        context,
        { time: (now - started) / 1000, life: reduced ? 0 : 1 },
        copyTopRef.current ?? Number.POSITIVE_INFINITY,
      );
    };

    let raf = 0;
    const loop = (now: number) => {
      paint(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [model, contextRef, progressRef, reducedRef, copyTopRef, frameAtProgress]);

  return <canvas ref={canvasRef} data-testid="delay-field" className={className} aria-hidden />;
});
