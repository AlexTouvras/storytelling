/**
 * Narration for *When the spinning stops*. Every figure is formatted out of the
 * frozen pack, the model modules or the illustration's constants, so a
 * re-freeze moves the sentences with the data. At most one figure a sentence.
 */

import pack from "../../../data/figures/how-much-fast-reserve.v1.json";
import type { EvidenceKind } from "@/lib/reader/kinds";
import type { BeatText } from "@/lib/reader/terms";
import { FLOOR_HZ } from "@/lib/sim/grid-frequency";
import { checkTrip, summarise, type ObservedTrip } from "@/lib/sim/grid-validation";
import { GRID_HOURS, GRID_LOSS_MW, GRID_RESERVE_MW } from "@/illustrations/grid";

export type GridCopy = BeatText & {
  kicker: string;
  title: string;
  kind: EvidenceKind;
  figure?: string;
  figureNote?: string;
  caveat?: string;
};

const n = (x: number, digits = 0) =>
  x.toLocaleString("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });

type Published = { id: string; value: Record<string, unknown> };
const published = (id: string) => (pack.published.figures as unknown as Published[]).find((f) => f.id === id)!.value;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function monthLabel(yyyymm: string): string {
  return `${MONTHS[Number(yyyymm.slice(5, 7)) - 1]} ${yyyymm.slice(0, 4)}`;
}

function dayLabel(local: string): string {
  const [date] = local.split(" ");
  const [y, m, d] = date.split("-").map(Number);
  return `${d} ${FULL_MONTHS[m - 1]} ${y}`;
}

const clock = (local: string, withSeconds = false) => {
  const time = local.split(" ")[1];
  return withSeconds ? time.slice(0, 8) : time.slice(0, 5);
};

/**
 * Hours below the operators' light-hour line in UTC months `from`..`to`,
 * inclusive. Read from the pack's monthly counts, which are taken before the
 * hourly series is rounded for the field, so they match the yearly counts.
 */
export function hoursBelow150(from: string, to: string): number {
  return pack.years.months
    .filter((m) => m.month >= from && m.month <= to)
    .reduce((sum, m) => sum + m.hours_below_150, 0);
}

/** The lowest band edge from which Fingrid bought no fast reserve in any hour. */
export function noReserveAbove(): number {
  const bands = pack.ffr_by_kinetic.window;
  for (let i = 0; i < bands.length; i++) {
    if (bands.slice(i).every((b) => b.share_procured === 0)) return bands[i].from_gws;
  }
  return bands[bands.length - 1].to_gws;
}

export const LIGHT_LINE_GWS = (published("design-kinetic") as { gws: number }).gws;

let validation: ReturnType<typeof summarise> | null = null;
export function gridValidation() {
  if (!validation) {
    const trips: ObservedTrip[] = pack.events.all.filter((e) => e.class === "trip");
    validation = summarise(trips.map((t) => checkTrip(t)).filter((c) => c !== null));
  }
  return validation;
}

export const GRID_FEATURED = pack.featured_event.event;

export const GRID_FILM = {
  window: `${monthLabel(pack.method.window.first_month)} – ${monthLabel(pack.method.window.last_month)}`,
  hours: pack.hours.kinetic_gws.length,
  lightHours: hoursBelow150(pack.method.window.first_month, pack.method.window.last_month),
  summer2026: hoursBelow150("2026-05", "2026-07"),
  trips: pack.events.summary.trips,
  noReserveAbove: noReserveAbove(),
  reserveShare120: pack.ffr_by_kinetic.window.find((b) => b.from_gws === 120)!.share_procured,
  publishedLast: (() => {
    const years = Object.keys(pack.years.published_hours_below_150).sort();
    const year = years[years.length - 1];
    return { year, hours: (pack.years.published_hours_below_150 as Record<string, number>)[year] };
  })(),
  massForTenth: published("mass-for-tenth") as { extra_gws: number; hz: number; at_gws: number },
} as const;

export const GRID_BEATS = ["Fifty", "A trip", "Inside the hour", "Fewer wheels", "Every hour", "Catch it faster"] as const;

export function gridCopyFor(beat: number): GridCopy {
  const e = GRID_FEATURED;
  switch (beat) {
    case 0:
      return {
        kicker: `${dayLabel(pack.featured_event.trace.start)} · ${clock(pack.featured_event.trace.start)} Finnish time`,
        title: "The grid turns at fifty.",
        kind: "observed",
        paragraphs: [
          "Every generator in the Nordic grid turns in step, and the frequency says how fast. Fifty turns a second, 50 Hz, is normal.",
          "This is one real minute of it, measured ten times a second. It is never exactly still.",
        ],
      };
    case 1:
      return {
        kicker: `${clock(e.onset, true)} Finnish time`,
        title: "Then a power plant drops out.",
        kind: "observed",
        paragraphs: [
          `That is a trip. The frequency falls for ${n(e.nadir_s, 1)} seconds. Its lowest point is ${n(e.nadir, 2)} Hz.`,
          `The floor the operators allow is ${n(FLOOR_HZ, 1)} Hz. The grid held well above it, as it did in all ${GRID_FILM.trips} trips we found in a year.`,
        ],
        figure: `${n(e.nadir, 2)} Hz`,
        figureNote: "lowest point · observed",
      };
    case 2:
      return {
        kicker: "Inside the hour · illustration",
        title: "The fall is spinning mass giving up energy.",
        kind: "illustrative",
        paragraphs: [
          "Each wheel stands for generators turning in step. Their spinning mass stores energy. When one plant drops out, the rest give up some of it to cover the gap, and the whole shaft slows.",
          "Within seconds a slower reserve ramps up and stops the fall. How far it gets first depends on how much mass is spinning.",
        ],
      };
    case 3:
      return {
        kicker: `${GRID_HOURS.typical} against ${GRID_HOURS.light} GWs · modelled`,
        title: "Less mass, the same loss: a faster, deeper fall.",
        kind: "modelled",
        paragraphs: [
          "A light hour is windy or sunny, with few big plants running, so less mass is spinning. This one has about half as much: the operators' test case.",
          `Now the largest trip the grid is designed for, ${n(GRID_LOSS_MW)} MW, falls through the floor.`,
          `Add ${n(GRID_RESERVE_MW)} MW of fast reserve that switches on within a second, and the same fall stops above it.`,
        ],
        caveat: `Modelled design case, drawn as a shape. Our model falls about ${n(gridValidation().medianDepthRatio, 1)}× deeper than the real trips did, as a sizing case should.`,
      };
    case 4:
      return {
        kicker: `${GRID_FILM.window} · ${n(GRID_FILM.hours)} hours`,
        title: "Light hours are few, and that is where fast reserve is bought.",
        kind: "calculated",
        paragraphs: [
          `Each dot is one hour, placed by how much mass was spinning. ${n(GRID_FILM.lightHours)} hours fell below ${LIGHT_LINE_GWS} GWs, the operators' line for a light hour.`,
          `Fingrid bought fast reserve in ${Math.round(GRID_FILM.reserveShare120 * 100)}% of the hours at 120–140 GWs. Above ${GRID_FILM.noReserveAbove} GWs it bought none.`,
          `The ringed dot is the hour of the trip, at ${n(e.kinetic_gws, 0)} GWs.`,
        ],
        figure: n(GRID_FILM.lightHours),
        figureNote: `hours below ${LIGHT_LINE_GWS} GWs · calculated`,
      };
    default:
      return {
        kicker: "The decision · published",
        title: "Buy speed, not mass.",
        kind: "published",
        paragraphs: [
          `On a very light hour, about ${n(GRID_RESERVE_MW)} MW of fast reserve holds the floor after the largest trip.`,
          `Lifting the lowest point by ${GRID_FILM.massForTenth.hz} Hz with mass instead takes about ${GRID_FILM.massForTenth.extra_gws} GWs more of it spinning.`,
          `And light hours are growing. The operators counted ${n(GRID_FILM.publishedLast.hours)} of them in ${GRID_FILM.publishedLast.year}. We count ${n(GRID_FILM.summer2026)} in May–July 2026 alone.`,
        ],
        figure: `${n(GRID_RESERVE_MW)} MW`,
        figureNote: `against ${GRID_FILM.massForTenth.extra_gws} GWs of mass · published`,
      };
  }
}

export function gridNarration(): GridCopy[] {
  return GRID_BEATS.map((_, beat) => gridCopyFor(beat));
}

export type GridDecision = {
  title: string;
  paragraphs: string[];
  trendCaption: string;
  trend: { period: string; hours: number; kind: EvidenceKind }[];
  notClaimed: string[];
  events: number;
  attribution: string;
};

export function gridDecision(): GridDecision {
  const publishedYears = pack.years.published_hours_below_150 as Record<string, number>;
  const ours = (year: number) => pack.years.kinetic.find((y) => y.year === year);
  const lastPublished = Number(GRID_FILM.publishedLast.year);
  const recent = Object.keys(publishedYears)
    .map(Number)
    .filter((y) => y >= lastPublished - 2)
    .sort();
  const nextYear = ours(lastPublished + 1);
  const tenth = GRID_FILM.massForTenth;
  return {
    title: "Size fast reserve to the hour's spinning mass, and watch the light hours.",
    paragraphs: [
      `Fingrid already buys fast reserve by the hour: in ${Math.round(GRID_FILM.reserveShare120 * 100)}% of the lightest hours, and none above ${GRID_FILM.noReserveAbove} GWs. The open question is volume, because light hours are becoming more common.`,
      `The other way to hold the floor is to keep more mass spinning, with synchronous condensers or thermal plants kept online. By the operators' figures, lifting the lowest point by ${tenth.hz} Hz that way takes about ${tenth.extra_gws} GWs more of it. About ${n(GRID_RESERVE_MW)} MW of fast reserve holds the floor in their test case for a very light hour.`,
      "Light hours move with wind, water and sun from one year to the next, so one summer is not a forecast. It is a reason to size reserve to the hour rather than to the year.",
    ],
    trendCaption: "Hours below 150 GWs: the operators' published counts, then ours from Fingrid's real-time estimate",
    trend: [
      ...recent.map((y) => ({ period: String(y), hours: publishedYears[String(y)], kind: "published" as const })),
      ...(nextYear ? [{ period: String(nextYear.year), hours: nextYear.hours_below_150, kind: "calculated" as const }] : []),
      { period: "May–July 2026", hours: GRID_FILM.summer2026, kind: "calculated" as const },
    ],
    notClaimed: [
      `The grid held every time: no event in ${GRID_FILM.window} came near ${n(FLOOR_HZ, 1)} Hz. This is a story about margin, not a near-miss.`,
      "We do not say which unit tripped on any day; the open data does not.",
      "The modelled curves are a design case drawn as shapes. They are never a prediction of a real trip.",
      "Finland's fast reserve is one share of a Nordic need.",
    ],
    events: pack.events.all.length,
    attribution: `${pack.sources["fingrid-339"].attribution}. Published thresholds: Nordic TSOs 2025, FFR design 2024, Ørum et al. 2017. Not affiliated with, and not endorsed by, Fingrid or any Nordic operator.`,
  };
}
