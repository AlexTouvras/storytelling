"use client";

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, type CSSProperties, type Ref } from "react";
import { Alignment, Fit, Layout, useRive, type Rive, type ViewModelInstance } from "@rive-app/react-canvas";
import { artboardToLocal, localToViewport, type Anchor, type LocalBox } from "@/lib/director/anchors";
import { configureRiveRuntime } from "@/components/director/rive-assets";

configureRiveRuntime();

/**
 * Everything goes through the file's view model (data binding). State-machine
 * inputs and state-change events are deprecated in the runtime, so neither is
 * used: a file reports its state by writing enums from state actions.
 */
export type RiveLayerHandle = {
  isReady(): boolean;
  /** Fires a trigger property. Returns false if the file is not loaded or has no such trigger. */
  fire(prop: string): boolean;
  setBool(prop: string, value: boolean): boolean;
  setNumber(prop: string, value: number): boolean;
  /** Sets an enum property by value name. */
  setEnum(prop: string, value: string): boolean;
  /** Sets a colour property, 0xAARRGGBB. */
  setColor(prop: string, argb: number): boolean;
  /** Reads a view-model value back: what a listener or a state action wrote. */
  read(prop: string): string | number | boolean | null;
  /** Back to the entry state with a fresh default view-model instance. */
  reset(): boolean;
  play(): void;
  pause(): void;
  /** A box in artboard units → viewport CSS pixels, through the camera. */
  getAnchor(box: LocalBox): Anchor | null;
  /** The current values of the `reports` enums, for tests and captions. */
  states(): string[];
};

type Props = {
  src: string;
  artboard: { name: string; width: number; height: number };
  stateMachine: string;
  /** Enum properties the machine writes as it changes state; read back by `states()`. */
  reports?: readonly string[];
  /** Backing-store pixel ratio. Raise it when a camera will scale the layer up. */
  pixelRatio?: number;
  className?: string;
  style?: CSSProperties;
  testId?: string;
  ref?: Ref<RiveLayerHandle>;
  onReady?: () => void;
  onStates?: (states: string[]) => void;
};

function sizeBackingStore(rive: Rive, canvas: HTMLCanvasElement, ratio: number) {
  const width = Math.round(canvas.offsetWidth * ratio);
  const height = Math.round(canvas.offsetHeight * ratio);
  if (width < 1 || height < 1 || (canvas.width === width && canvas.height === height)) return;
  canvas.width = width;
  canvas.height = height;
  rive.resizeToCanvas();
  rive.drawFrame();
}

function boundInstance(rive: Rive | null): ViewModelInstance | null {
  try {
    return rive?.viewModelInstance ?? null;
  } catch {
    return null;
  }
}

function readReports(vm: ViewModelInstance | null, reports: readonly string[]): string[] {
  if (!vm) return [];
  return reports.flatMap((name) => {
    const value = vm.enum(name)?.value;
    return value ? [value] : [];
  });
}

/**
 * A Rive illustration as a layer: the React runtime owns loading, drawing and
 * cleanup; this component only exposes the view model and an anchor lookup. No
 * adapter contract, no keep-alive — mounting is cheap and unmounting frees it.
 */
