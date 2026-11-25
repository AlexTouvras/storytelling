import type {
  ForecastBundle,
  HourlyPoint,
  StoryAnalytics,
} from "./types";
import { weatherLabel } from "./weatherCode";

function hourOf(iso: string): number {
  const t = iso.includes("T") ? iso.slice(11, 13) : "12";
  return Number(t);
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function fmtHour(iso: string): string {
  const h = hourOf(iso);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return `${h12}${suffix}`;
}

function weekday(date: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en", {
      weekday: "short",
      timeZone: timezone,
    }).format(new Date(`${date}T12:00:00`));
  } catch {
    return date.slice(5);
  }
}

export function buildAnalytics(bundle: ForecastBundle): StoryAnalytics {
  const todayKey = dayKey(bundle.current.time);
  const today =
    bundle.daily.find((d) => d.date === todayKey) ?? bundle.daily[0];

  const nowIdx = Math.max(
    0,
    bundle.hourly.findIndex((h) => h.time >= bundle.current.time),
  );
  const nextHours = bundle.hourly.slice(nowIdx, nowIdx + 12);

  const tonightHours = bundle.hourly.filter((h) => {
    const d = dayKey(h.time);
    const hr = hourOf(h.time);
    return d === todayKey && hr >= 18;
  });

  const todayHours = bundle.hourly.filter((h) => dayKey(h.time) === todayKey);
  const daytimeHours = todayHours.filter((h) => {
    const hr = hourOf(h.time);
    return hr >= 6 && hr <= 20;
  });

  // Prefer daytime for "warmest around" so overnight leftovers don't read as noon.
  const peakHeatHour =
    maxBy(daytimeHours, (h) => h.temperature) ??
    maxBy(todayHours, (h) => h.temperature);
  const peakPrecipHour = maxBy(
    todayHours.filter((h) => h.precipProb >= 20 || h.precipMm > 0),
    (h) => h.precipProb * 10 + h.precipMm,
  );

  const wettestDay = maxBy(bundle.daily, (d) => d.precipSum);
  const windiestDay = maxBy(bundle.daily, (d) => d.windGustsMax);
  const coldestNight = minBy(bundle.daily, (d) => d.tempMin);

  const precipRiskDays = bundle.daily.filter(
    (d) => d.precipProbMax >= 40 || d.precipSum >= 2,
  );
  const stormyDays = bundle.daily.filter(
    (d) => d.weatherCode >= 95 || (d.precipSum >= 8 && d.windGustsMax >= 50),
  );

  let tempAnomalyToday: number | null = null;
  let precipAnomalyToday: number | null = null;
  if (bundle.climate?.tempMeanMax?.[0] != null) {
    const base = bundle.climate.tempMeanMax[0];
    if (Number.isFinite(base)) tempAnomalyToday = today.tempMax - base;
  }
  if (bundle.climate?.precipMean?.[0] != null) {
    const base = bundle.climate.precipMean[0];
    if (Number.isFinite(base)) precipAnomalyToday = today.precipSum - base;
  }

  const firstHalf = bundle.daily.slice(0, 3);
  const secondHalf = bundle.daily.slice(3, 7);
  const avg = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const warmShift =
    avg(secondHalf.map((d) => (d.tempMax + d.tempMin) / 2)) -
    avg(firstHalf.map((d) => (d.tempMax + d.tempMin) / 2));
  const wetShift =
    avg(secondHalf.map((d) => d.precipSum)) -
    avg(firstHalf.map((d) => d.precipSum));

  let trendPhrase = "The week ahead stays broadly similar day to day.";
  if (Math.abs(warmShift) >= 2 && wetShift > 1.5) {
    trendPhrase =
      warmShift > 0
        ? "Later days trend warmer and wetter than the start of the week."
        : "Later days trend cooler and wetter than the start of the week.";
  } else if (Math.abs(warmShift) >= 2) {
    trendPhrase =
      warmShift > 0
        ? "Temperatures lean warmer later in the week."
        : "Temperatures lean cooler later in the week.";
  } else if (wetShift > 1.5) {
    trendPhrase = "Rain chances build later in the week.";
  } else if (wetShift < -1.5) {
    trendPhrase = "The wetter stretch is early; later days look drier.";
  }

  const spreads = bundle.ensemble?.dailyTempMaxSpread?.filter((v) =>
    Number.isFinite(v),
  );
  const tempSpreadAvg =
    spreads && spreads.length ? avg(spreads) : null;

  const reasons: string[] = [];
  let score = 78;
  if (tempSpreadAvg != null) {
    if (tempSpreadAvg <= 2) {
      score += 10;
      reasons.push(
        `Ensemble members agree closely on highs (≈${tempSpreadAvg.toFixed(1)}° spread).`,
      );
    } else if (tempSpreadAvg <= 4) {
      score += 2;
      reasons.push(
        `Moderate ensemble spread on highs (≈${tempSpreadAvg.toFixed(1)}°).`,
      );
    } else {
      score -= 14;
      reasons.push(
        `Models disagree on highs (≈${tempSpreadAvg.toFixed(1)}° spread) — treat later days as a range.`,
      );
    }
  } else {
    reasons.push(
      "Ensemble spread is unavailable right now, so this score leans on how far out the forecast goes.",
    );
  }

  const farWet = bundle.daily
    .slice(7)
    .some((d) => d.precipProbMax >= 50);
  if (farWet) {
    score -= 8;
    reasons.push(
      "Days 8–14 still show a real chance of rain — exact timing can still move.",
    );
  }

  const precipSpread = bundle.ensemble?.dailyPrecipSpread?.filter((v) =>
    Number.isFinite(v),
  );
  if (precipSpread && avg(precipSpread) > 5) {
    score -= 6;
    reasons.push(
      "Rain totals disagree a lot across ensemble members — treat amounts as a range.",
    );
  }

  score = Math.max(35, Math.min(95, Math.round(score)));
  const label =
    score >= 80 ? "High" : score >= 60 ? "Moderate" : "Lower";

  const practical: string[] = [];
  practical.push(
    `Right now: ${Math.round(bundle.current.temperature)}° (feels like ${Math.round(bundle.current.apparent)}°), ${weatherLabel(bundle.current.weatherCode).toLowerCase()}.`,
  );
  if (peakPrecipHour && peakPrecipHour.precipProb >= 40) {
    practical.push(
      `Highest rain chance today around ${fmtHour(peakPrecipHour.time)} (${Math.round(peakPrecipHour.precipProb)}%).`,
    );
  } else if (today.precipProbMax < 20) {
    practical.push("Today looks mostly dry — low chance of measurable rain.");
  }
  if (today.windGustsMax >= 45) {
    practical.push(
      `Gusty today (up to ${Math.round(today.windGustsMax)} km/h) — secure loose outdoor items.`,
    );
  }
  if (wettestDay && wettestDay.precipSum >= 3) {
    practical.push(
      `Wettest day in view: ${weekday(wettestDay.date, bundle.timezone)} (~${wettestDay.precipSum.toFixed(1)} mm).`,
    );
  }
  if (coldestNight && coldestNight.tempMin <= 2) {
    practical.push(
      `Coldest night: ${weekday(coldestNight.date, bundle.timezone)} (low ${Math.round(coldestNight.tempMin)}°) — watch for frost if you garden.`,
    );
  }
  if (stormyDays.length) {
    practical.push(
      `Storm risk flagged on ${stormyDays.map((d) => weekday(d.date, bundle.timezone)).join(", ")}.`,
    );
  }

  let uvAdvice: string | null = null;
  const uvMax = Math.max(...bundle.daily.slice(0, 3).map((d) => d.uvMax), 0);
  if (uvMax >= 8) {
    uvAdvice = `UV peaks near ${uvMax.toFixed(0)} in the next few days — shade and SPF in midday hours.`;
  } else if (uvMax >= 5) {
    uvAdvice = `Moderate-to-high UV (up to ${uvMax.toFixed(0)}) — midday sun protection is wise.`;
  } else if (uvMax > 0) {
    uvAdvice = `UV stays modest (max ~${uvMax.toFixed(0)}) over the next few days.`;
  }

  let aqiAdvice: string | null = null;
  if (bundle.airQuality) {
    const eu = bundle.airQuality.europeanAqi.find((v) => v != null);
    const us = bundle.airQuality.usAqi.find((v) => v != null);
    if (eu != null) {
      aqiAdvice =
        eu <= 20
          ? `Air quality looks good (European AQI ${eu}).`
          : eu <= 40
            ? `Air quality is fair (European AQI ${eu}).`
            : eu <= 60
              ? `Air quality is moderate (European AQI ${eu}) — sensitive groups may notice it.`
              : `Air quality is elevated (European AQI ${eu}) — limit prolonged outdoor exertion if you are sensitive.`;
    } else if (us != null) {
      aqiAdvice =
        us <= 50
          ? `Air quality looks good (US AQI ${us}).`
          : us <= 100
            ? `Air quality is moderate (US AQI ${us}).`
            : `Air quality is elevated (US AQI ${us}).`;
    }
  }

  return {
    nowLabel: `${Math.round(bundle.current.temperature)}° · ${weatherLabel(bundle.current.weatherCode)}`,
    nextHours,
    todayHours,
    today,
    tonightHours,
    peakHeatHour,
    peakPrecipHour,
    wettestDay,
    windiestDay,
    coldestNight,
    precipRiskDays,
    stormyDays,
    tempAnomalyToday,
    precipAnomalyToday,
    trendPhrase,
    confidence: { score, label, reasons, tempSpreadAvg },
    practical,
    uvAdvice,
    aqiAdvice,
  };
}

function maxBy<T>(items: T[], score: (item: T) => number): T | null {
  if (!items.length) return null;
  let best = items[0];
  let bestScore = score(best);
  for (let i = 1; i < items.length; i++) {
    const s = score(items[i]);
    if (s > bestScore) {
      best = items[i];
      bestScore = s;
    }
  }
  return best;
}

function minBy<T>(items: T[], score: (item: T) => number): T | null {
  if (!items.length) return null;
  let best = items[0];
  let bestScore = score(best);
  for (let i = 1; i < items.length; i++) {
    const s = score(items[i]);
    if (s < bestScore) {
      best = items[i];
      bestScore = s;
    }
  }
  return best;
}

export function formatDayLabel(date: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: timezone,
    }).format(new Date(`${date}T12:00:00`));
  } catch {
    return date;
  }
}

export function formatHourLabel(iso: string): string {
  return fmtHour(iso);
}

export type { HourlyPoint };
