import { useEffect, useRef, useState } from "react";
import {
  formatCoords,
  formatPlace,
  requestGeolocation,
  reverseGeocode,
  searchPlaces,
} from "../lib/location";
import type { Place } from "../lib/types";

type Props = {
  place: Place | null;
  busy: boolean;
  onSelect: (place: Place) => void;
  onStatus: (message: string | null) => void;
};

export function LocationPicker({ place, busy, onSelect, onStatus }: Props) {
  const [openSearch, setOpenSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Place[]>([]);
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (openSearch) {
      searchRef.current?.focus({ preventScroll: true });
    }
  }, [openSearch]);

  useEffect(() => {
    if (!openSearch || query.trim().length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchPlaces(query);
        if (!cancelled) setHits(results);
      } catch {
        if (!cancelled) {
          setHits([]);
          onStatus("Place search failed. Check your connection and try again.");
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, openSearch, onStatus]);

  const shareLocation = async () => {
    setLocating(true);
    onStatus("Asking for your location…");
    try {
      const pos = await requestGeolocation();
      onStatus("Resolving place name…");
      const resolved = await reverseGeocode(
        pos.coords.latitude,
        pos.coords.longitude,
      );
      onSelect(resolved);
      onStatus(null);
      setOpenSearch(false);
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? Number((err as GeolocationPositionError).code)
          : 0;
      if (code === 1) {
        onStatus(
          "Location permission was denied. Pick a city below instead.",
        );
      } else if (code === 2) {
        onStatus("Location unavailable. Pick a city below instead.");
      } else if (code === 3) {
        onStatus("Location timed out. Pick a city below instead.");
      } else {
        onStatus("Could not get location. Pick a city below instead.");
      }
      setOpenSearch(true);
    } finally {
      setLocating(false);
    }
  };

  return (
    <div>
      <div className="cta-row">
        <button
          type="button"
          className="btn btn--primary"
          onClick={shareLocation}
          disabled={busy || locating}
        >
          {locating ? "Locating…" : "Share my location"}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setOpenSearch((v) => !v)}
          disabled={busy}
        >
          {openSearch ? "Hide search" : "Pick a place"}
        </button>
      </div>

      {openSearch && (
        <div className="place-panel">
          <label className="sr-only" htmlFor="place-search">
            Search for a city or place
          </label>
          <input
            id="place-search"
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city or place"
            autoComplete="off"
          />
          {searching && <div className="status-banner">Searching…</div>}
          {hits.length > 0 && (
            <ul className="suggestions" role="listbox">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    role="option"
                    onClick={() => {
                      onSelect(hit);
                      onStatus(null);
                      setOpenSearch(false);
                      setQuery("");
                    }}
                  >
                    {formatPlace(hit)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {place && (
        <p className="resolved">
          <strong>{formatPlace(place)}</strong>
          <br />
          {formatCoords(place.latitude, place.longitude)}
        </p>
      )}
    </div>
  );
}
