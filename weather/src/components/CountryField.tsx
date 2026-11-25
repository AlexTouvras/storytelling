import { useEffect, useRef, useState } from "react";
import type { BBox, GridCell, Place } from "../lib/types";
import {
  getCountryGeometry,
  toGeoJsonFeature,
  type CountryGeometry,
} from "../lib/countryPolygon";
import {
  project,
  rasterizeField,
  viewBoxFromGeometry,
  type MapLayer,
  type ViewBox,
} from "../lib/idwField";

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

const INTERNAL = 280; // raster resolution — scaled up smoothly

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [geometry, setGeometry] = useState<CountryGeometry | null>(null);
  const [range, setRange] = useState<{ min: number; max: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resizeTick, setResizeTick] = useState(0);

  const countryCode = place.countryCode;
  const label = countryLabel || place.country || place.name;

  useEffect(() => {
    let cancelled = false;
    setError(null);
    void getCountryGeometry(countryCode)
      .then((g) => {
        if (!cancelled) setGeometry(g);
      })
      .catch(() => {
        if (!cancelled) {
          setGeometry(null);
          setError("Country outline unavailable.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const cssW = parent?.clientWidth || 640;
    const cssH = parent?.clientHeight || 420;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    // Void
    ctx.fillStyle = "#070a12";
    ctx.fillRect(0, 0, cssW, cssH);

    let view: ViewBox;
    if (geometry) {
      view = viewBoxFromGeometry(geometry, 0.1);
    } else if (bbox) {
      const [west, south, east, north] = bbox;
      const padW = (east - west) * 0.1;
      const padH = (north - south) * 0.1;
      view = {
        west: west - padW,
        south: south - padH,
        east: east + padW,
        north: north + padH,
      };
    } else {
      view = {
        west: place.longitude - 4,
        south: place.latitude - 4,
        east: place.longitude + 4,
        north: place.latitude + 4,
      };
    }

    // Continuous IDW field at lower res, then smooth upscale
    if (cells.length && reveal > 0.02) {
      const off = document.createElement("canvas");
      off.width = INTERNAL;
      off.height = INTERNAL;
      const octx = off.getContext("2d");
      if (octx) {
        const img = octx.createImageData(INTERNAL, INTERNAL);
        const domain = rasterizeField(img, cells, layer, geometry, view);
        setRange(domain);
        octx.putImageData(img, 0, 0);
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, reveal));
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(off, 0, 0, cssW, cssH);
        ctx.restore();
      }
    }

    // Country border
    if (geometry) {
      const feature = toGeoJsonFeature(countryCode || "XX", geometry);
      ctx.beginPath();
      const coords =
        feature.geometry.type === "Polygon"
          ? [feature.geometry.coordinates]
          : feature.geometry.coordinates;
      for (const poly of coords) {
        for (const ring of poly) {
          ring.forEach(([lon, lat], i) => {
            const p = project(lon, lat, view, cssW, cssH);
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.closePath();
        }
      }
      ctx.strokeStyle = "rgba(34, 211, 238, 0.95)";
      ctx.lineWidth = 2.25;
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.fillStyle = "rgba(34, 211, 238, 0.04)";
      ctx.fill("evenodd");
    }

    // Place pin
    const pin = project(place.longitude, place.latitude, view, cssW, cssH);
    ctx.beginPath();
    ctx.arc(pin.x, pin.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#22d3ee";
    ctx.fill();
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [
    cells,
    layer,
    geometry,
    bbox,
    place.latitude,
    place.longitude,
    countryCode,
    reveal,
    resizeTick,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas?.parentElement) return;
    const ro = new ResizeObserver(() => setResizeTick((n) => n + 1));
    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, []);

  const rangeLabel =
    range &&
    (layer === "pressure"
      ? `${Math.round(range.min)}–${Math.round(range.max)} hPa`
      : layer === "precip"
        ? `${range.min.toFixed(1)}–${range.max.toFixed(1)} mm`
        : layer === "wind"
          ? `${Math.round(range.min)}–${Math.round(range.max)} km/h`
          : `${range.min.toFixed(1)}–${range.max.toFixed(1)}°`);

  return (
    <div className="country-field">
      {showToolbar && (
        <div className="map-panel__toolbar" role="tablist" aria-label="Map layer">
          {(Object.keys(LAYER_LABEL) as MapLayer[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={layer === key}
              className={layer === key ? "map-tab map-tab--active" : "map-tab"}
              onClick={() => onLayerChange?.(key)}
            >
              {LAYER_LABEL[key]}
            </button>
          ))}
        </div>
      )}
      <div className="country-field__frame">
        <canvas
          ref={canvasRef}
          className="country-field__canvas"
          role="img"
          aria-label={`${LAYER_LABEL[layer]} across ${label}, continuous field clipped to national borders`}
        />
        {error && <p className="map-panel__fallback">{error}</p>}
        {!cells.length && !error && (
          <p className="map-panel__fallback">
            National field unavailable — outline shows {label}.
          </p>
        )}
      </div>
      {rangeLabel && (
        <p className="country-field__legend">
          {LAYER_LABEL[layer]} · {rangeLabel} · continuous field · Natural Earth
          borders · no tile API
        </p>
      )}
    </div>
  );
}
