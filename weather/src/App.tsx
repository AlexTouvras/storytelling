import { useCallback, useEffect, useState } from "react";
import { Hero } from "./components/Hero";
import { Story } from "./components/Story";
import { loadSavedPlace, savePlace } from "./lib/location";
import { fetchForecast } from "./lib/openMeteo";
import type { ForecastBundle, Place } from "./lib/types";

/** Sensible default when the visitor has not shared a place yet. */
const FALLBACK_PLACE: Place = {
  id: "helsinki",
  name: "Helsinki",
  admin1: "Uusimaa",
  country: "Finland",
  latitude: 60.1699,
  longitude: 24.9384,
  timezone: "Europe/Helsinki",
};

export default function App() {
  const [place, setPlace] = useState<Place | null>(null);
  const [bundle, setBundle] = useState<ForecastBundle | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offlineSample, setOfflineSample] = useState(false);

  const load = useCallback(async (next: Place, opts?: { persist?: boolean }) => {
    setBusy(true);
    setError(null);
    setOfflineSample(false);
    // Optimistic: update the selected place immediately so the map recenters
    // before the forecast/grid requests finish.
    setPlace(next);
    setStatus("Loading forecast…");
    try {
      const data = await fetchForecast(next);
      setBundle(data);
      if (opts?.persist !== false) savePlace(next);
      setStatus(null);
    } catch (err) {
      console.error(err);
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      setError(
        offline
          ? "You appear offline. Showing sample forecast data so you can still browse the page."
          : "Could not load live weather. Showing sample data — try another place when the network is back.",
      );
      setOfflineSample(true);
      setBundle(sampleBundle(next));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const saved = loadSavedPlace();
    void load(saved ?? FALLBACK_PLACE, { persist: Boolean(saved) });
  }, [load]);

  const weatherCode = bundle?.current.weatherCode ?? 2;
  const isDay = bundle?.current.isDay ?? true;

  return (
    <div className="skylore">
      <Hero
        place={place}
        weatherCode={weatherCode}
        isDay={isDay}
        busy={busy}
        status={status ?? error}
        onSelect={(p) => {
          void load(p);
        }}
        onStatus={setStatus}
      />
      {bundle && place && (
        <>
          {offlineSample && (
            <div
              className="section"
              style={{ paddingTop: "1.5rem", paddingBottom: 0 }}
            >
              <p className="note" role="status">
                Sample data — live Open-Meteo fetch failed or you are offline.
              </p>
            </div>
          )}
          <Story place={place} bundle={bundle} />
        </>
      )}
    </div>
  );
}

function sampleBundle(place: Place): ForecastBundle {
  const today = new Date();
  const day = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  const hour = (offsetH: number) => {
    const d = new Date(today);
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + offsetH);
    return d.toISOString().slice(0, 16);
  };

  const daily = Array.from({ length: 14 }, (_, i) => ({
    date: day(i),
    weatherCode: i === 2 ? 61 : i === 5 ? 95 : 3,
    tempMax: 5 + (i % 4),
    tempMin: -1 + (i % 3),
    apparentMax: 3 + (i % 4),
    apparentMin: -3 + (i % 3),
    precipSum: i === 2 ? 6.2 : i === 5 ? 9.1 : 0.4,
    precipProbMax: i === 2 || i === 5 ? 70 : 20,
    windMax: 20 + i,
    windGustsMax: 35 + i * 2,
    uvMax: 1.5,
    sunrise: `${day(i)}T08:10`,
    sunset: `${day(i)}T16:05`,
  }));

  const span = 1.6;
  const step = span / 4;

  return {
    fetchedAt: new Date().toISOString(),
    timezone: place.timezone ?? "UTC",
    current: {
      time: hour(0),
      temperature: 4,
      apparent: 1,
      weatherCode: 3,
      windSpeed: 18,
      windGusts: 32,
      humidity: 78,
      pressure: 1012,
      isDay: true,
    },
    hourly: Array.from({ length: 48 }, (_, i) => ({
      time: hour(i),
      temperature: 4 + Math.sin(i / 5) * 3,
      apparent: 1 + Math.sin(i / 5) * 3,
      precipProb: i > 8 && i < 14 ? 55 : 15,
      precipMm: i > 8 && i < 14 ? 0.4 : 0,
      weatherCode: i > 8 && i < 14 ? 61 : 3,
      windSpeed: 14 + (i % 5),
      windGusts: 28 + (i % 7),
      windDir: 220 + i,
      pressure: 1012 - Math.sin(i / 8) * 4,
      uvIndex: i > 8 && i < 16 ? 1.2 : 0,
      humidity: 75,
      cloudCover: 80,
    })),
    daily,
    climate: {
      dates: daily.map((d) => d.date),
      tempMeanMax: Array.from({ length: 14 }, (_, i) => 3.5 + (i % 3) * 0.2),
      precipMean: Array.from({ length: 14 }, () => 1.2),
    },
    ensemble: {
      memberCount: 10,
      days: Array.from({ length: 7 }, (_, i) => ({
        date: day(i),
        tempMaxMin: 3 + (i % 3) - 1.2,
        tempMaxMean: 5 + (i % 4),
        tempMaxMax: 5 + (i % 4) + 1.5 + i * 0.2,
        precipMin: 0,
        precipMean: i === 2 ? 5 : 0.5,
        precipMax: i === 2 ? 9 : 1.5 + i * 0.3,
      })),
      dailyTempMaxSpread: Array.from({ length: 7 }, (_, i) => 1.5 + i * 0.4),
      dailyPrecipSpread: Array.from({ length: 7 }, (_, i) => 1 + i * 0.6),
    },
    grid: {
      spanDeg: span,
      cells: Array.from({ length: 25 }, (_, i) => {
        const row = Math.floor(i / 5);
        const col = i % 5;
        return {
          latitude: place.latitude - span / 2 + row * step,
          longitude: place.longitude - span / 2 + col * step,
          temp: 2 + row * 0.4 + col * 0.2,
          precip: (row + col) % 4 === 0 ? 0.6 : 0,
          windSpeed: 12 + col * 2,
          pressure: 1010 + row,
        };
      }),
    },
    airQuality: {
      time: Array.from({ length: 24 }, (_, i) => hour(i)),
      europeanAqi: Array.from({ length: 24 }, (_, i) => 18 + (i % 5)),
      usAqi: Array.from({ length: 24 }, (_, i) => 30 + (i % 6)),
    },
  };
}
