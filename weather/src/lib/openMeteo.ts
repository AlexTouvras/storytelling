import type { DailyPoint, ForecastBundle, HourlyPoint, Place } from "./types";

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

async function fetchJson<T>(url: URL): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export async function fetchForecast(place: Place): Promise<ForecastBundle> {
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
      is_day: number;
    };
    hourly: Parameters<typeof zipHourly>[0];
    daily: Parameters<typeof zipDaily>[0];
  };

  const forecast = await fetchJson<ForecastResponse>(forecastUrl);

  const bundle: ForecastBundle = {
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
      isDay: forecast.current.is_day === 1,
    },
    hourly: zipHourly(forecast.hourly),
    daily: zipDaily(forecast.daily),
  };

  const extras = await Promise.allSettled([
    fetchYearAgoBaseline(place, bundle.daily.length),
    fetchEnsemble(place),
    fetchAirQuality(place),
  ]);

  if (extras[0].status === "fulfilled") bundle.climate = extras[0].value;
  if (extras[1].status === "fulfilled") bundle.ensemble = extras[1].value;
  if (extras[2].status === "fulfilled") bundle.airQuality = extras[2].value;

  return bundle;
}

/** Same calendar window last year — a light seasonal baseline (not a 30-year normal). */
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
      temperature_2m_max: number[];
      precipitation_sum: number[];
    };
  }>(hist);

  return {
    tempMeanMax: data.daily.temperature_2m_max.map((v) => num(v, NaN)),
    precipMean: data.daily.precipitation_sum.map((v) => num(v, NaN)),
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

  const tempKeys = Object.keys(daily).filter((k) =>
    k.startsWith("temperature_2m_max"),
  );
  const precipKeys = Object.keys(daily).filter((k) =>
    k.startsWith("precipitation_sum"),
  );

  const dayCount =
    (daily.time as string[] | undefined)?.length ??
    (daily[tempKeys[0]] as number[] | undefined)?.length ??
    0;

  const dailyTempMaxSpread: number[] = [];
  const dailyPrecipSpread: number[] = [];

  for (let i = 0; i < dayCount; i++) {
    const temps = tempKeys
      .map((k) => num((daily[k] as number[])?.[i], NaN))
      .filter((v) => Number.isFinite(v));
    const precips = precipKeys
      .map((k) => num((daily[k] as number[])?.[i], NaN))
      .filter((v) => Number.isFinite(v));
    dailyTempMaxSpread.push(
      temps.length ? Math.max(...temps) - Math.min(...temps) : NaN,
    );
    dailyPrecipSpread.push(
      precips.length ? Math.max(...precips) - Math.min(...precips) : NaN,
    );
  }

  return {
    memberCount: Math.max(tempKeys.length, precipKeys.length, 1),
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
