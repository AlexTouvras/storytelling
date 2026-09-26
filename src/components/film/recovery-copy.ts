import pack from "../../../data/figures/where-should-the-recovery-time-sit.v1.json";
import { BUDGET_STRENGTHS, recoveryVariantIndex } from "@/components/film/recovery-frame";

/**
 * Narration for *Why don't delays die?*, one entry per beat.
 *
 * Every figure is read out of the frozen evidence pack rather than typed in, so
 * a re-freeze moves the prose with the data instead of leaving the two to drift.
 * `kind` is the badge the beat must carry; the Spec forbids an unlabelled figure
 * that looks like a network fact.
 */
export type EvidenceKind = "observed" | "calculated" | "modelled" | "illustrative";

export type RecoveryCopy = {
  kicker: string;
  title: string;
  paragraphs: string[];
  /** The one number held large beside the copy, or null when the beat has none. */
  figure: string | null;
  figureNote: string | null;
  kind: EvidenceKind | null;
  /** Qualifies a figure the reader is looking at right now, not a general limit. */
  caveat: string | null;
};

type Line = (typeof pack.lines)[number];
type Variant = Line["counterfactual"]["variants"][number];

function pct(share: number, digits = 0): string {
  return `${(share * 100).toFixed(digits)}%`;
}

function mins(value: number, digits = 2): string {
  return `${value.toFixed(digits)} min`;
}

