import { useEffect, useMemo, useRef, useState } from "react";
import type { BBox, GridCell, Place } from "../lib/types";
import {
  getCountryGeometry,
  pointInCountry,
  toGeoJsonFeature,
  type CountryGeometry,
} from "../lib/countryPolygon";

export type MapLayer = "temp" | "precip" | "wind" | "pressure";

type Props = {
  place: Place;
  cells?: GridCell[];
  bbox?: BBox;
  countryLabel?: string;
  showToolbar?: boolean;
  layer?: MapLayer;
  onLayerChange?: (layer: MapLayer) => void;
  compact?: boolean;
};

const LAYER_LABEL: Record<MapLayer, string> = {
  temp: "Temperature",
  precip: "Precipitation",
  wind: "Wind",
  pressure: "Pressure",
};

function valueOf(cell: GridCell, layer: MapLayer): number {
  if (layer === "temp") return cell.temp;
  if (layer === "precip") return cell.precip;
  if (layer === "wind") return cell.windSpeed;
  return cell.pressure;
}

function heatColor(
  value: number,
  layer: MapLayer,
  min: number,
  max: number,
): string {
  const t = max === min ? 0.5 : (value - min) / (max - min);
  if (layer === "precip") {
    if (max <= 0.05) return "hsla(205, 70%, 45%, 0.18)";
    return `hsla(${205 - t * 35}, 80%, ${42 + t * 16}%, ${0.35 + t * 0.5})`;
  }
  if (layer === "wind") {
    return `hsla(${165 - t * 95}, 75%, ${40 + t * 18}%, ${0.4 + t * 0.4})`;
  }
  if (layer === "pressure") {
    return `hsla(${280 - t * 100}, 65%, ${42 + t * 14}%, ${0.4 + t * 0.4})`;
  }
  // temp: cool → warm
  const h = 220 - t * 200;
  return `hsla(${h}, 85%, ${48 + t * 12}%, 0.78)`;
}

type LeafletNS = typeof import("leaflet");

type HeatHandles = {
  canvas: HTMLCanvasElement;
  redraw: () => void;
  detach: () => void;
};