export function RiveLayer({
  src,
  artboard,
  stateMachine,
  reports = [],
  pixelRatio,
  className,
  style,
  testId,
  ref,
  onReady,
  onStates,
}: Props) {
  const onReadyRef = useRef(onReady);
  const onStatesRef = useRef(onStates);
  const reportsRef = useRef(reports);
  useEffect(() => {
    onReadyRef.current = onReady;
    onStatesRef.current = onStates;
    reportsRef.current = reports;
  }, [onReady, onStates, reports]);

  const layout = useMemo(() => new Layout({ fit: Fit.Contain, alignment: Alignment.Center }), []);
  const { rive, RiveComponent, canvas } = useRive(
    {
      src,
      artboard: artboard.name,
      stateMachine,
      autoplay: true,
      autoBind: true,
      layout,
      onLoad: () => onReadyRef.current?.(),
    },
    pixelRatio ? { customDevicePixelRatio: pixelRatio } : undefined,
  );

  // The canvas runtime sizes its backing store from getBoundingClientRect, which
  // includes the camera's scale and the layer's own open scale. Size it from the
  // untransformed layout box instead, or it keeps whatever scale it loaded at.
  const ratio = pixelRatio ?? 0;
  const fitBackingStore = useCallback(() => {
    if (rive && canvas) sizeBackingStore(rive, canvas, ratio || Math.min(window.devicePixelRatio || 1, 2));
  }, [rive, canvas, ratio]);

  useEffect(() => {
    fitBackingStore();
  }, [fitBackingStore]);

  // Observers belong to one view-model instance, and a reset binds a new one.
  const detachRef = useRef<() => void>(() => {});
  const observe = useCallback(() => {
    detachRef.current();
    const vm = boundInstance(rive);
    const emit = () => onStatesRef.current?.(readReports(boundInstance(rive), reportsRef.current));
    const watched = reportsRef.current.flatMap((name) => {
      const prop = vm?.enum(name);
      return prop ? [prop] : [];
    });
    for (const prop of watched) prop.on(emit);
    detachRef.current = () => {
      for (const prop of watched) prop.off(emit);
    };
    emit();
  }, [rive]);

  useEffect(() => {
    if (!rive) return;
    observe();
    return () => {
      detachRef.current();
      detachRef.current = () => {};
    };
  }, [rive, observe]);

  useImperativeHandle(
    ref,
    (): RiveLayerHandle => {
      const set = (apply: (vm: ViewModelInstance) => boolean) => {
        const vm = boundInstance(rive);
        if (!vm || !apply(vm)) return false;
        rive?.play();
        return true;
      };
      return {
        isReady: () => !!boundInstance(rive),
        fire: (name) =>
          set((vm) => {
            const p = vm.trigger(name);
            p?.trigger();
            return !!p;
          }),
        setBool: (name, value) =>
          set((vm) => {
            const p = vm.boolean(name);
            if (p) p.value = value;
            return !!p;
          }),
        setNumber: (name, value) =>
          set((vm) => {
            const p = vm.number(name);
            if (p) p.value = value;
            return !!p;
          }),
        setEnum: (name, value) =>
          set((vm) => {
            const p = vm.enum(name);
            if (!p || !p.values.includes(value)) return false;
            p.value = value;
            return true;
          }),
        setColor: (name, argb) =>
          set((vm) => {
            const p = vm.color(name);
            if (p) p.value = argb;
            return !!p;
          }),
        read(name) {
          const vm = boundInstance(rive);
          const type = vm?.properties.find((p) => p.name === name)?.type as string | undefined;
          if (!vm || !type) return null;
          if (type === "enumType") return vm.enum(name)?.value ?? null;
          if (type === "boolean") return vm.boolean(name)?.value ?? null;
          if (type === "number") return vm.number(name)?.value ?? null;
          if (type === "color") return vm.color(name)?.value ?? null;
          return null;
        },
        reset() {
          if (!rive) return false;
          detachRef.current();
          rive.reset({ artboard: artboard.name, stateMachine, autoplay: true, autoBind: true });
          observe();
          return true;
        },
        play() {
          fitBackingStore();
          rive?.play();
        },
        pause: () => rive?.pause(),
        getAnchor(box) {
          if (!canvas) return null;
          const layoutSize = { width: canvas.offsetWidth, height: canvas.offsetHeight };
          if (layoutSize.width < 1 || layoutSize.height < 1) return null;
          const local = artboardToLocal(box, artboard, layoutSize);
          return localToViewport(local, canvas.getBoundingClientRect(), layoutSize);
        },
        states: () => readReports(boundInstance(rive), reportsRef.current),
      };
    },
    [rive, canvas, stateMachine, artboard, fitBackingStore, observe],
  );

  return (
    <div className={className} style={style} data-testid={testId}>
      <RiveComponent aria-hidden style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
