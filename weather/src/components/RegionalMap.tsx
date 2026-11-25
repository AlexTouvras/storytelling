import { useEffect, useMemo, useRef, useState } from "react";
import type { BBox, GridCell, Place } from "../lib/types";

type Layer = "temp" | "precip" | "wind" | "pressure";

type Props = {
  place: Place;
  cells?: GridCell[];
  bbox?: BBox;
  countryLabel?: string;
  /** When false, hide layer toolbar (stage controls it). */
  showToolbar?: boolean;
  layer?: Layer;
  onLayerChange?: (layer: Layer) => void;
  compact?: boolean;
};

const LAYER_LABEL: Record<Layer, string> = {
  temp: "Temperature",
  precip: "Precipitation",
  wind: "Wind",
  pressure: "Pressure",
};

function valueOf(cell: GridCell, layer: Layer): number {
  if (layer === "temp") return cell.temp;
  if (layer === "precip") return cell.precip;
  if (layer === "wind") return cell.windSpeed;
  return cell.pressure;
}

function colorFor(value: number, layer: Layer, min: number, max: number): string {
  const t = max === min ? 0.5 : (value - min) / (max - min);
  if (layer === "precip") {
    if (max <= 0.05) return "rgba(47, 111, 142, 0.12)";
    return `rgba(47, 111, 142, ${(0.18 + t * 0.72).toFixed(2)})`;
  }
  if (layer === "wind") {
    return `rgba(180, 120, 40, ${(0.2 + t * 0.65).toFixed(2)})`;
  }
  if (layer === "pressure") {
    const r = Math.round(80 + t * 100);
    const b = Math.round(160 - t * 80);
    return `rgba(${r}, 120, ${b}, 0.55)`;
  }
  const r = Math.round(60 + t * 180);
  const g = Math.round(120 + t * 40);
  const b = Math.round(180 - t * 140);
  return `rgba(${r}, ${g}, ${b}, 0.62)`;
}

