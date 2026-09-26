"use client";

import { memo, useEffect, useRef } from "react";
import { drawStack } from "@/components/lecture/draw-stack";
import type { LectureFrame } from "@/components/lecture/lecture-frame";

type Props = {
  /** Read every frame, so the canvas is smooth whatever drives progress. */
  progressRef: React.RefObject<number>;
  reducedRef: React.RefObject<boolean>;
  frameAtProgress: (progress: number, reduced: boolean) => LectureFrame;
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

/**
 * Canvas host for a lecture board. Same contract as `AppField`: the host owns
 * the clock and the device ratio, the draw function stays pure, and `life` is 0
 * under reduced motion so the craft layer collapses to a still picture.
 */
export const LectureField = memo(function LectureField({
  progressRef,
  reducedRef,
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
      const frame = frameAtProgress(progressRef.current ?? 0, reduced);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawStack(ctx, cssW, cssH, frame, {
        time: (now - started) / 1000,
        life: reduced ? 0 : 1,
      });
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
  }, [progressRef, reducedRef, frameAtProgress]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="lecture-board"
      className={className}
      aria-hidden
    />
  );
});
