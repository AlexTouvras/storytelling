import pack from "../../../data/figures/how-much-fast-reserve.v1.json";
import type { GridFilmData } from "@/components/film/GridFilm";
import { LIGHT_LINE_GWS } from "@/components/film/grid-copy";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * The slices of the pack the film draws, taken on the server so the client
 * does not ship the whole pack.
 */
export function gridFilmData(): GridFilmData {
  const trace = pack.featured_event.trace;
  const event = pack.featured_event.event;
  const toSeconds = (local: string) => {
    const [, time] = local.split(" ");
    const [h, m, s] = time.split(":").map(Number);
    return h * 3600 + m * 60 + s;
  };
  const start = toSeconds(trace.start);
  const onsetSeconds = Math.round((toSeconds(event.onset) - start) * 10) / 10;

  const startUtc = Date.parse(pack.hours.start_utc.replace("Z", ":00Z"));
  const months: GridFilmData["months"] = [];
  for (let i = 0; i < pack.hours.kinetic_gws.length; i++) {
    const d = new Date(startUtc + i * 3_600_000);
    if (d.getUTCDate() !== 1 || d.getUTCHours() !== 0 || d.getUTCMonth() % 3 !== 1) continue;
    const month = MONTHS[d.getUTCMonth()];
    months.push({ index: i, label: d.getUTCMonth() === 1 || months.length === 0 ? `${month} ${d.getUTCFullYear()}` : month });
  }

  return {
    trace: trace.filtered_hz,
    sampleSeconds: trace.sample_seconds,
    onsetSeconds,
    nadirSeconds: Math.round((onsetSeconds + event.nadir_s) * 10) / 10,
    nadirHz: event.nadir,
    onsetClock: event.onset.split(" ")[1].slice(0, 8),
    hours: pack.hours.kinetic_gws,
    reserveHours: pack.hours.ffr_procured.map(([index]) => index),
    featuredHour: event.hour_index,
    featuredGWs: event.kinetic_gws,
    months,
    lightLineGWs: LIGHT_LINE_GWS,
  };
}