function gridStep(cells: GridCell[]): { halfLat: number; halfLon: number } {
  const lats = [...new Set(cells.map((c) => +c.latitude.toFixed(3)))].sort(
    (a, b) => a - b,
  );
  const lons = [...new Set(cells.map((c) => +c.longitude.toFixed(3)))].sort(
    (a, b) => a - b,
  );
  const gaps = (xs: number[]) =>
    xs.slice(1).map((v, i) => v - xs[i]).filter((g) => g > 0.02);
  const median = (xs: number[], fallback: number) => {
    if (!xs.length) return fallback;
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  return {
    halfLat: median(gaps(lats), 0.5) / 2,
    halfLon: median(gaps(lons), 0.5) / 2,
  };
}

export function RegionalMap({
  place,
  cells,
  bbox,
  countryLabel,
  showToolbar = true,
  layer: controlledLayer,
  onLayerChange,
  compact = false,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<{
    map: import("leaflet").Map;
    layerGroup: import("leaflet").LayerGroup;
  } | null>(null);
  const [internalLayer, setInternalLayer] = useState<Layer>("temp");
  const layer = controlledLayer ?? internalLayer;
  const setLayer = (next: Layer) => {
    onLayerChange?.(next);
    if (controlledLayer === undefined) setInternalLayer(next);
  };
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localCells = cells ?? [];
  const stats = useMemo(() => {
    if (!localCells.length) return null;
    const vals = localCells.map((c) => valueOf(c, layer));
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [localCells, layer]);

  const placeKey = `${place.latitude.toFixed(4)},${place.longitude.toFixed(4)}`;
  const bboxKey = bbox?.join(",") ?? "";

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);

    async function boot() {
      if (!mapRef.current) return;
      try {
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");
        if (cancelled || !mapRef.current) return;

        if (leafletRef.current) {
          leafletRef.current.map.remove();
          leafletRef.current = null;
        }

        const map = L.map(mapRef.current, {
          zoomControl: true,
          attributionControl: true,
          scrollWheelZoom: false,
          center: [place.latitude, place.longitude],
          zoom: 6,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 18,
        }).addTo(map);

        leafletRef.current = { map, layerGroup: L.layerGroup().addTo(map) };

        requestAnimationFrame(() => {
          if (cancelled || !leafletRef.current) return;
          const { map: m } = leafletRef.current;
          m.invalidateSize();
          if (bbox) {
            m.fitBounds(
              [
                [bbox[1], bbox[0]],
                [bbox[3], bbox[2]],
              ],
              { animate: false, padding: [12, 12] },
            );
          } else {
            m.setView([place.latitude, place.longitude], 6, { animate: false });
          }
          setReady(true);
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Map could not load.");
      }
    }

    void boot();
    return () => {
      cancelled = true;
      if (leafletRef.current) {
        leafletRef.current.map.remove();
        leafletRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeKey, bboxKey]);

  useEffect(() => {
    const handle = leafletRef.current;
    if (!handle || !ready) return;
    let cancelled = false;

    void import("leaflet").then((L) => {
      if (cancelled || !leafletRef.current) return;
      const { map, layerGroup } = leafletRef.current;
      layerGroup.clearLayers();

      L.circleMarker([place.latitude, place.longitude], {
        radius: 6,
        color: "#14202e",
        weight: 2,
        fillColor: "#f2c14e",
        fillOpacity: 1,
      })
        .bindTooltip(place.name, { direction: "top" })
        .addTo(layerGroup);

      map.invalidateSize();

      if (bbox) {
        map.fitBounds(
          [
            [bbox[1], bbox[0]],
            [bbox[3], bbox[2]],
          ],
          { animate: false, padding: [12, 12], maxZoom: 8 },
        );
      }

      if (!localCells.length || !stats) return;

      const { halfLat, halfLon } = gridStep(localCells);
      for (const cell of localCells) {
        const v = valueOf(cell, layer);
        const sw: [number, number] = [
          cell.latitude - halfLat,
          cell.longitude - halfLon,
        ];
        const ne: [number, number] = [
          cell.latitude + halfLat,
          cell.longitude + halfLon,
        ];
        L.rectangle([sw, ne], {
          stroke: true,
          color: "rgba(20,32,46,0.1)",
          weight: 1,
          fillColor: colorFor(v, layer, stats.min, stats.max),
          fillOpacity: 1,
        })
          .bindTooltip(
            `${LAYER_LABEL[layer]}: ${
              layer === "pressure"
                ? `${Math.round(v)} hPa`
                : layer === "precip"
                  ? `${v.toFixed(1)} mm`
                  : layer === "wind"
                    ? `${Math.round(v)} km/h`
                    : `${v.toFixed(1)}°`
            }`,
          )
          .addTo(layerGroup);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [place, localCells, layer, stats, ready, bbox]);

  const label = countryLabel || place.country || place.name;
  const flatPrecip =
    layer === "precip" && stats && stats.max - stats.min < 0.05;

  return (
    <div className={compact ? "map-panel map-panel--compact" : "map-panel"}>
      {showToolbar && (
        <div className="map-panel__toolbar" role="tablist" aria-label="Map layer">
          {(Object.keys(LAYER_LABEL) as Layer[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={layer === key}
              className={layer === key ? "map-tab map-tab--active" : "map-tab"}
              onClick={() => setLayer(key)}
            >
              {LAYER_LABEL[key]}
            </button>
          ))}
        </div>
      )}
      <div className="map-panel__frame">
        <div ref={mapRef} className="map-panel__canvas" />
        {error && <p className="map-panel__fallback">{error}</p>}
        {!localCells.length && !error && (
          <p className="map-panel__fallback">
            National field unavailable — map shows {label}.
          </p>
        )}
      </div>
      {stats && (
        <p className="chart__note">
          {LAYER_LABEL[layer]} across {label}. Range{" "}
          {layer === "pressure"
            ? `${Math.round(stats.min)}–${Math.round(stats.max)} hPa`
            : layer === "precip"
              ? `${stats.min.toFixed(1)}–${stats.max.toFixed(1)} mm`
              : layer === "wind"
                ? `${Math.round(stats.min)}–${Math.round(stats.max)} km/h`
                : `${stats.min.toFixed(1)}–${stats.max.toFixed(1)}°`}
          .
          {flatPrecip
            ? " Little or no precip on the grid right now."
            : null}{" "}
          Basemap © OpenStreetMap.
        </p>
      )}
    </div>
  );
}

export type { Layer as MapLayer };
