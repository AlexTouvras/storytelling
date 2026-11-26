import { useEffect, useMemo, useRef, useState } from "react";
import type { BBox, GridCell, Place } from "../lib/types";
import {
  getCountryGeometry,
  toGeoJsonFeature,
  type CountryGeometry,
} from "../lib/countryPolygon";
import {
  rasterizeField,
  viewBoxFromGeometry,
  type MapLayer,
  type ViewBox,
} from "../lib/idwField";
import { citiesForCountry } from "../lib/cities";

type Props = {
  place: Place;
  cells?: GridCell[];
  bbox?: BBox;
  countryLabel?: string;
  layer: MapLayer;
  onLayerChange?: (layer: MapLayer) => void;
  showToolbar?: boolean;
  /** 0–1 reveal of the field fill (scroll-tied). */
  reveal?: number;
};

const LAYER_LABEL: Record<MapLayer, string> = {
  temp: "Temperature",
  precip: "Precipitation",
  wind: "Wind",
  pressure: "Pressure",
};

const LAYER_UNIT: Record<MapLayer, string> = {
  temp: "°C",
  precip: "mm",
  wind: "km/h",
  pressure: "hPa",
};

const INTERNAL = 320;

type LeafletNS = typeof import("leaflet");

function formatValue(layer: MapLayer, v: number): string {
  if (layer === "temp") return `${Math.round(v)}°`;
  if (layer === "precip") return `${v.toFixed(1)} mm`;
  if (layer === "wind") return `${Math.round(v)} km/h`;
  return `${Math.round(v)} hPa`;
}

function findExtremes(
  cells: GridCell[],
  layer: MapLayer,
): { label: string; value: string; lat: number; lon: number }[] {
  if (cells.length < 2) return [];
  const scored = cells.map((c) => ({
    c,
    v:
      layer === "temp"
        ? c.temp
        : layer === "precip"
          ? c.precip
          : layer === "wind"
            ? c.windSpeed
            : c.pressure,
  }));
  scored.sort((a, b) => a.v - b.v);
  const lo = scored[0];
  const hi = scored[scored.length - 1];
  if (Math.abs(hi.v - lo.v) < 1e-6) return [];
  return [
    {
      label: layer === "precip" ? "Driest" : layer === "wind" ? "Calm" : "Low",
      value: formatValue(layer, lo.v),
      lat: lo.c.latitude,
      lon: lo.c.longitude,
    },
    {
      label: layer === "precip" ? "Wettest" : layer === "wind" ? "Strongest" : "High",
      value: formatValue(layer, hi.v),
      lat: hi.c.latitude,
      lon: hi.c.longitude,
    },
  ];
}

/**
 * Credible national weather map: darkened OSM basemap (keyless) + continuous
 * IDW field clipped to Natural Earth borders + city hierarchy + extreme callouts.
 */