function thousands(value: number): string {
  return value.toLocaleString("en-GB");
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function monthName(key: string): string {
  return MONTHS[Number(key.slice(5, 7)) - 1] ?? key;
}

export function recoveryLine(id: string): Line {
  const line = pack.lines.find((candidate) => candidate.id === id);
  if (!line) throw new Error(`no line ${id} in the evidence pack`);
  return line;
}

export const FOCUS_LINE = recoveryLine(pack.focus_line);

/**
 * The best of the five frozen variants — never "the optimum". The counterfactual
 * applies one allocation rule at five strengths and does not search, and on six
 * of the seven lines it is not even monotone, so the best variant is a fact about
 * this pack rather than a claim about the best possible timetable.
 */
export function bestVariant(line: Line): Variant {
  let best = line.counterfactual.variants[0];
  for (const variant of line.counterfactual.variants) {
    if (variant.strength === 0) continue;
    if (variant.curve[0].share < best.curve[0].share || best.strength === 0) {
      best = variant;
    }
  }
  return best;
}

export function currentVariant(line: Line): Variant {
  const zero = line.counterfactual.variants.find((v) => v.strength === 0);
  if (!zero) throw new Error(`line ${line.id} has no zero-strength replay`);
  return zero;
}

function bandOf(values: number[]): { low: number; high: number } {
  return { low: Math.min(...values), high: Math.max(...values) };
}

function linesOf(category: string): Line[] {
  return pack.lines.filter((line) => line.category === category);
}

/** Where each commuter line lands at its best variant. */
export const COMMUTER_FLOOR = bandOf(
  linesOf("Commuter").map((line) => bestVariant(line).curve[0].share),
);

/** Where long-distance lines already sit, before anything is moved. */
export const LONG_DISTANCE_TODAY = bandOf(
  linesOf("Long-distance").map((line) => currentVariant(line).curve[0].share),
);

/** Commuter lines that cannot reach even the worst long-distance line today. */
export const COMMUTER_LINES_SHORT_OF_LONG_DISTANCE = linesOf("Commuter").filter(
  (line) => bestVariant(line).curve[0].share > LONG_DISTANCE_TODAY.high,
).length;

const SEASON = pack.seasonality.per_month;

const CARRY_BAND = bandOf(SEASON.map((month) => month.carry_all));
const LATE_BAND = bandOf(SEASON.map((month) => month.late_share));

function peakMonths(read: (month: (typeof SEASON)[number]) => number, count: number): string[] {
  return [...SEASON]
    .sort((a, b) => read(b) - read(a))
    .slice(0, count)
    .map((month) => monthName(month.month));
}

export const SEASON_PEAK = peakMonths((m) => m.carry_all, 2);
export const COMMUTER_PEAK = peakMonths((m) => m.carry_commuter, 2);
export const LONG_DISTANCE_PEAK = peakMonths((m) => m.carry_long_distance, 2);

const SURVIVAL = pack.survival.all;
const COMMUTER_SURVIVAL = pack.survival.by_category.Commuter;
const LONG_SURVIVAL = pack.survival.by_category["Long-distance"];
const PAD_COMMUTER = pack.padding.by_category.Commuter;
const PAD_LONG = pack.padding.by_category["Long-distance"];

/** The worst leg in the pack: scheduled under its own floor and never early. */
export const TIGHTEST_LEG = pack.padding.legs.reduce((worst, leg) =>
  leg.padding_min < worst.padding_min ? leg : worst,
);

export type CopyContext = {
  /** Counterfactual strength under the reader's thumb during Act IX. */
  budget?: number;
  /** Line the reader has selected. Defaults to the focus line. */
  lineId?: string;
};

export function recoveryCopyFor(beat: number, context: CopyContext = {}): RecoveryCopy {
  const line = context.lineId ? recoveryLine(context.lineId) : FOCUS_LINE;

  switch (beat) {
    case 1:
      return {
        kicker: "One lane",
        title: "The same marks, closer",
        paragraphs: [
          `The camera settles on the ${line.label}, ${line.stops.length} stops in the order the trains run them.`,
          "Nothing is redrawn. This is the field you were already looking at, nearer.",
        ],
        figure: `${line.stops.length}`,
        figureNote: "stops",
        kind: "observed",
        caveat: null,
      };

    case 2:
      return {
        kicker: "One train",
        title: "It leaves on time and picks up five minutes",
        paragraphs: [
          "A single run, stop after stop. Marks are made in the order the train makes them, not faded up as a sheet.",
          `Five minutes is the threshold for the whole film — ${pack.method.late_threshold_min} minutes late at a stop, on a train that was not cancelled.`,
        ],
        figure: "5 min",
        figureNote: "late threshold",
        kind: "illustrative",
        caveat: "One run, chosen to teach the measurement. Every figure after this is the population.",
      };

    case 3:
      return {
        kicker: "It carries",
        title: "The delay arrives before the train recovers",
        paragraphs: [
          "Being late at one stop and being late at the next are two logged times. The gap between them is recorded, not modelled.",
          `Across the year, a delay is still there one stop later ${pct(SURVIVAL[0].median)} of the time.`,
        ],
        figure: pct(SURVIVAL[0].median),
        figureNote: "still late one stop on",
        kind: "observed",
        caveat: null,
      };

    case 4:
      return {
        kicker: "Every late train",
        title: "One run becomes a decay curve",
        paragraphs: [
          `${thousands(SURVIVAL[0].n)} late arrivals. Survival falls ${pct(SURVIVAL[0].median)} → ${pct(SURVIVAL[1].median)} → ${pct(SURVIVAL[2].median)} → ${pct(SURVIVAL[3].median)} over four stops.`,
          `The band is the spread across ${SURVIVAL[0].days} days — ${pct(SURVIVAL[0].low)} to ${pct(SURVIVAL[0].high)} at the next stop. A year is wider than a tidy window, and that width is part of the reading.`,
        ],
        figure: pct(SURVIVAL[3].median),
        figureNote: "four stops on",
        kind: "observed",
        caveat: "Samples thin past about four stops. The curve is drawn further than it should be trusted.",
      };

    case 5:
      return {
        kicker: "Two services",
        title: "A commuter delay does not die",
        paragraphs: [
          `Same marks, split once. Commuter ${pct(COMMUTER_SURVIVAL[0].median)} at the next stop against long-distance ${pct(LONG_SURVIVAL[0].median)}.`,
          `Commuter was higher on ${pack.category_head_to_head.days_higher} of ${pack.category_head_to_head.shared_days} shared days. This is not a difference you have to squint at.`,
        ],
        figure: `${pct(COMMUTER_SURVIVAL[0].median)} / ${pct(LONG_SURVIVAL[0].median)}`,
        figureNote: "commuter / long-distance",
        kind: "observed",
        caveat: null,
      };

    case 6:
      return {
        kicker: "A year of it",
        title: "The volume is a season. The survival is not.",
        paragraphs: [
          `The share of arrivals running late swings from ${pct(LATE_BAND.low, 1)} to ${pct(LATE_BAND.high, 1)} by month. Carry-over never leaves ${pct(CARRY_BAND.low)}–${pct(CARRY_BAND.high)}.`,
          `It is highest in ${SEASON_PEAK.join(" and ")} — and that is mostly a commuter effect: commuter carry-over peaks in ${COMMUTER_PEAK.join(" and ")} while long-distance peaks in ${LONG_DISTANCE_PEAK.join(" and ")}. More delays and stickier ones, at the same time.`,
        ],
        figure: `${pct(CARRY_BAND.low)}–${pct(CARRY_BAND.high)}`,
        figureNote: "carry-over, every month",
        kind: "observed",
        caveat: "Why winter is stickier is not in this data. There is no weather here, and long-distance peaks in April too.",
      };

    case 7:
      return {
        kicker: "Where the slack is",
        title: "Margin decides survival",
        paragraphs: [
          `Long-distance legs hold ${mins(PAD_LONG.median_min)} of recovery margin and ${pct(PAD_LONG.negative_share)} of them are negative. Commuter legs hold ${mins(PAD_COMMUTER.median_min)}, and ${pct(PAD_COMMUTER.negative_share)} are.`,
          `${TIGHTEST_LEG.from_name} → ${TIGHTEST_LEG.to_name} is scheduled ${mins(Math.abs(TIGHTEST_LEG.padding_min), 1)} under its own floor, and was not early once in ${thousands(TIGHTEST_LEG.n)} runs.`,
          `Across ${pack.mechanism.across_legs.legs} legs, more margin means less survival — ρ ${pack.mechanism.across_legs.spearman}, and it holds inside each service type separately.`,
        ],
        figure: `${pack.mechanism.across_legs.spearman}`,
        figureNote: "margin vs survival, across legs",
        kind: "calculated",
        caveat: `The floor is a 5th-percentile proxy, not an engineering minimum. It does not carry the finding: the ${pack.padding.negative_legs} negative legs beat their schedule on ${pack.padding.negative_legs_beating_schedule}% of runs.`,
      };

    case 8:
      return {
        kicker: "Your line",
        title: "Pick one. It behaves like the last one.",
        paragraphs: [
          `${pack.lines.length} lines, each with its own year. The margin profile and the decay curve refit to whichever you choose.`,
          "Lines in the same service type do not reliably separate, and where two do, the gap between them is a margin gap. The sameness is the finding — not a control that failed.",
        ],
        figure: `${pack.lines.length}`,
        figureNote: "lines, none ranked",
        kind: "observed",
        caveat: null,
      };

    case 9: {
      const index = recoveryVariantIndex(context.budget ?? 0);
      const variant = line.counterfactual.variants[index];
      const now = currentVariant(line);
      const strength = BUDGET_STRENGTHS[index];
      return {
        kicker: "Move the budget",
        title: "Same minutes, different places",
        paragraphs: [
          `Take this line's existing padding and re-lay it toward the legs where delay survives. Journey time is conserved exactly — ${variant.journey_time_change_min.toFixed(2)} minutes changed.`,
          strength === 0
            ? `At rest the replay reproduces what was measured: ${pct(now.curve[0].share, 1)} at the next stop. Scrub to move minutes.`
            : `At ${strength.toFixed(2)} strength: ${pct(variant.curve[0].share, 1)} at the next stop, ${variant.legs_made_tighter} legs tightened and ${variant.legs_made_slacker} slackened, largest single shift ${mins(variant.max_shift_min, 1)}.`,
        ],
        figure: pct(variant.curve[0].share, 1),
        figureNote: `at ${strength.toFixed(2)} strength`,
        kind: "modelled",
        caveat:
          "One allocation rule at five strengths, not a search for the best schedule. On six of seven lines pushing harder is not better, and every commuter line does best at a quarter or half.",
      };
    }

    case 10: {
      const best = bestVariant(line);
      const now = currentVariant(line);
      return {
        kicker: "What it costs",
        title: "So where should the recovery time sit?",
        paragraphs: [
          `Where delay survives. On ${line.label} that moves carry-over from ${pct(now.curve[0].share, 1)} to ${pct(best.curve[0].share, 1)}, bought with minutes the timetable already spends.`,
          `It does not close for commuter services. At its best variant each commuter line still carries a delay ${pct(COMMUTER_FLOOR.low)}–${pct(COMMUTER_FLOOR.high)} of the time, where long-distance lines already sit today at ${pct(LONG_DISTANCE_TODAY.low)}–${pct(LONG_DISTANCE_TODAY.high)}. ${COMMUTER_LINES_SHORT_OF_LONG_DISTANCE} of ${linesOf("Commuter").length} cannot reach even the worst long-distance line's current figure.`,
          "That is a second decision, and a harder one: buy margin, which costs journey time on every train every day, or accept that a commuter delay mostly does not die. And margin sized on a median day is sized for the wrong day.",
        ],
        figure: pct(best.curve[0].share, 1),
        figureNote: "focus line, best variant",
        kind: "modelled",
        caveat: null,
      };
    }

    default:
      return {
        kicker: "A year of arrivals",
        title: "Why don't delays die?",
        paragraphs: [
          `${thousands(pack.coverage.timetable_rows)} scheduled and actual times. ${thousands(pack.coverage.runs)} passenger runs. One country, one year.`,
          "Every mark is one train at one stop. Nothing is named yet.",
        ],
        figure: null,
        figureNote: null,
        kind: "observed",
        caveat: null,
      };
  }
}

export const RECOVERY_BEATS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const RECOVERY_ATTRIBUTION = pack.source.attribution;
export const RECOVERY_LIMITATIONS = pack.limitations;
