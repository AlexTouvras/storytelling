export type Place = {
  id: string;
  name: string;
  admin1?: string;
  country: string;
  /** ISO 3166-1 alpha-2 when known — drives national map extent. */
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

export type BBox = readonly [number, number, number, number]; // west, south, east, north

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
  windDir: number;
  pressure: number;
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

export type EnsembleDay = {
  date: string;
  tempMaxMin: number;
  tempMaxMean: number;
  tempMaxMax: number;
  precipMin: number;
  precipMean: number;
  precipMax: number;
};

export type GridHourSeries = {
  time: string[];
  temp: number[];
  precip: number[];
  windSpeed: number[];
  windDir: number[];
  pressure: number[];
};

export type GridCell = {
  latitude: number;
  longitude: number;
  /** Snapshot values (current / selected hour). */
  temp: number;
  precip: number;
  windSpeed: number;
  pressure: number;
  windDir?: number;
  /** Hourly series for scrubber / radar (same length across cells). */
  hours?: GridHourSeries;
};

export type EnsembleHourly = {
  time: string[];
  /** Per-member temperature series (each same length as `time`). */
  members: number[][];
  min: number[];
  mean: number[];
  max: number[];
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
    pressure: number;
    isDay: boolean;
  };
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  climate?: {
    dates: string[];
    tempMeanMax: number[];
    precipMean: number[];
  };
  ensemble?: {
    memberCount: number;
    days: EnsembleDay[];
    dailyTempMaxSpread: number[];
    dailyPrecipSpread: number[];
    /** Alternate hourly temperature paths for the hours runway. */
    hourly?: EnsembleHourly;
  };
  grid?: {
    cells: GridCell[];
    bbox: BBox;
    countryCode?: string;
    countryName?: string;
    /** Shared forecast hour timestamps for the national grid scrubber. */
    times?: string[];
    /** @deprecated kept for older samples */
    spanDeg?: number;
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
  todayHours: HourlyPoint[];
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
