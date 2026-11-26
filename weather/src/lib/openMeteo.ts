import { bboxForCountry } from "./countryBounds";
import type {
  BBox,
  DailyPoint,
  EnsembleDay,
  ForecastBundle,
  GridCell,
  HourlyPoint,
  Place,
} from "./types";

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function zipHourly(raw: {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  precipitation_probability: number[];
  precipitation: number[];
  weather_code: number[];
  wind_speed_10m: number[];
  wind_gusts_10m: number[];
  wind_direction_10m: number[];
  surface_pressure: number[];
  uv_index: number[];
  relative_humidity_2m: number[];
  cloud_cover: number[];
}): HourlyPoint[] {
  return raw.time.map((time, i) => ({
    time,
    temperature: num(raw.temperature_2m[i]),
    apparent: num(raw.apparent_temperature[i]),
    precipProb: num(raw.precipitation_probability[i]),
    precipMm: num(raw.precipitation[i]),
    weatherCode: num(raw.weather_code[i]),
    windSpeed: num(raw.wind_speed_10m[i]),
    windGusts: num(raw.wind_gusts_10m[i]),
    windDir: num(raw.wind_direction_10m[i]),
    pressure: num(raw.surface_pressure[i]),
    uvIndex: num(raw.uv_index[i]),
    humidity: num(raw.relative_humidity_2m[i]),
    cloudCover: num(raw.cloud_cover[i]),
  }));
}

function zipDaily(raw: {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  apparent_temperature_max: number[];
  apparent_temperature_min: number[];
  precipitation_sum: number[];
  precipitation_probability_max: number[];
  wind_speed_10m_max: number[];
  wind_gusts_10m_max: number[];
  uv_index_max: number[];
  sunrise: string[];
  sunset: string[];
}): DailyPoint[] {
  return raw.time.map((date, i) => ({
    date,
    weatherCode: num(raw.weather_code[i]),
    tempMax: num(raw.temperature_2m_max[i]),
    tempMin: num(raw.temperature_2m_min[i]),
    apparentMax: num(raw.apparent_temperature_max[i]),
    apparentMin: num(raw.apparent_temperature_min[i]),
    precipSum: num(raw.precipitation_sum[i]),
    precipProbMax: num(raw.precipitation_probability_max[i]),
    windMax: num(raw.wind_speed_10m_max[i]),
    windGustsMax: num(raw.wind_gusts_10m_max[i]),
    uvMax: num(raw.uv_index_max[i]),
    sunrise: raw.sunrise[i] ?? "",
    sunset: raw.sunset[i] ?? "",
  }));
}

const DEFAULT_TIMEOUT_MS = 12_000;

