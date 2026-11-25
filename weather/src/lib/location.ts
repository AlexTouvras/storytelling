import type { Place } from "./types";

const STORAGE_KEY = "skylore:last-place";

export function loadSavedPlace(): Place | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Place;
    if (
      typeof parsed?.latitude !== "number" ||
      typeof parsed?.longitude !== "number" ||
      !parsed.name
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function savePlace(place: Place): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(place));
}

export function formatPlace(place: Place): string {
  const bits = [place.name, place.admin1, place.country].filter(
    (b): b is string => Boolean(b),
  );
  const unique: string[] = [];
  for (const b of bits) {
    if (!unique.includes(b)) unique.push(b);
  }
  return unique.join(", ");
}

export function formatCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", q);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  const res = await fetch(url);
  if (!res.ok) throw new Error("Place search failed");
  const data = (await res.json()) as {
    results?: Array<{
      id: number;
      name: string;
      admin1?: string;
      country?: string;
      country_code?: string;
      latitude: number;
      longitude: number;
      timezone?: string;
    }>;
  };
  return (data.results ?? []).map((r) => ({
    id: String(r.id),
    name: r.name,
    admin1: r.admin1,
    country: r.country ?? "",
    countryCode: r.country_code?.toUpperCase(),
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
  }));
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<Place> {
  try {
    const url = new URL(
      "https://api.bigdatacloud.net/data/reverse-geocode-client",
    );
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("localityLanguage", "en");
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as {
        city?: string;
        locality?: string;
        principalSubdivision?: string;
        countryName?: string;
        countryCode?: string;
      };
      const name = data.city || data.locality || "Your location";
      return {
        id: `geo:${latitude.toFixed(3)},${longitude.toFixed(3)}`,
        name,
        admin1: data.principalSubdivision,
        country: data.countryName ?? "",
        countryCode: data.countryCode?.toUpperCase(),
        latitude,
        longitude,
      };
    }
  } catch {
    // fall through
  }
  return {
    id: `geo:${latitude.toFixed(3)},${longitude.toFixed(3)}`,
    name: "Your location",
    country: "",
    latitude,
    longitude,
  };
}

export function requestGeolocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not available in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 5 * 60_000,
    });
  });
}
