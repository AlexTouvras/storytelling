"use client";

import { memo, useEffect, useRef } from "react";
import type { FieldModel } from "@/lib/sim/book-field";
import type { FilmFrame } from "@/components/film/frame";
import { drawField } from "@/components/film/draw-field";

type Props = {
  model: FieldModel;
  /** Scroll film reads this ref. Omit when `frame` is set. */
  progressRef?: React.RefObject<number>;
  reducedRef?: React.RefObject<boolean>;
  frame?: FilmFrame;
  frameAtProgress?: (
    progress: number,
    featured: FieldModel["featured"],
    reduced: boolean,
  ) => FilmFrame;
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

export const LoanField = memo(function LoanField({
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

    const started = performance.now();

    const paint = (now = performance.now()) => {
      if (!alive) return;
      const ctx = canvas.getContext("2d");
      if (!ctx || !visible) return;
      const { cssW, cssH, dpr } = fit(canvas);
      if (cssW < 2 || cssH < 2) return;
      const reduced = reducedRef?.current ?? false;
      const next =
        frame ??
        frameAtProgress?.(progressRef?.current ?? 0, model.featured, reduced);
      if (!next) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawField(ctx, cssW, cssH, model, next, {
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
    const onResize = () => paint();
    window.addEventListener("resize", onResize);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [model, progressRef, reducedRef, frame, frameAtProgress]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      data-testid="loan-field"
      aria-hidden
    />
  );
});
