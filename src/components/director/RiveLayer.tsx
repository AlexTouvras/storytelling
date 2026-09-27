"use client";

import { useEffect, useImperativeHandle, useMemo, useRef, type CSSProperties, type Ref } from "react";
import {
  Alignment,
  EventType,
  Fit,
  Layout,
  StateMachineInputType,
  useRive,
  type Event as RiveEvent,
} from "@rive-app/react-canvas";
import { artboardToLocal, localToViewport, type Anchor, type LocalBox } from "@/lib/director/anchors";
import { configureRiveRuntime } from "@/components/director/rive-assets";

configureRiveRuntime();

export type RiveLayerHandle = {
  isReady(): boolean;
  /** Fires a trigger input. Returns false if the file is not loaded yet. */
  fire(input: string): boolean;
  setBool(input: string, value: boolean): boolean;
  /** Back to the entry state with every input at its default. */
  reset(): boolean;
  play(): void;
  pause(): void;
  /** A box in artboard units → viewport CSS pixels, through the camera. */
  getAnchor(box: LocalBox): Anchor | null;
  /** State names the machine last reported, for tests and captions. */
  states(): string[];
};

type Props = {
  src: string;
  artboard: { name: string; width: number; height: number };
  stateMachine: string;
  /** Backing-store pixel ratio. Raise it when a camera will scale the layer up. */
  pixelRatio?: number;
  className?: string;
  style?: CSSProperties;
  testId?: string;
  ref?: Ref<RiveLayerHandle>;
  onReady?: () => void;
  onStates?: (states: string[]) => void;
};

/**
 * A Rive illustration as a layer: the React runtime owns loading, drawing and
 * cleanup; this component only exposes inputs and an anchor lookup. No adapter
 * contract, no keep-alive — mounting is cheap and unmounting frees it.
 */
export function RiveLayer({
  src,
  artboard,
  stateMachine,
  pixelRatio,
  className,
  style,
  testId,
  ref,
  onReady,
  onStates,
}: Props) {
  const statesRef = useRef<string[]>([]);
  const onReadyRef = useRef(onReady);
  const onStatesRef = useRef(onStates);
  useEffect(() => {
    onReadyRef.current = onReady;
    onStatesRef.current = onStates;
  }, [onReady, onStates]);

  const layout = useMemo(() => new Layout({ fit: Fit.Contain, alignment: Alignment.Center }), []);
  const { rive, RiveComponent, canvas } = useRive(
    {
      src,
      artboard: artboard.name,
      stateMachine,
      autoplay: true,
      layout,
      onLoad: () => onReadyRef.current?.(),
      onStateChange: (event: RiveEvent) => {
        const data = event.data;
        const names = Array.isArray(data) ? data.map(String) : [];
        statesRef.current = names;
        onStatesRef.current?.(names);
      },
    },
    pixelRatio ? { customDevicePixelRatio: pixelRatio } : undefined,
  );

  useEffect(() => {
    if (!rive) return;
    const onStop = () => {
      statesRef.current = [];
    };
    rive.on(EventType.Stop, onStop);
    return () => rive.off(EventType.Stop, onStop);
  }, [rive]);

  useImperativeHandle(
    ref,
    (): RiveLayerHandle => {
      const input = (name: string) =>
        rive?.stateMachineInputs(stateMachine)?.find((i) => i.name === name) ?? null;
      return {
        isReady: () => !!rive && !!rive.stateMachineInputs(stateMachine),
        fire(name) {
          const i = input(name);
          if (!i || i.type !== StateMachineInputType.Trigger) return false;
          i.fire();
          rive?.play();
          return true;
        },
        setBool(name, value) {
          const i = input(name);
          if (!i || i.type !== StateMachineInputType.Boolean) return false;
          i.value = value;
          rive?.play();
          return true;
        },
        reset() {
          if (!rive) return false;
          rive.reset({ artboard: artboard.name, stateMachine, autoplay: true });
          statesRef.current = [];
          return true;
        },
        play: () => rive?.play(),
        pause: () => rive?.pause(),
        getAnchor(box) {
          if (!canvas) return null;
          const layoutSize = { width: canvas.offsetWidth, height: canvas.offsetHeight };
          if (layoutSize.width < 1 || layoutSize.height < 1) return null;
          const local = artboardToLocal(box, artboard, layoutSize);
          return localToViewport(local, canvas.getBoundingClientRect(), layoutSize);
        },
        states: () => statesRef.current,
      };
    },
    [rive, canvas, stateMachine, artboard],
  );

  return (
    <div className={className} style={style} data-testid={testId}>
      <RiveComponent aria-hidden style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
