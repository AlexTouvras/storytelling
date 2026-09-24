declare module "react-scrollama" {
  import type { ComponentType, ReactNode } from "react";

  export type ScrollamaOffset = number | string;

  export type StepEnterCallback = (response: {
    data: unknown;
    direction?: "up" | "down";
    element?: HTMLElement;
  }) => void;

  export type ScrollamaProps = {
    offset?: ScrollamaOffset;
    onStepEnter?: StepEnterCallback;
    onStepExit?: StepEnterCallback;
    onStepProgress?: (response: {
      data: unknown;
      progress: number;
      direction?: "up" | "down";
    }) => void;
    debug?: boolean;
    threshold?: number;
    children?: ReactNode;
  };

  export type StepProps = {
    data?: unknown;
    children?: ReactNode;
  };

  export const Scrollama: ComponentType<ScrollamaProps>;
  export const Step: ComponentType<StepProps>;
}
