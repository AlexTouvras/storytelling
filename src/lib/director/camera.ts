/**
 * One camera for every layer: a single CSS transform on the container that
 * holds the data canvas, the illustration and the annotations. Nothing below it
 * maps the camera per layer.
 *
 * The transform is `translate(x, y) scale(zoom)` with its origin at the
 * container's top-left, so a world point `w` lands on screen at
 * `stage + (x, y) + zoom · w`, where `stage` is the untransformed container's
 * position in the viewport.
 */

export type CameraState = {
  /** Pan offset, CSS pixels. */
  x: number;
  y: number;
  /** Scale factor, 1 = default. */
  zoom: number;
};

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

/**
 * What a shot is about: the world point held at the centre of the frame and
 * how close the camera is. Interpolating shots, not raw transforms, is what
 * keeps a subject centred while the camera pushes in on it.
 */
export type Shot = {
  focus: Point;
  zoom: number;
  /** Where on screen the focus is held; the frame centre unless a layout needs room. */
  screen: Point;
};

export const IDENTITY: CameraState = { x: 0, y: 0, zoom: 1 };

/** PULLBACK target: the whole stage, untransformed. */
export function wideShot(viewport: Size): Shot {
  const centre = { x: viewport.width / 2, y: viewport.height / 2 };
  return { focus: centre, zoom: 1, screen: centre };
}

/**
 * PULLBACK target held on a subject: the same untransformed stage as
 * `wideShot`, expressed around `subject`. Blending from a close shot on that
 * subject moves it on a straight line to its place in the wide frame. Blending
 * to the frame centre instead swings an off-centre subject past its place, and
 * off screen, while the zoom is still high.
 */
export function wideShotOn(subject: Point): Shot {
  return { focus: subject, zoom: 1, screen: subject };
}

/** FOCUS: the transform that holds `shot.focus` at `shot.screen`, `shot.zoom` close. */
export function cameraFor(shot: Shot): CameraState {
  return {
    x: shot.screen.x - shot.zoom * shot.focus.x,
    y: shot.screen.y - shot.zoom * shot.focus.y,
    zoom: shot.zoom,
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Blend two shots. Zoom moves geometrically, so a push from 1× to 3× spends as
 * long on each doubling and does not rush the close end.
 */
export function blendShots(a: Shot, b: Shot, t: number): Shot {
  const u = Math.min(1, Math.max(0, t));
  return {
    focus: { x: lerp(a.focus.x, b.focus.x, u), y: lerp(a.focus.y, b.focus.y, u) },
    zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), u)),
    screen: { x: lerp(a.screen.x, b.screen.x, u), y: lerp(a.screen.y, b.screen.y, u) },
  };
}

export function cameraTransform(camera: CameraState): string {
  return `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.zoom})`;
}

export function applyCamera(container: HTMLElement, camera: CameraState): void {
  container.style.transformOrigin = "0 0";
  container.style.transform = cameraTransform(camera);
}

/** World (container-local, untransformed) → viewport CSS pixels. */
export function worldToViewport(world: Point, camera: CameraState, stage: Point): Point {
  return {
    x: stage.x + camera.x + camera.zoom * world.x,
    y: stage.y + camera.y + camera.zoom * world.y,
  };
}

/** Viewport CSS pixels → world. Inverse of `worldToViewport`. */
export function viewportToWorld(point: Point, camera: CameraState, stage: Point): Point {
  return {
    x: (point.x - stage.x - camera.x) / camera.zoom,
    y: (point.y - stage.y - camera.y) / camera.zoom,
  };
}
