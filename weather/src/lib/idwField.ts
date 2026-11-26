import type { GridCell } from "./types";
import {
  pointInCountry,
  type CountryGeometry,
} from "./countryPolygon";

export type MapLayer = "temp" | "precip" | "wind" | "pressure";

export function cellValue(cell: GridCell, layer: MapLayer): number {
  if (layer === "temp") return cell.temp;
  if (layer === "precip") return cell.precip;
  if (layer === "wind") return cell.windSpeed;
  return cell.pressure;
}

/** Inverse-distance-weighted sample at lon/lat. */
export function idwAt(
  lon: number,
  lat: number,
  cells: GridCell[],
  layer: MapLayer,
  power = 2,
): number {
  let num = 0;
  let den = 0;
  for (const c of cells) {
    const dx = c.longitude - lon;
    const dy = c.latitude - lat;
    const d2 = dx * dx + dy * dy;
    if (d2 < 1e-12) return cellValue(c, layer);
    const w = 1 / Math.pow(d2, power / 2);
    num += w * cellValue(c, layer);
    den += w;
  }
  return den > 0 ? num / den : 0;
}

export function layerDomain(
  cells: GridCell[],
  layer: MapLayer,
): { min: number; max: number } {
  if (!cells.length) return { min: 0, max: 1 };
  const vals = cells.map((c) => cellValue(c, layer));
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (layer === "precip" && max < 0.05) {
    max = 1;
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }
  return { min, max };
}

/** Smooth cool→warm (or layer-specific) colour. Returns [r,g,b,a 0–255]. */
export function fieldRgba(
  value: number,
  layer: MapLayer,
  min: number,
  max: number,
): [number, number, number, number] {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  if (layer === "precip") {
    // deep blue → cyan
    const r = Math.round(20 + t * 40);
    const g = Math.round(80 + t * 140);
    const b = Math.round(160 + t * 80);
    return [r, g, b, Math.round(40 + t * 180)];
  }
  if (layer === "wind") {
    const r = Math.round(40 + t * 120);
    const g = Math.round(200 - t * 40);
    const b = Math.round(180 - t * 100);
    return [r, g, b, Math.round(90 + t * 130)];
  }
  if (layer === "pressure") {
    const r = Math.round(80 + t * 100);
    const g = Math.round(90 + t * 40);
    const b = Math.round(200 - t * 80);
    return [r, g, b, Math.round(100 + t * 120)];
  }
  // temp: blue → cyan → green → yellow → orange
  const stops = [
    [40, 80, 200],
    [34, 211, 238],
    [52, 211, 153],
    [250, 204, 21],
    [249, 115, 22],
  ];
  const x = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
    Math.round(160 + t * 70),
  ];
}

export type ViewBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export function viewBoxFromGeometry(
  geometry: CountryGeometry,
  pad = 0.08,
): ViewBox {
  const [west, south, east, north] = geometry.bbox;
  const w = east - west;
  const h = north - south;
  return {
    west: west - w * pad,
    south: south - h * pad,
    east: east + w * pad,
    north: north + h * pad,
  };
}

export function project(
  lon: number,
  lat: number,
  view: ViewBox,
  width: number,
  height: number,
): { x: number; y: number } {
  const x = ((lon - view.west) / (view.east - view.west)) * width;
  const y = ((view.north - lat) / (view.north - view.south)) * height;
  return { x, y };
}

export function unproject(
  x: number,
  y: number,
  view: ViewBox,
  width: number,
  height: number,
): { lon: number; lat: number } {
  const lon = view.west + (x / width) * (view.east - view.west);
  const lat = view.north - (y / height) * (view.north - view.south);
  return { lon, lat };
}

/**
 * Paint a continuous IDW field into ImageData, clipped to the country polygon.
 * Uses a lower internal resolution then the caller can drawImage-scale for smoothness.
 */
export function rasterizeField(
  image: ImageData,
  cells: GridCell[],
  layer: MapLayer,
  geometry: CountryGeometry | null,
  view: ViewBox,
): { min: number; max: number } {
  const { width, height, data } = image;
  const { min, max } = layerDomain(cells, layer);
  const inside = geometry
    ? (lon: number, lat: number) => pointInCountry(lon, lat, geometry)
    : () => true;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const { lon, lat } = unproject(px + 0.5, py + 0.5, view, width, height);
      const i = (py * width + px) * 4;
      if (!inside(lon, lat)) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0;
        continue;
      }
      const v = idwAt(lon, lat, cells, layer);
      const [r, g, b, a] = fieldRgba(v, layer, min, max);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return { min, max };
}
