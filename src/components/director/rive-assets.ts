import { RuntimeLoader } from "@rive-app/react-canvas";

/**
 * Asset URLs go through the bundler rather than `public/`: Orbit's sync copies
 * `src/**` and the package manifest, so anything the stories need at runtime
 * has to be reachable from source. The runtime would otherwise fetch its WASM
 * from unpkg on first use.
 */
export const RIVE_WASM_URL = new URL("@rive-app/canvas/rive.wasm", import.meta.url).href;

export const HOUSEHOLD_RIV_URL = new URL("../../illustrations/household.riv", import.meta.url).href;
export const GRID_RIV_URL = new URL("../../illustrations/grid.riv", import.meta.url).href;
export const CARS_RIV_URL = new URL("../../illustrations/cars.riv", import.meta.url).href;

let configured = false;

export function configureRiveRuntime(): void {
  if (configured) return;
  configured = true;
  RuntimeLoader.setWasmUrl(RIVE_WASM_URL);
}
