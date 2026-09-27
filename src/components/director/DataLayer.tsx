"use client";

import { useImperativeHandle, useMemo, useRef, type Ref } from "react";
import type { FieldModel } from "@/lib/sim/book-field";
import type { FilmFrame } from "@/components/film/frame";
import { drawField, type FieldProbe } from "@/components/film/draw-field";
import { localToViewport, type Anchor, type AnchorSource } from "@/lib/director/anchors";

/**
 * Above this many backing pixels the layer stops raising its resolution for
 * the camera and accepts some softness at full zoom instead.
 */
const MAX_BACKING_PIXELS = 12_000_000;

export type LocalMark = { x: number; y: number; r: number; ring: number };

export type DataLayerHandle = AnchorSource & {
  /**
   * Draw one frame. `resolution` is backing pixels per CSS pixel: device pixel
   * ratio times however far the camera is about to scale this layer up.
   */
  paint(frame: FilmFrame, options: { time: number; life: number; resolution: number; labelScale?: number }): void;
  /** Where an entity was last drawn, in this layer's own CSS pixels. */
  local(entityId: string): LocalMark | null;
};

type Props = {
  model: FieldModel;
  /** Entity id → loan id, for the loans other layers may ask about. */
  entities: Readonly<Record<string, number>>;
  className?: string;
  ref?: Ref<DataLayerHandle>;
};

/**
 * The book of loans as a canvas layer, drawn by the film's own `drawField`.
 * The layer does not know about the camera; it only exposes where it drew the
 * loans it was asked to track.
 */
export function DataLayer({ model, entities, className, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const probe = useMemo<FieldProbe>(
    () => ({
      track: new Set(Object.values(entities)),
      anchors: new Map(),
      highlightFeatured: true,
    }),
    [entities],
  );

  useImperativeHandle(
    ref,
    (): DataLayerHandle => {
      const local = (entityId: string): LocalMark | null => {
        const loan = entities[entityId];
        if (loan === undefined) return null;
        return probe.anchors.get(loan) ?? null;
      };
      return {
        paint(frame, { time, life, resolution, labelScale }) {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const cssW = canvas.offsetWidth;
          const cssH = canvas.offsetHeight;
          if (cssW < 2 || cssH < 2) return;
          const cap = Math.sqrt(MAX_BACKING_PIXELS / (cssW * cssH));
          const scale = Math.max(1, Math.min(resolution, cap));
          const w = Math.round(cssW * scale);
          const h = Math.round(cssH * scale);
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.setTransform(w / cssW, 0, 0, h / cssH, 0, 0);
          probe.labelScale = labelScale;
          drawField(ctx, cssW, cssH, model, frame, { time, life }, probe);
        },
        local,
        getAnchor(entityId): Anchor | null {
          const canvas = canvasRef.current;
          const mark = local(entityId);
          if (!canvas || !mark) return null;
          return localToViewport(
            { x: mark.x, y: mark.y, width: mark.ring * 2, height: mark.ring * 2 },
            canvas.getBoundingClientRect(),
            { width: canvas.offsetWidth, height: canvas.offsetHeight },
          );
        },
      };
    },
    [entities, model, probe],
  );

  return <canvas ref={canvasRef} className={className} data-testid="data-layer" aria-hidden />;
}
