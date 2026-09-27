/**
 * Anchors: where a renderer drew an entity, in viewport CSS pixels.
 *
 * Every layer answers the same question the same way — "where is `id` on the
 * reader's screen right now?" — so a transition can hand an entity from one
 * representation to another without knowing how either one draws. A layer
 * records positions in its own drawing space and converts through the element's
 * `getBoundingClientRect()`, which already includes the camera transform.
 */

export type Anchor = {
  /** Centre, viewport CSS pixels from the left. */
  x: number;
  /** Centre, viewport CSS pixels from the top. */
  y: number;
  width: number;
  height: number;
};

export type AnchorSource = {
  getAnchor(entityId: string): Anchor | null;
};

export type LocalBox = { x: number; y: number; width: number; height: number };

type Rect = Pick<DOMRect, "left" | "top" | "width" | "height">;

/**
 * Local box (centre + size, in an element's own untransformed CSS pixels) →
 * viewport anchor. `layout` is the element's untransformed size; the ratio to
 * the measured rect is whatever scale the camera applied.
 */
export function localToViewport(box: LocalBox, rect: Rect, layout: { width: number; height: number }): Anchor {
  const sx = layout.width > 0 ? rect.width / layout.width : 1;
  const sy = layout.height > 0 ? rect.height / layout.height : 1;
  return {
    x: rect.left + box.x * sx,
    y: rect.top + box.y * sy,
    width: box.width * sx,
    height: box.height * sy,
  };
}

/** Rive `Fit.Contain` + centred alignment: artboard units → element pixels. */
export function containFit(
  artboard: { width: number; height: number },
  element: { width: number; height: number },
) {
  const scale = Math.min(element.width / artboard.width, element.height / artboard.height);
  return {
    scale,
    offsetX: (element.width - artboard.width * scale) / 2,
    offsetY: (element.height - artboard.height * scale) / 2,
  };
}

export function artboardToLocal(
  box: LocalBox,
  artboard: { width: number; height: number },
  element: { width: number; height: number },
): LocalBox {
  const fit = containFit(artboard, element);
  return {
    x: fit.offsetX + box.x * fit.scale,
    y: fit.offsetY + box.y * fit.scale,
    width: box.width * fit.scale,
    height: box.height * fit.scale,
  };
}