async function fetchJson<T>(
  url: URL,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
    return (await res.json()) as T;
  } catch (err) {
    if (
      (err instanceof Error && err.name === "AbortError") ||
      (typeof DOMException !== "undefined" &&
        err instanceof DOMException &&
        err.name === "AbortError")
    ) {
      throw new Error(`Weather request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

type ForecastResponse = {
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    relative_humidity_2m: number;
    surface_pressure: number;
    is_day: number;
  };
  hourly: Parameters<typeof zipHourly>[0];
  daily: Parameters<typeof zipDaily>[0];
};

/** Core hourly/daily/current only — paints the UI without waiting on extras. */
export async function fetchForecastCore(place: Place): Promise<ForecastBundle> {
  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.searchParams.set("latitude", String(place.latitude));
  forecastUrl.searchParams.set("longitude", String(place.longitude));
  forecastUrl.searchParams.set("timezone", "auto");
  forecastUrl.searchParams.set("forecast_days", "14");
  forecastUrl.searchParams.set(
    "current",
    [
      "temperature_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m",
      "wind_gusts_10m",
      "relative_humidity_2m",
      "surface_pressure",
      "is_day",
    ].join(","),
  );
  forecastUrl.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "apparent_temperature",
      "precipitation_probability",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "wind_gusts_10m",
      "wind_direction_10m",
      "surface_pressure",
      "uv_index",
      "relative_humidity_2m",
      "cloud_cover",
    ].join(","),
  );
  forecastUrl.searchParams.set(
    "daily",
    [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "apparent_temperature_min",
      "precipitation_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "wind_gusts_10m_max",
      "uv_index_max",
      "sunrise",
      "sunset",
    ].join(","),
  );

  const forecast = await fetchJson<ForecastResponse>(forecastUrl);

  return {
    fetchedAt: new Date().toISOString(),
    timezone: forecast.timezone,
    current: {
      time: forecast.current.time,
      temperature: num(forecast.current.temperature_2m),
      apparent: num(forecast.current.apparent_temperature),
      weatherCode: num(forecast.current.weather_code),
      windSpeed: num(forecast.current.wind_speed_10m),
      windGusts: num(forecast.current.wind_gusts_10m),
      humidity: num(forecast.current.relative_humidity_2m),
      pressure: num(forecast.current.surface_pressure),
      isDay: forecast.current.is_day === 1,
    },
    hourly: zipHourly(forecast.hourly),
    daily: zipDaily(forecast.daily),
  };
}

/** Best-effort climate / ensemble / AQ / national grid — never blocks first paint. */
export async function enrichForecast(
  place: Place,
  bundle: ForecastBundle,
): Promise<ForecastBundle> {
  const next: ForecastBundle = { ...bundle };
  const extras = await Promise.allSettled([
    fetchYearAgoBaseline(place, bundle.daily.length),
    fetchEnsemble(place),
    fetchAirQuality(place),
    fetchRegionalGrid(place),
  ]);

  if (extras[0].status === "fulfilled") next.climate = extras[0].value;
  if (extras[1].status === "fulfilled") next.ensemble = extras[1].value;
  if (extras[2].status === "fulfilled") next.airQuality = extras[2].value;
  if (extras[3].status === "fulfilled") next.grid = extras[3].value;
  return next;
}

export async function fetchForecast(place: Place): Promise<ForecastBundle> {
  const core = await fetchForecastCore(place);
  return enrichForecast(place, core);
}

async function fetchYearAgoBaseline(place: Place, days: number) {
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(days - 1, 0));

  const hist = new URL("https://archive-api.open-meteo.com/v1/archive");
  hist.searchParams.set("latitude", String(place.latitude));
  hist.searchParams.set("longitude", String(place.longitude));
  hist.searchParams.set("start_date", start.toISOString().slice(0, 10));
  hist.searchParams.set("end_date", end.toISOString().slice(0, 10));
  hist.searchParams.set("daily", "temperature_2m_max,precipitation_sum");
  hist.searchParams.set("timezone", "auto");

  const data = await fetchJson<{
    daily: {
      time: string[];
      temperature_2m_max: number[];
      precipitation_sum: number[];
    };
  }>(hist);

  return {
    dates: data.daily.time,
    tempMeanMax: data.daily.temperature_2m_max.map((v) => num(v, NaN)),
    precipMean: data.daily.precipitation_sum.map((v) => num(v, NaN)),
  };
}

function memberStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return {
    min: sorted[0],
    mean,
    max: sorted[sorted.length - 1],
  };
}

async function fetchEnsemble(place: Place) {
  const url = new URL("https://ensemble-api.open-meteo.com/v1/ensemble");
  url.searchParams.set("latitude", String(place.latitude));
  url.searchParams.set("longitude", String(place.longitude));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("models", "icon_seamless");
  url.searchParams.set("daily", "temperature_2m_max,precipitation_sum");

  type Ens = {
    daily: Record<string, number[] | string[] | undefined>;
  };
  const data = await fetchJson<Ens>(url);
  const daily = data.daily;

  const tempKeys = Object.keys(daily).filter(
    (k) => k.startsWith("temperature_2m_max") && k.includes("member"),
  );
  const precipKeys = Object.keys(daily).filter(
    (k) => k.startsWith("precipitation_sum") && k.includes("member"),
  );
  // Fall back to all keys if member naming differs
  const tKeys = tempKeys.length
    ? tempKeys
    : Object.keys(daily).filter((k) => k.startsWith("temperature_2m_max"));
  const pKeys = precipKeys.length
    ? precipKeys
    : Object.keys(daily).filter((k) => k.startsWith("precipitation_sum"));

  const dates = (daily.time as string[] | undefined) ?? [];
  const dayCount =
    dates.length || (daily[tKeys[0]] as number[] | undefined)?.length || 0;

  const days: EnsembleDay[] = [];
  const dailyTempMaxSpread: number[] = [];
  const dailyPrecipSpread: number[] = [];

  for (let i = 0; i < dayCount; i++) {
    const temps = tKeys
      .map((k) => num((daily[k] as number[])?.[i], NaN))
      .filter((v) => Number.isFinite(v));
    const precips = pKeys
      .map((k) => num((daily[k] as number[])?.[i], NaN))
      .filter((v) => Number.isFinite(v));
    const t = temps.length ? memberStats(temps) : null;
    const p = precips.length ? memberStats(precips) : null;
    days.push({
      date: dates[i] ?? "",
      tempMaxMin: t?.min ?? NaN,
      tempMaxMean: t?.mean ?? NaN,
      tempMaxMax: t?.max ?? NaN,
      precipMin: p?.min ?? NaN,
      precipMean: p?.mean ?? NaN,
      precipMax: p?.max ?? NaN,
    });
    dailyTempMaxSpread.push(t ? t.max - t.min : NaN);
    dailyPrecipSpread.push(p ? p.max - p.min : NaN);
  }

  return {
    memberCount: Math.max(tKeys.length, pKeys.length, 1),
    days,
    dailyTempMaxSpread,
    dailyPrecipSpread,
  };
}

async function fetchAirQuality(place: Place) {
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", String(place.latitude));
  url.searchParams.set("longitude", String(place.longitude));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "3");
  url.searchParams.set("hourly", "european_aqi,us_aqi");
  const data = await fetchJson<{
    hourly: {
      time: string[];
      european_aqi: (number | null)[];
      us_aqi: (number | null)[];
    };
  }>(url);
  return {
    time: data.hourly.time,
    europeanAqi: data.hourly.european_aqi,
    usAqi: data.hourly.us_aqi,
  };
}

function nationalBBox(place: Place): {
  bbox: BBox;
  countryCode?: string;
  countryName?: string;
} {
  const known = bboxForCountry(place.countryCode);
  if (known) {
    return {
      bbox: known,
      countryCode: place.countryCode?.toUpperCase(),
      countryName: place.country || undefined,
    };
  }
  // Fallback: regional pad around the point when ISO code is unknown.
  const pad = 3.5;
  return {
    bbox: [
      place.longitude - pad,
      place.latitude - pad,
      place.longitude + pad,
      place.latitude + pad,
    ],
    countryCode: place.countryCode?.toUpperCase(),
    countryName: place.country || undefined,
  };
}

/**
 * Open-Meteo multi-location GETs hang / stall above ~8–10 points from this
 * environment. Batch in chunks of 8 so the IDW field stays continuous without
 * blocking the forecast load forever.
 */
const GRID_CHUNK = 8;

/** National (or wide regional) sample grid for the country map layers. */
async function fetchRegionalGrid(place: Place) {
  const { bbox, countryCode, countryName } = nationalBBox(place);
  const [west, south, east, north] = bbox;
  const width = Math.max(east - west, 0.5);
  const height = Math.max(north - south, 0.5);
  // 5×5 = 25 samples → 4 chunks of ≤8 — enough for a smooth IDW field.
  const cols = width > 50 ? 4 : 5;
  const rows = height > 50 ? 4 : 5;

  const coords: { lat: number; lon: number }[] = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      coords.push({
        lat: south + ((i + 0.5) / rows) * height,
        lon: west + ((j + 0.5) / cols) * width,
      });
    }
  }

  type Point = {
    latitude: number;
    longitude: number;
    current: {
      temperature_2m: number;
      precipitation: number;
      wind_speed_10m: number;
      surface_pressure: number;
    };
  };

  const chunkJobs: Promise<GridCell[]>[] = [];
  for (let offset = 0; offset < coords.length; offset += GRID_CHUNK) {
    const chunk = coords.slice(offset, offset + GRID_CHUNK);
    chunkJobs.push(
      (async () => {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set(
          "latitude",
          chunk.map((c) => c.lat.toFixed(3)).join(","),
        );
        url.searchParams.set(
          "longitude",
          chunk.map((c) => c.lon.toFixed(3)).join(","),
        );
        url.searchParams.set(
          "current",
          "temperature_2m,precipitation,wind_speed_10m,surface_pressure",
        );
        url.searchParams.set("timezone", "auto");

        const data = await fetchJson<Point[] | Point>(url, 10_000);
        const points = Array.isArray(data) ? data : [data];
        return chunk.map((c, i) => {
          const p = points[i];
          return {
            latitude: c.lat,
            longitude: c.lon,
            temp: num(p?.current?.temperature_2m),
            precip: num(p?.current?.precipitation),
            windSpeed: num(p?.current?.wind_speed_10m),
            pressure: num(p?.current?.surface_pressure, 1013),
          };
        });
      })(),
    );
  }

  const settled = await Promise.allSettled(chunkJobs);
  const cells: GridCell[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") cells.push(...result.value);
  }

  if (!cells.length) {
    throw new Error("National grid returned no cells");
  }

  return {
    cells,
    bbox,
    countryCode,
    countryName,
    spanDeg: Math.max(width, height),
  };
}
