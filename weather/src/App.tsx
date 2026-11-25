import { useCallback, useEffect, useState } from "react";
import { Hero } from "./components/Hero";
import { Story } from "./components/Story";
import { loadSavedPlace, savePlace } from "./lib/location";
import { fetchForecast } from "./lib/openMeteo";
import type { ForecastBundle, Place } from "./lib/types";

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
    setStatus("Fetching the forecast story…");
    try {
      const data = await fetchForecast(next);
      setPlace(next);
      setBundle(data);
      if (opts?.persist !== false) savePlace(next);
      setStatus(null);
    } catch (err) {
      console.error(err);
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      setError(
        offline
          ? "You appear offline. Showing a sample story so you can still scroll the layout."
          : "Could not load live weather. Showing a sample story — try another place when the network is back.",
      );
      setOfflineSample(true);
      setPlace(next);
      setBundle(sampleBundle());
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

function sampleBundle(): ForecastBundle {
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

  return {
    fetchedAt: new Date().toISOString(),
    timezone: "Europe/Helsinki",
    current: {
      time: hour(0),
      temperature: 4,
      apparent: 1,
      weatherCode: 3,
      windSpeed: 18,
      windGusts: 32,
      humidity: 78,
      isDay: true,
    },
    hourly: Array.from({ length: 36 }, (_, i) => ({
      time: hour(i),
      temperature: 4 + Math.sin(i / 5) * 3,
      apparent: 1 + Math.sin(i / 5) * 3,
      precipProb: i > 8 && i < 14 ? 55 : 15,
      precipMm: i > 8 && i < 14 ? 0.4 : 0,
      weatherCode: i > 8 && i < 14 ? 61 : 3,
      windSpeed: 14 + (i % 5),
      windGusts: 28 + (i % 7),
      uvIndex: i > 8 && i < 16 ? 1.2 : 0,
      humidity: 75,
      cloudCover: 80,
    })),
    daily: Array.from({ length: 14 }, (_, i) => ({
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
    })),
    climate: {
      tempMeanMax: Array.from({ length: 14 }, () => 3.5),
      precipMean: Array.from({ length: 14 }, () => 1.2),
    },
    ensemble: {
      memberCount: 10,
      dailyTempMaxSpread: Array.from({ length: 7 }, (_, i) => 1.5 + i * 0.4),
      dailyPrecipSpread: Array.from({ length: 7 }, (_, i) => 1 + i * 0.6),
    },
    airQuality: {
      time: [hour(0)],
      europeanAqi: [22],
      usAqi: [35],
    },
  };
}
