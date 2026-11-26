import type { ForecastBundle, Place } from "../lib/types";
import { WeatherFilm } from "./WeatherFilm";

type Props = {
  place: Place;
  bundle: ForecastBundle;
};

/** Scroll film entry — Orbit-style sticky stage driven by progress. */
export function Story({ place, bundle }: Props) {
  return <WeatherFilm place={place} bundle={bundle} />;
}
