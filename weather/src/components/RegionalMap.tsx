import { useEffect, useMemo, useRef, useState } from "react";
import type { GridCell, Place } from "../lib/types";

type Layer = "temp" | "precip" | "wind" | "pressure";

type Props = {
  place: Place;
  cells?: GridCell[];
  spanDeg?: number;
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
    const a = 0.18 + t * 0.72;
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
  const r = Math.round(60 + t * 180);
  const g = Math.round(120 + t * 40);
  const b = Math.round(180 - t * 140);
  return `rgba(${r}, ${g}, ${b}, 0.62)`;
}

/** Keep only cells near the selected place so a stale grid cannot pull the camera away. */
function cellsNearPlace(
  cells: GridCell[] | undefined,
  place: Place,
  spanDeg: number,
): GridCell[] {
  if (!cells?.length) return [];
  const limit = Math.max(spanDeg, 1.6) * 0.85;
  return cells.filter(
    (c) =>
      Math.abs(c.latitude - place.latitude) <= limit &&
      Math.abs(c.longitude - place.longitude) <= limit,
  );
}

function gridStep(cells: GridCell[]): { halfLat: number; halfLon: number } {
  const lats = [...new Set(cells.map((c) => +c.latitude.toFixed(3)))].sort(
    (a, b) => a - b,
  );
  const lons = [...new Set(cells.map((c) => +c.longitude.toFixed(3)))].sort(
    (a, b) => a - b,
  );
  // Prefer median adjacent step so Open-Meteo snapping noise does not shrink cells.
  const gaps = (xs: number[]) =>
    xs.slice(1).map((v, i) => v - xs[i]).filter((g) => g > 0.05);
  const median = (xs: number[], fallback: number) => {
    if (!xs.length) return fallback;
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  const dLat = median(gaps(lats), 0.4);
  const dLon = median(gaps(lons), 0.4);
  return { halfLat: dLat / 2, halfLon: dLon / 2 };
}

export function RegionalMap({ place, cells, spanDeg = 1.6 }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<{
    map: import("leaflet").Map;
    layerGroup: import("leaflet").LayerGroup;
  } | null>(null);
  const [layer, setLayer] = useState<Layer>("temp");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localCells = useMemo(
    () => cellsNearPlace(cells, place, spanDeg),
    [cells, place, spanDeg],
  );

  const stats = useMemo(() => {
    if (!localCells.length) return null;
    const vals = localCells.map((c) => valueOf(c, layer));
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [localCells, layer]);

  // Remount the map whenever the selected coordinates change so the viewport
  // cannot stick on a previous geolocation (e.g. Washington after picking Helsinki).
  const placeKey = `${place.latitude.toFixed(4)},${place.longitude.toFixed(4)}`;

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

        // Tear down any prior instance bound to this container.
        if (leafletRef.current) {
          leafletRef.current.map.remove();
          leafletRef.current = null;
        }

        const map = L.map(mapRef.current, {
          zoomControl: true,
          attributionControl: true,
          scrollWheelZoom: false,
          // Explicit center — never rely on Leaflet's default (London).
          center: [place.latitude, place.longitude],
          zoom: 8,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 18,
        }).addTo(map);

        const layerGroup = L.layerGroup().addTo(map);
        leafletRef.current = { map, layerGroup };

        // Container may still be settling in the scroll layout.
        requestAnimationFrame(() => {
          if (cancelled || !leafletRef.current) return;
          leafletRef.current.map.invalidateSize();
          leafletRef.current.map.setView(
            [place.latitude, place.longitude],
            8,
            { animate: false },
          );
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
    // placeKey captures lat/lon; place fields used inside are from this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeKey]);

  useEffect(() => {
    const handle = leafletRef.current;
    if (!handle || !ready) return;

    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !leafletRef.current) return;
      const { map, layerGroup } = leafletRef.current;
      layerGroup.clearLayers();

      L.circleMarker([place.latitude, place.longitude], {
        radius: 7,
        color: "#14202e",
        weight: 2,
        fillColor: "#f2c14e",
        fillOpacity: 1,
      })
        .bindTooltip(place.name, { direction: "top" })
        .addTo(layerGroup);

      map.invalidateSize();

      if (!localCells.length || !stats) {
        map.setView([place.latitude, place.longitude], 8, { animate: false });
        return;
      }

      const { halfLat, halfLon } = gridStep(localCells);
      const corners: import("leaflet").LatLngExpression[] = [
        [place.latitude, place.longitude],
      ];

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
        corners.push(sw, ne);
        L.rectangle([sw, ne], {
          stroke: true,
          color: "rgba(20,32,46,0.12)",
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

      const bounds = L.latLngBounds(corners);
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.1), { animate: false, maxZoom: 9 });
      } else {
        map.setView([place.latitude, place.longitude], 8, { animate: false });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [place, localCells, layer, stats, ready]);

  const flatPrecip =
    layer === "precip" && stats && stats.max - stats.min < 0.05;

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
        {!localCells.length && !error && (
          <p className="map-panel__fallback">
            Regional grid unavailable for this load — map is centered on{" "}
            {place.name}.
          </p>
        )}
      </div>
      {stats && (
        <p className="chart__note">
          Local {LAYER_LABEL[layer].toLowerCase()} field from a 5×5 Open-Meteo
          grid around {place.name} (~{spanDeg.toFixed(1)}° across). Range{" "}
          {layer === "pressure"
            ? `${Math.round(stats.min)}–${Math.round(stats.max)} hPa`
            : layer === "precip"
              ? `${stats.min.toFixed(1)}–${stats.max.toFixed(1)} mm`
              : layer === "wind"
                ? `${Math.round(stats.min)}–${Math.round(stats.max)} km/h`
                : `${stats.min.toFixed(1)}–${stats.max.toFixed(1)}°`}
          .
          {flatPrecip
            ? " No measurable precip across the grid right now, so the layer looks even."
            : null}{" "}
          Basemap © OpenStreetMap.
        </p>
      )}
    </div>
  );
}