export function CountryField({
  place,
  cells = [],
  bbox,
  countryLabel,
  layer,
  onLayerChange,
  showToolbar = false,
  reveal = 1,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<{
    map: import("leaflet").Map;
    L: LeafletNS;
    border: import("leaflet").GeoJSON | null;
    labels: import("leaflet").LayerGroup | null;
    callouts: import("leaflet").LayerGroup | null;
    pin: import("leaflet").CircleMarker | null;
  } | null>(null);
  const fieldCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const windCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const geometryRef = useRef<CountryGeometry | null>(null);
  const viewRef = useRef<ViewBox | null>(null);
  const [ready, setReady] = useState(false);
  const [range, setRange] = useState<{ min: number; max: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clipped, setClipped] = useState(false);

  const countryCode = place.countryCode;
  const label = countryLabel || place.country || place.name;
  const cities = useMemo(
    () =>
      citiesForCountry(countryCode, {
        name: place.name,
        lat: place.latitude,
        lon: place.longitude,
      }),
    [countryCode, place.name, place.latitude, place.longitude],
  );
  const extremes = useMemo(() => findExtremes(cells, layer), [cells, layer]);
  const placeKey = `${place.latitude.toFixed(4)},${place.longitude.toFixed(4)}`;
  const bboxKey = bbox?.join(",") ?? "";

  // Boot Leaflet + OSM once per place/bbox
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);

    async function boot() {
      if (!hostRef.current) return;
      try {
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");
        if (cancelled || !hostRef.current) return;

        if (leafletRef.current) {
          leafletRef.current.map.remove();
          leafletRef.current = null;
        }
        fieldCanvasRef.current?.remove();
        windCanvasRef.current?.remove();
        fieldCanvasRef.current = null;
        windCanvasRef.current = null;

        const map = L.map(hostRef.current, {
          zoomControl: false,
          attributionControl: true,
          dragging: true,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          touchZoom: true,
          center: [place.latitude, place.longitude],
          zoom: 6,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          className: "wx-basemap-tiles",
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        }).addTo(map);

        const pane = map.getPane("overlayPane") ?? map.getContainer();
        const field = L.DomUtil.create(
          "canvas",
          "wx-field-canvas",
        ) as HTMLCanvasElement;
        field.style.pointerEvents = "none";
        pane.appendChild(field);
        fieldCanvasRef.current = field;

        const wind = L.DomUtil.create(
          "canvas",
          "wx-wind-canvas",
        ) as HTMLCanvasElement;
        wind.style.pointerEvents = "none";
        pane.appendChild(wind);
        windCanvasRef.current = wind;

        leafletRef.current = {
          map,
          L,
          border: null,
          labels: L.layerGroup().addTo(map),
          callouts: L.layerGroup().addTo(map),
          pin: null,
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
        leafletRef.current.map.remove();
        leafletRef.current = null;
      }
      fieldCanvasRef.current = null;
      windCanvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeKey, bboxKey]);

  // Borders, fit, labels, callouts
  useEffect(() => {
    const handle = leafletRef.current;
    if (!handle || !ready) return;
    let cancelled = false;
    const { map, L } = handle;

    void (async () => {
      let geometry: CountryGeometry | null = null;
      try {
        geometry = await getCountryGeometry(countryCode);
      } catch {
        geometry = null;
      }
      if (cancelled || !leafletRef.current) return;
      geometryRef.current = geometry;

      handle.border?.remove();
      handle.border = null;
      handle.pin?.remove();
      handle.pin = null;
      handle.labels?.clearLayers();
      handle.callouts?.clearLayers();

      if (geometry && countryCode) {
        const feature = toGeoJsonFeature(countryCode, geometry);
        handle.border = L.geoJSON(feature, {
          style: {
            color: "rgba(232, 220, 200, 0.9)",
            weight: 1.6,
            opacity: 1,
            fillColor: "transparent",
            fillOpacity: 0,
            lineJoin: "round",
          },
        }).addTo(map);
        setClipped(true);
        viewRef.current = viewBoxFromGeometry(geometry, 0.06);
        map.fitBounds(handle.border.getBounds(), {
          animate: false,
          padding: [36, 36],
          maxZoom: 8,
        });
      } else if (bbox) {
        setClipped(false);
        viewRef.current = {
          west: bbox[0],
          south: bbox[1],
          east: bbox[2],
          north: bbox[3],
        };
        map.fitBounds(
          [
            [bbox[1], bbox[0]],
            [bbox[3], bbox[2]],
          ],
          { animate: false, padding: [24, 24], maxZoom: 8 },
        );
      } else {
        setClipped(false);
        viewRef.current = null;
        map.setView([place.latitude, place.longitude], 6, { animate: false });
      }

      for (const c of cities) {
        const el = document.createElement("div");
        el.className = c.major
          ? "wx-city-label wx-city-label--major"
          : "wx-city-label";
        el.textContent = c.name;
        L.marker([c.lat, c.lon], {
          icon: L.divIcon({
            className: "wx-city-icon",
            html: el.outerHTML,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          }),
          interactive: false,
          keyboard: false,
        }).addTo(handle.labels!);
      }

      for (const e of extremes) {
        const el = document.createElement("div");
        el.className = "wx-callout";
        el.innerHTML = `<span class="wx-callout__k">${e.label}</span><span class="wx-callout__v">${e.value}</span>`;
        L.marker([e.lat, e.lon], {
          icon: L.divIcon({
            className: "wx-callout-icon",
            html: el.outerHTML,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          }),
          interactive: false,
          keyboard: false,
        }).addTo(handle.callouts!);
      }

      handle.pin = L.circleMarker([place.latitude, place.longitude], {
        radius: 6,
        color: "#f8fafc",
        weight: 2,
        fillColor: "#22d3ee",
        fillOpacity: 1,
      })
        .bindTooltip(place.name, { direction: "top", opacity: 0.95 })
        .addTo(map);

      requestAnimationFrame(() => {
        map.invalidateSize();
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    ready,
    cells,
    layer,
    extremes,
    cities,
    bbox,
    countryCode,
    place.latitude,
    place.longitude,
    place.name,
  ]);

  // Paint continuous IDW field into overlay canvas, clipped via rasterizeField
  useEffect(() => {
    const handle = leafletRef.current;
    const canvas = fieldCanvasRef.current;
    if (!handle || !canvas || !ready) return;
    const { map, L } = handle;

    const paint = () => {
      const size = map.getSize();
      if (size.x < 8 || size.y < 8) return;
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

      if (!cells.length) {
        setRange(null);
        return;
      }

      const geometry = geometryRef.current;
      // Derive view from current map bounds so field tracks pan/zoom
      const b = map.getBounds();
      const view: ViewBox = {
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
      };

      const aspect = size.x / size.y;
      const rw = INTERNAL;
      const rh = Math.max(48, Math.round(INTERNAL / aspect));
      const img = ctx.createImageData(rw, rh);
      const { min, max } = rasterizeField(img, cells, layer, geometry, view);
      setRange({ min, max });

      // Scale low-res field up smoothly
      const off = document.createElement("canvas");
      off.width = rw;
      off.height = rh;
      const octx = off.getContext("2d");
      if (!octx) return;
      octx.putImageData(img, 0, 0);

      ctx.save();
      ctx.globalAlpha = Math.max(0.15, Math.min(1, reveal));
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(off, 0, 0, size.x, size.y);

      // Soft radar-like blooms for precip (inspiration: futurecast / severe outlook)
      if (layer === "precip" && max > 0.15) {
        ctx.globalCompositeOperation = "lighter";
        for (const c of cells) {
          if (c.precip < max * 0.35) continue;
          const p = map.latLngToContainerPoint([c.latitude, c.longitude]);
          const t = (c.precip - min) / Math.max(1e-6, max - min);
          const r = 18 + t * 42;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          g.addColorStop(0, `rgba(120, 200, 255, ${0.25 + t * 0.35})`);
          g.addColorStop(1, "rgba(40, 100, 180, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.restore();
    };

    paint();
    map.on("move zoom resize", paint);
    return () => {
      map.off("move zoom resize", paint);
    };
  }, [ready, cells, layer, reveal]);

  // Wind particles (inspiration: Windy)
  useEffect(() => {
    const handle = leafletRef.current;
    const canvas = windCanvasRef.current;
    if (!handle || !canvas || !ready) return;
    const { map, L } = handle;
    let raf = 0;
    let alive = true;
    type P = { x: number; y: number; age: number };
    const particles: P[] = [];
    const avgWind =
      cells.reduce((a, c) => a + c.windSpeed, 0) / Math.max(1, cells.length);
    const dirSample = cells[Math.floor(cells.length / 2)];
    // Approximate prevailing direction from place — no per-cell windDir on grid
    const dirRad = ((220 + (dirSample?.longitude ?? 0) * 0.2) * Math.PI) / 180;

    const tick = () => {
      if (!alive) return;
      const size = map.getSize();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(size.x * dpr);
      canvas.height = Math.round(size.y * dpr);
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, topLeft);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        raf = requestAnimationFrame(tick);
        return;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.x, size.y);

      const show = layer === "wind" && reveal > 0.2;
      const density = show ? Math.round(36 + reveal * 50) : 0;
      while (particles.length < density) {
        particles.push({
          x: Math.random() * size.x,
          y: Math.random() * size.y,
          age: Math.random(),
        });
      }
      while (particles.length > density) particles.pop();

      const speed = 0.35 + (avgWind / 45) * 1.4;
      const dx = Math.sin(dirRad) * speed;
      const dy = -Math.cos(dirRad) * speed;
      ctx.strokeStyle = "rgba(220, 235, 245, 0.4)";
      ctx.lineWidth = 1.15;
      for (const p of particles) {
        p.x += dx;
        p.y += dy;
        p.age += 0.014;
        if (p.age > 1 || p.x < 0 || p.y < 0 || p.x > size.x || p.y > size.y) {
          p.x = Math.random() * size.x;
          p.y = Math.random() * size.y;
          p.age = 0;
        }
        ctx.globalAlpha = Math.sin(p.age * Math.PI) * 0.75;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - dx * 7, p.y - dy * 7);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [ready, layer, reveal, cells]);

  const rangeText = range
    ? layer === "pressure"
      ? `${Math.round(range.min)}–${Math.round(range.max)} hPa`
      : layer === "precip"
        ? `${range.min.toFixed(1)}–${range.max.toFixed(1)} mm`
        : layer === "wind"
          ? `${Math.round(range.min)}–${Math.round(range.max)} km/h`
          : `${range.min.toFixed(1)}–${range.max.toFixed(1)}°`
    : null;

  return (
    <div className="country-field wx-map">
      {showToolbar && onLayerChange && (
        <div className="film-map-tabs" role="tablist" aria-label="Map layer">
          {(Object.keys(LAYER_LABEL) as MapLayer[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={layer === key}
              className={layer === key ? "map-tab map-tab--active" : "map-tab"}
              onClick={() => onLayerChange(key)}
            >
              {LAYER_LABEL[key]}
            </button>
          ))}
        </div>
      )}
      <div className="country-field__frame wx-map__frame">
        <div
          ref={hostRef}
          className="country-field__canvas wx-map__host"
          role="img"
          aria-label={`${LAYER_LABEL[layer]} across ${label}${
            clipped ? ", clipped to national borders" : ""
          }`}
        />
        <div className="wx-map__chrome">
          <div className="wx-map__legend">
            <span className="wx-map__legend-title">{LAYER_LABEL[layer]}</span>
            <div className="wx-map__ramp" data-layer={layer} aria-hidden />
            {rangeText && (
              <span className="wx-map__legend-range">{rangeText}</span>
            )}
          </div>
          <p className="wx-map__credit">
            OSM basemap · Open-Meteo field · Natural Earth borders
            {clipped ? " · clipped" : ""}
          </p>
        </div>
        {error && <p className="map-panel__fallback">{error}</p>}
        {!cells.length && !error && (
          <p className="map-panel__fallback">
            National grid still loading — map will fill in.
          </p>
        )}
      </div>
      <p className="country-field__legend">
        {LAYER_LABEL[layer]} ({LAYER_UNIT[layer]}) across {label}.
        {rangeText ? ` Range ${rangeText}.` : ""} Continuous IDW field, not
        grid cells.
      </p>
    </div>
  );
}
