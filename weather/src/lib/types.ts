export type Place = {
  id: string;
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

export type WeatherCode =
  | "clear"
  | "mainlyClear"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavyRain"
  | "snow"
  | "showers"
  | "thunder"
  | "overcast";

export type HourlyPoint = {
  time: string;
  temperature: number;
  apparent: number;
  precipProb: number;
  precipMm: number;
  weatherCode: number;
  windSpeed: number;
  windGusts: number;
  uvIndex: number;
  humidity: number;
  cloudCover: number;
};

export type DailyPoint = {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  apparentMax: number;
  apparentMin: number;
  precipSum: number;
  precipProbMax: number;
  windMax: number;
  windGustsMax: number;
  uvMax: number;
  sunrise: string;
  sunset: string;
};

export type ForecastBundle = {
  fetchedAt: string;
  timezone: string;
  current: {
    time: string;
    temperature: number;
    apparent: number;
    weatherCode: number;
    windSpeed: number;
    windGusts: number;
    humidity: number;
    isDay: boolean;
  };
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  climate?: {
    tempMeanMax: number[];
    precipMean: number[];
  };
  ensemble?: {
    memberCount: number;
    dailyTempMaxSpread: number[];
    dailyPrecipSpread: number[];
  };
  airQuality?: {
    time: string[];
    europeanAqi: (number | null)[];
    usAqi: (number | null)[];
  };
};

export type StoryAnalytics = {
  nowLabel: string;
  nextHours: HourlyPoint[];
  today: DailyPoint;
  tonightHours: HourlyPoint[];
  peakHeatHour: HourlyPoint | null;
  peakPrecipHour: HourlyPoint | null;
  wettestDay: DailyPoint | null;
  windiestDay: DailyPoint | null;
  coldestNight: DailyPoint | null;
  precipRiskDays: DailyPoint[];
  stormyDays: DailyPoint[];
  tempAnomalyToday: number | null;
  precipAnomalyToday: number | null;
  trendPhrase: string;
  confidence: {
    score: number;
    label: string;
    reasons: string[];
    tempSpreadAvg: number | null;
  };
  practical: string[];
  uvAdvice: string | null;
  aqiAdvice: string | null;
};
