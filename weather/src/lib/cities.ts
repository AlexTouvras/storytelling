/** Curated city labels for the national map — keyless, no geocoder. */
export type CityLabel = {
  name: string;
  lat: number;
  lon: number;
  major?: boolean;
};

const BY_COUNTRY: Record<string, CityLabel[]> = {
  FI: [
    { name: "Helsinki", lat: 60.17, lon: 24.94, major: true },
    { name: "Tampere", lat: 61.5, lon: 23.79 },
    { name: "Turku", lat: 60.45, lon: 22.27 },
    { name: "Oulu", lat: 65.01, lon: 25.47, major: true },
    { name: "Rovaniemi", lat: 66.5, lon: 25.73 },
    { name: "Kuopio", lat: 62.89, lon: 27.68 },
  ],
  SE: [
    { name: "Stockholm", lat: 59.33, lon: 18.07, major: true },
    { name: "Gothenburg", lat: 57.71, lon: 11.97 },
    { name: "Malmö", lat: 55.61, lon: 13.0 },
    { name: "Umeå", lat: 63.83, lon: 20.26 },
  ],
  NO: [
    { name: "Oslo", lat: 59.91, lon: 10.75, major: true },
    { name: "Bergen", lat: 60.39, lon: 5.32 },
    { name: "Trondheim", lat: 63.43, lon: 10.4 },
  ],
  GB: [
    { name: "London", lat: 51.51, lon: -0.13, major: true },
    { name: "Manchester", lat: 53.48, lon: -2.24 },
    { name: "Edinburgh", lat: 55.95, lon: -3.19, major: true },
    { name: "Cardiff", lat: 51.48, lon: -3.18 },
    { name: "Belfast", lat: 54.6, lon: -5.93 },
  ],
  UK: [
    { name: "London", lat: 51.51, lon: -0.13, major: true },
    { name: "Manchester", lat: 53.48, lon: -2.24 },
    { name: "Edinburgh", lat: 55.95, lon: -3.19, major: true },
  ],
  DE: [
    { name: "Berlin", lat: 52.52, lon: 13.41, major: true },
    { name: "Hamburg", lat: 53.55, lon: 9.99 },
    { name: "Munich", lat: 48.14, lon: 11.58 },
    { name: "Cologne", lat: 50.94, lon: 6.96 },
  ],
  FR: [
    { name: "Paris", lat: 48.86, lon: 2.35, major: true },
    { name: "Lyon", lat: 45.76, lon: 4.84 },
    { name: "Marseille", lat: 43.3, lon: 5.37 },
    { name: "Bordeaux", lat: 44.84, lon: -0.58 },
  ],
  US: [
    { name: "New York", lat: 40.71, lon: -74.01, major: true },
    { name: "Chicago", lat: 41.88, lon: -87.63 },
    { name: "Denver", lat: 39.74, lon: -104.99 },
    { name: "Seattle", lat: 47.61, lon: -122.33 },
    { name: "Atlanta", lat: 33.75, lon: -84.39 },
  ],
  CA: [
    { name: "Toronto", lat: 43.65, lon: -79.38, major: true },
    { name: "Vancouver", lat: 49.28, lon: -123.12 },
    { name: "Montreal", lat: 45.5, lon: -73.57 },
  ],
  AU: [
    { name: "Sydney", lat: -33.87, lon: 151.21, major: true },
    { name: "Melbourne", lat: -37.81, lon: 144.96 },
    { name: "Brisbane", lat: -27.47, lon: 153.03 },
  ],
  JP: [
    { name: "Tokyo", lat: 35.68, lon: 139.76, major: true },
    { name: "Osaka", lat: 34.69, lon: 135.5 },
    { name: "Sapporo", lat: 43.06, lon: 141.35 },
  ],
  NL: [
    { name: "Amsterdam", lat: 52.37, lon: 4.9, major: true },
    { name: "Rotterdam", lat: 51.92, lon: 4.48 },
  ],
  ES: [
    { name: "Madrid", lat: 40.42, lon: -3.7, major: true },
    { name: "Barcelona", lat: 41.39, lon: 2.17 },
    { name: "Seville", lat: 37.39, lon: -5.99 },
  ],
  IT: [
    { name: "Rome", lat: 41.9, lon: 12.5, major: true },
    { name: "Milan", lat: 45.46, lon: 9.19 },
    { name: "Naples", lat: 40.85, lon: 14.27 },
  ],
  PL: [
    { name: "Warsaw", lat: 52.23, lon: 21.01, major: true },
    { name: "Kraków", lat: 50.06, lon: 19.94 },
  ],
  EE: [
    { name: "Tallinn", lat: 59.44, lon: 24.75, major: true },
    { name: "Tartu", lat: 58.38, lon: 26.73 },
  ],
  LV: [{ name: "Riga", lat: 56.95, lon: 24.11, major: true }],
  LT: [{ name: "Vilnius", lat: 54.69, lon: 25.28, major: true }],
  DK: [
    { name: "Copenhagen", lat: 55.68, lon: 12.57, major: true },
    { name: "Aarhus", lat: 56.16, lon: 10.2 },
  ],
  IE: [
    { name: "Dublin", lat: 53.35, lon: -6.26, major: true },
    { name: "Cork", lat: 51.9, lon: -8.47 },
  ],
  CH: [
    { name: "Zürich", lat: 47.38, lon: 8.54, major: true },
    { name: "Geneva", lat: 46.2, lon: 6.14 },
  ],
  AT: [
    { name: "Vienna", lat: 48.21, lon: 16.37, major: true },
    { name: "Salzburg", lat: 47.81, lon: 13.04 },
  ],
  BE: [
    { name: "Brussels", lat: 50.85, lon: 4.35, major: true },
    { name: "Antwerp", lat: 51.22, lon: 4.4 },
  ],
  PT: [
    { name: "Lisbon", lat: 38.72, lon: -9.14, major: true },
    { name: "Porto", lat: 41.15, lon: -8.61 },
  ],
};

export function citiesForCountry(
  countryCode?: string | null,
  focus?: { name: string; lat: number; lon: number },
): CityLabel[] {
  const code = (countryCode || "").toUpperCase();
  const list = [...(BY_COUNTRY[code] ?? [])];
  if (focus) {
    const near = list.some(
      (c) =>
        Math.abs(c.lat - focus.lat) < 0.35 && Math.abs(c.lon - focus.lon) < 0.35,
    );
    if (!near) {
      list.unshift({
        name: focus.name,
        lat: focus.lat,
        lon: focus.lon,
        major: true,
      });
    }
  }
  return list;
}
