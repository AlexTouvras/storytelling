import { useEffect, useMemo, useRef, useState } from "react";
import type { GridCell, Place } from "../lib/types";

type Layer = "temp" | "precip" | "wind" | "pressure";

type Props = {
  place: Place;
  cells?: GridCell[];
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
    const a = 0.15 + t * 0.7;
    return `rgba(47, 111, 142, ${a.toFixed(2)})`;
  }
  if (layer === "wind") {
    const a = 0.2 + t * 0.65;
    return `rgba(180, 120, 40, ${a.toFixed(2)})`;
  }
  if (layer === "pressure") {
    const r = Math.round(80 + t * 100);
    const b = Math.round(160 - t * 80);
    return `rgba(${r}, 120, ${b}, 0.55)`;
  }
  // temp: cool blue → warm amber
  const r = Math.round(60 + t * 180);
  const g = Math.round(120 + t * 40);
  const b = Math.round(180 - t * 140);
  return `rgba(${r}, ${g}, ${b}, 0.62)`;
}

export function RegionalMap({ place, cells }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<{
    map: import("leaflet").Map;
    layerGroup: import("leaflet").LayerGroup;
  } | null>(null);
  const [layer, setLayer] = useState<Layer>("temp");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    if (!cells?.length) return null;
    const vals = cells.map((c) => valueOf(c, layer));
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [cells, layer]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (!mapRef.current || leafletRef.current) return;
      try {
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");
        if (cancelled || !mapRef.current) return;

        const map = L.map(mapRef.current, {
          zoomControl: true,
          attributionControl: true,
          scrollWheelZoom: false,
        }).setView([place.latitude, place.longitude], 8);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 18,
        }).addTo(map);

        const layerGroup = L.layerGroup().addTo(map);
        L.circleMarker([place.latitude, place.longitude], {
          radius: 7,
          color: "#14202e",
          weight: 2,
          fillColor: "#f2c14e",
          fillOpacity: 1,
        })
          .bindTooltip(place.name, { permanent: false })
          .addTo(map);

        leafletRef.current = { map, layerGroup };
        setReady(true);
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
    // Intentionally once per mount; place updates handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handle = leafletRef.current;
    if (!handle || !ready) return;
    void import("leaflet").then((L) => {
      handle.map.setView([place.latitude, place.longitude], handle.map.getZoom());
      handle.layerGroup.clearLayers();

      L.circleMarker([place.latitude, place.longitude], {
        radius: 7,
        color: "#14202e",
        weight: 2,
        fillColor: "#f2c14e",
        fillOpacity: 1,
      }).addTo(handle.layerGroup);

      if (!cells?.length || !stats) return;

      const half = 0.18;
      for (const cell of cells) {
        const v = valueOf(cell, layer);
        const bounds: [[number, number], [number, number]] = [
          [cell.latitude - half, cell.longitude - half],
          [cell.latitude + half, cell.longitude + half],
        ];
        L.rectangle(bounds, {
          stroke: false,
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
          .addTo(handle.layerGroup);
      }
    });
  }, [place, cells, layer, stats, ready]);

  return (
    <div className="map-panel">
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
      <div className="map-panel__frame">
        <div ref={mapRef} className="map-panel__canvas" />
        {error && <p className="map-panel__fallback">{error}</p>}
        {!cells?.length && !error && (
          <p className="map-panel__fallback">Regional grid unavailable for this load.</p>
        )}
      </div>
      {stats && (
        <p className="chart__note">
          Local {LAYER_LABEL[layer].toLowerCase()} field from a 5×5 Open-Meteo grid
          (~{((cells?.[0] && 1.6) || 1.6).toFixed(1)}° across). Range{" "}
          {layer === "pressure"
            ? `${Math.round(stats.min)}–${Math.round(stats.max)} hPa`
            : layer === "precip"
              ? `${stats.min.toFixed(1)}–${stats.max.toFixed(1)} mm`
              : layer === "wind"
                ? `${Math.round(stats.min)}–${Math.round(stats.max)} km/h`
                : `${stats.min.toFixed(1)}–${stats.max.toFixed(1)}°`}
          . Basemap © OpenStreetMap.
        </p>
      )}
    </div>
  );
}
