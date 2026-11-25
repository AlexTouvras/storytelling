import type { WeatherCode } from "./types";

export function classifyWeather(code: number): WeatherCode {
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "mainlyClear";
  if (code === 3) return "overcast";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code >= 61 && code <= 67) return code >= 65 ? "heavyRain" : "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "showers";
  if (code >= 85 && code <= 86) return "snow";
  if (code >= 95) return "thunder";
  return "overcast";
}

export function weatherLabel(code: number): string {
  const map: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Dense drizzle",
    56: "Freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight showers",
    81: "Showers",
    82: "Violent showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with heavy hail",
  };
  return map[code] ?? `Code ${code}`;
}

export function atmosphereTheme(code: number, isDay: boolean) {
  const kind = classifyWeather(code);
  if (kind === "thunder") {
    return {
      sky: ["#1a2233", "#2a3548", "#4a5568"],
      accent: "#f0c36a",
      particle: "storm",
      mood: "charged",
    } as const;
  }
  if (kind === "snow") {
    return {
      sky: ["#6b7c93", "#9aabbe", "#d5dde8"],
      accent: "#e8f0ff",
      particle: "snow",
      mood: "quiet",
    } as const;
  }
  if (kind === "rain" || kind === "heavyRain" || kind === "showers" || kind === "drizzle") {
    return {
      sky: ["#2f3f52", "#4a6278", "#7a93a8"],
      accent: "#8ec5d8",
      particle: "rain",
      mood: "wet",
    } as const;
  }
  if (kind === "fog" || kind === "overcast") {
    return {
      sky: ["#5a6674", "#7d8896", "#a8b2bf"],
      accent: "#c9d2dc",
      particle: "mist",
      mood: "soft",
    } as const;
  }
  if (!isDay) {
    return {
      sky: ["#0b1324", "#16233a", "#2a3f5f"],
      accent: "#d4b483",
      particle: "stars",
      mood: "night",
    } as const;
  }
  if (kind === "clear") {
    return {
      sky: ["#3a7ca5", "#6fa8c9", "#c9e4f2"],
      accent: "#f2c14e",
      particle: "sun",
      mood: "bright",
    } as const;
  }
  return {
    sky: ["#4a7d9a", "#7ea9c2", "#d2e6f0"],
    accent: "#e8c36a",
    particle: "sun",
    mood: "fair",
  } as const;
}