function attachClippedHeat(
  L: LeafletNS,
  map: import("leaflet").Map,
  cells: GridCell[],
  geometry: CountryGeometry | null,
  layer: MapLayer,
  stats: { min: number; max: number },
): HeatHandles {
  const canvas = L.DomUtil.create(
    "canvas",
    "skylore-heat-canvas",
  ) as HTMLCanvasElement;
  canvas.style.pointerEvents = "none";
  const pane = map.getPane("overlayPane") ?? map.getContainer();
  pane.appendChild(canvas);

  const redraw = () => {
    const size = map.getSize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.x * dpr);
    canvas.height = Math.round(size.y * dpr);
    canvas.style.width = `${size.x}px`;
    canvas.style.height = `${size.y}px`;
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(canvas, topLeft);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.x, size.y);

    if (geometry) {
      ctx.beginPath();
      for (const poly of geometry.polygons) {
        for (const ring of poly) {
          for (let i = 0; i < ring.length; i++) {
            const [lon, lat] = ring[i];
            const p = map.latLngToContainerPoint([lat, lon]);
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          ctx.closePath();
        }
      }
      ctx.clip("evenodd");
    }

    if (!cells.length) return;
    const zoom = map.getZoom();
    const radius = Math.max(26, Math.min(96, 16 * Math.pow(2, zoom - 4)));

    for (const cell of cells) {
      if (
        geometry &&
        !pointInCountry(cell.longitude, cell.latitude, geometry)
      ) {
        continue;
      }
      const p = map.latLngToContainerPoint([cell.latitude, cell.longitude]);
      const v = valueOf(cell, layer);
      const color = heatColor(v, layer, stats.min, stats.max);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      g.addColorStop(0, color);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const onView = () => redraw();
  map.on("moveend zoomend viewreset resize", onView);
  redraw();

  return {
    canvas,
    redraw,
    detach: () => {
      map.off("moveend zoomend viewreset resize", onView);
      canvas.remove();
    },
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
    L: LeafletNS;
    border: import("leaflet").GeoJSON | null;
    pin: import("leaflet").CircleMarker | null;
    heat: HeatHandles | null;
  } | null>(null);
  const [internalLayer, setInternalLayer] = useState<MapLayer>("temp");
  const layer = controlledLayer ?? internalLayer;
  const setLayer = (next: MapLayer) => {
    onLayerChange?.(next);
    if (controlledLayer === undefined) setInternalLayer(next);
  };
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clipped, setClipped] = useState(false);

  const countryCode = place.countryCode;
  const localCells = cells ?? [];
  const stats = useMemo(() => {
    if (!localCells.length) return null;
    const vals = localCells.map((c) => valueOf(c, layer));
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [localCells, layer]);

  const placeKey = `${place.latitude.toFixed(4)},${place.longitude.toFixed(4)}`;
  const bboxKey = bbox?.join(",") ?? "";

  // Boot map when place/bbox identity changes
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    setClipped(false);

    async function boot() {
      if (!mapRef.current) return;
      try {
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");
        if (cancelled || !mapRef.current) return;

        if (leafletRef.current) {
          leafletRef.current.heat?.detach();
          leafletRef.current.map.remove();
          leafletRef.current = null;
        }

        const map = L.map(mapRef.current, {
          zoomControl: true,
          attributionControl: false,
          scrollWheelZoom: false,
          center: [place.latitude, place.longitude],
          zoom: 6,
        });

        // Keyless: no raster tiles (no Carto/Esri/API keys). Void + polygon + heat.
        map.getContainer().style.background = "#070a12";

        leafletRef.current = {
          map,
          L,
          border: null,
          pin: null,
          heat: null,
        };

        requestAnimationFrame(() => {
          if (cancelled || !leafletRef.current) return;
          leafletRef.current.map.invalidateSize();
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
        leafletRef.current.heat?.detach();
        leafletRef.current.map.remove();
        leafletRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeKey, bboxKey]);

  // Borders, heat, pin, fit — when ready / layer / cells change
  useEffect(() => {
    const handle = leafletRef.current;
    if (!handle || !ready) return;
    let cancelled = false;
    const { map, L } = handle;
    const layerStats = stats ?? { min: 0, max: 1 };

    void (async () => {
      let geometry: CountryGeometry | null = null;
      try {
        geometry = await getCountryGeometry(countryCode);
      } catch {
        geometry = null;
      }
      if (cancelled || !leafletRef.current) return;

      handle.border?.remove();
      handle.border = null;
      handle.heat?.detach();
      handle.heat = null;
      handle.pin?.remove();
      handle.pin = null;

      if (geometry && countryCode) {
        const feature = toGeoJsonFeature(countryCode, geometry);
        handle.border = L.geoJSON(feature, {
          style: {
            color: "#22d3ee",
            weight: 2.25,
            opacity: 0.95,
            fillColor: "#22d3ee",
            fillOpacity: 0.05,
            lineJoin: "round",
          },
        }).addTo(map);
        setClipped(true);
        map.fitBounds(handle.border.getBounds(), {
          animate: false,
          padding: [24, 24],
          maxZoom: 8,
        });
      } else if (bbox) {
        setClipped(false);
        map.fitBounds(
          [
            [bbox[1], bbox[0]],
            [bbox[3], bbox[2]],
          ],
          { animate: false, padding: [16, 16], maxZoom: 8 },
        );
      } else {
        setClipped(false);
        map.setView([place.latitude, place.longitude], 6, { animate: false });
      }

      if (localCells.length) {
        handle.heat = attachClippedHeat(
          L,
          map,
          localCells,
          geometry,
          layer,
          layerStats,
        );
      }

      handle.pin = L.circleMarker([place.latitude, place.longitude], {
        radius: 7,
        color: "#f8fafc",
        weight: 2,
        fillColor: "#22d3ee",
        fillOpacity: 1,
      })
        .bindTooltip(place.name, { direction: "top" })
        .addTo(map);

      requestAnimationFrame(() => {
        map.invalidateSize();
        handle.heat?.redraw();
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    ready,
    localCells,
    layer,
    stats,
    bbox,
    countryCode,
    place.latitude,
    place.longitude,
    place.name,
  ]);

  const label = countryLabel || place.country || place.name;
  const flatPrecip =
    layer === "precip" && stats && stats.max - stats.min < 0.05;

  return (
    <div className={compact ? "map-panel map-panel--compact" : "map-panel"}>
      {showToolbar && (
        <div
          className="map-panel__toolbar"
          role="tablist"
          aria-label="Map layer"
        >
          {(Object.keys(LAYER_LABEL) as MapLayer[]).map((key) => (
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
        <div
          ref={mapRef}
          className="map-panel__canvas"
          role="img"
          aria-label={`${LAYER_LABEL[layer]} across ${label}${
            clipped ? ", clipped to national borders" : ""
          }`}
        />
        <div className="map-panel__vignette" aria-hidden />
        {error && <p className="map-panel__fallback">{error}</p>}
        {!localCells.length && !error && (
          <p className="map-panel__fallback">
            National field unavailable — map shows {label}.
          </p>
        )}
      </div>
      {stats && (
        <p className="chart__note">
          {LAYER_LABEL[layer]} across {label}
          {clipped ? ", masked to national borders" : ""}. Range{" "}
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
          Void canvas · Natural Earth borders · no tile API.
        </p>
      )}
    </div>
  );
}
