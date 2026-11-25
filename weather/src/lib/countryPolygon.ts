import type { BBox } from "./types";

export type Ring = number[][]; // [lon, lat][]
export type CountryGeometry = {
  type: "Polygon" | "MultiPolygon";
  /** Rings as [lon, lat][] — outer rings only for PIP (holes ignored for heat). */
  polygons: Ring[][];
  bbox: BBox;
};

type Feature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};

let cache: Feature[] | null = null;
const featureCache = new Map<string, CountryGeometry | null>();

async function loadFeatures(): Promise<Feature[]> {
  if (cache) return cache;
  const res = await fetch("/data/countries-110m.geojson");
  if (!res.ok) throw new Error("Could not load country boundaries");
  const data = (await res.json()) as { features: Feature[] };
  cache = data.features;
  return cache;
}

function isoOf(props: Record<string, unknown>): string {
  const a2 = String(props.ISO_A2_EH || props.ISO_A2 || "").toUpperCase();
  if (a2 && a2 !== "-99") return a2;
  const a3 = String(props.ADM0_A3 || props.ISO_A3 || "").toUpperCase();
  // Common NE quirks
  if (a3 === "NOR") return "NO";
  if (a3 === "FRA") return "FR";
  return a2;
}

function ringsFromGeometry(geometry: Feature["geometry"]): Ring[][] {
  if (geometry.type === "Polygon") {
    return [geometry.coordinates as number[][][]];
  }
  return geometry.coordinates as number[][][][];
}

function bboxOfPolygons(polygons: Ring[][]): BBox {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const poly of polygons) {
    for (const ring of poly) {
      for (const [lon, lat] of ring) {
        west = Math.min(west, lon);
        east = Math.max(east, lon);
        south = Math.min(south, lat);
        north = Math.max(north, lat);
      }
    }
  }
  return [west, south, east, north];
}

/** Ray-cast point-in-polygon for a single ring ([lon,lat]). */
function pointInRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointInCountry(
  lon: number,
  lat: number,
  geometry: CountryGeometry,
): boolean {
  for (const poly of geometry.polygons) {
    const outer = poly[0];
    if (!outer || !pointInRing(lon, lat, outer)) continue;
    let inHole = false;
    for (let h = 1; h < poly.length; h++) {
      if (pointInRing(lon, lat, poly[h])) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

export async function getCountryGeometry(
  countryCode?: string | null,
): Promise<CountryGeometry | null> {
  if (!countryCode) return null;
  const code = countryCode.toUpperCase();
  if (featureCache.has(code)) return featureCache.get(code) ?? null;

  const features = await loadFeatures();
  const feature = features.find((f) => isoOf(f.properties) === code) ?? null;
  if (!feature) {
    featureCache.set(code, null);
    return null;
  }
  const polygons = ringsFromGeometry(feature.geometry);
  const geom: CountryGeometry = {
    type: feature.geometry.type,
    polygons,
    bbox: bboxOfPolygons(polygons),
  };
  featureCache.set(code, geom);
  return geom;
}

/** Leaflet-friendly GeoJSON Feature for borders. */
export function toGeoJsonFeature(
  code: string,
  geometry: CountryGeometry,
): {
  type: "Feature";
  properties: { ISO_A2: string };
  geometry:
    | { type: "Polygon"; coordinates: Ring[] }
    | { type: "MultiPolygon"; coordinates: Ring[][] };
} {
  return {
    type: "Feature",
    properties: { ISO_A2: code },
    geometry:
      geometry.polygons.length === 1
        ? { type: "Polygon", coordinates: geometry.polygons[0] }
        : { type: "MultiPolygon", coordinates: geometry.polygons },
  };
}
