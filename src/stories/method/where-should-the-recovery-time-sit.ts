import pack from "../../../data/figures/where-should-the-recovery-time-sit.v1.json";
import type { MethodSection, StoryMethod } from "@/lib/reader/method";
import { bestVariant, currentVariant } from "@/components/film/recovery-copy";

const pct = (share: number, digits = 1) => `${(share * 100).toFixed(digits)}%`;
const n = (x: number) => x.toLocaleString("en-GB");
const mins = (x: number) => `${x.toFixed(2)} min`;

function data(): MethodSection {
  const m = pack.method;
  const c = pack.coverage;
  return {
    id: "data",
    title: "Data and rules",
    kind: "observed",
    blocks: [
      {
        type: "p",
        text: `${pack.source.name}, ${pack.source.endpoint}, ${pack.source.licence}. ${m.window.days} days from ${m.window.first} to ${m.window.last}: ${n(c.timetable_rows)} timetable rows over ${n(c.runs)} passenger runs (${n(c.runs_by_category.Commuter)} commuter, ${n(c.runs_by_category["Long-distance"])} long-distance). ${pct(c.with_actual_time)} of rows carry an actual time.`,
      },
      {
        type: "list",
        items: [
          `Late: ${m.late_threshold_min} minutes or more behind schedule at a stop, on a run that was not cancelled.`,
          `Survival is followed for up to ${m.horizon_stops} stops.`,
          `Services: ${m.services.join(" and ")}. Excluded: ${m.excluded}.`,
          `Recovery margin: ${m.padding}.`,
          `A leg needs at least ${m.min_leg_observations} runs to be measured.`,
          `A line is the ${m.line}.`,
          `Timetable periods: ${m.period_detection.rule}; threshold ${m.period_detection.threshold_rule}, at least ${m.period_detection.min_period_days} days.`,
          `Margin is measured in the period ${m.padding_period.first} to ${m.padding_period.last}: the ${m.padding_period.chosen_because}.`,
        ],
      },
      {
        type: "table",
        caption: "Timetable periods found in the window",
        columns: ["From", "To", "Days", "Legs re-timed at the start"],
        rows: m.timetable_periods.map((p) => [p.first, p.last, p.days, p.shift_share_at_start === null ? "" : pct(p.shift_share_at_start)]),
      },
    ],
  };
}

function survival(): MethodSection {
  const row = (label: string, points: typeof pack.survival.all) =>
    points.map((p) => [label, p.stops_on, n(p.n), pct(p.median), `${pct(p.low)}–${pct(p.high)}`, p.days]);
  return {
    id: "survival",
    title: "Survival",
    kind: "observed",
    blocks: [
      {
        type: "p",
        text: "For every late arrival, whether the same train is still late one, two, three stops on. The median is across days; the range is the spread of daily values.",
      },
      {
        type: "table",
        columns: ["Service", "Stops on", "Late arrivals", "Median", "Daily range", "Days"],
        left: [0],
        rows: [
          ...row("All", pack.survival.all),
          ...row("Commuter", pack.survival.by_category.Commuter),
          ...row("Long-distance", pack.survival.by_category["Long-distance"]),
        ],
      },
      {
        type: "p",
        text: `Commuter survival was higher on ${pack.category_head_to_head.days_higher} of ${pack.category_head_to_head.shared_days} days both services ran. ${pack.seasonality.note}`,
      },
      {
        type: "table",
        caption: "By month",
        columns: ["Month", "Late share", "Survival, all", "Commuter", "Long-distance"],
        rows: pack.seasonality.per_month.map((m) => [m.month, pct(m.late_share), pct(m.carry_all), pct(m.carry_commuter), pct(m.carry_long_distance)]),
      },
    ],
  };
}

function margin(): MethodSection {
  const p = pack.padding;
  const tightest = [...p.legs].sort((a, b) => a.padding_min - b.padding_min).slice(0, 12);
  const change = p.timetable_change;
  return {
    id: "margin",
    title: "Recovery margin",
    kind: "calculated",
    blocks: [
      {
        type: "table",
        columns: ["Service", "Legs", "Median", "Range", "Negative legs"],
        left: [0],
        rows: Object.entries(p.by_category).map(([service, c]) => [
          service,
          c.legs,
          mins(c.median_min),
          `${mins(c.low_min)} to ${mins(c.high_min)}`,
          `${c.negative_legs} (${pct(c.negative_share)})`,
        ]),
      },
      {
        type: "p",
        text: `${p.negative_legs} legs are scheduled under their own floor, and they beat their schedule on ${p.negative_legs_beating_schedule}% of runs. Between the previous period and this one, ${change.legs_changed_half_min} of ${change.legs_compared} legs moved by half a minute or more (range ${change.range_min[0]} to ${change.range_min[1]} min). ${change.note}`,
      },
      {
        type: "table",
        caption: `The ${tightest.length} tightest of ${p.legs.length} legs`,
        columns: ["Leg", "Service", "Scheduled", "Floor", "Margin", "Beats schedule", "Runs"],
        left: [0, 1],
        rows: tightest.map((l) => [
          `${l.from_name} → ${l.to_name}`,
          l.category,
          mins(l.scheduled_min),
          mins(l.floor_min),
          mins(l.padding_min),
          pct(l.beats_schedule, 0),
          l.n,
        ]),
      },
    ],
  };
}

function mechanism(): MethodSection {
  const m = pack.mechanism;
  return {
    id: "mechanism",
    title: "Margin against survival",
    kind: "calculated",
    blocks: [
      { type: "p", text: `${m.claim} ${m.note}` },
      {
        type: "table",
        columns: ["Across", "Count", "Spearman ρ"],
        left: [0],
        rows: [
          ["Lines", m.across_lines.lines, m.across_lines.spearman],
          ["Legs", m.across_legs.legs, m.across_legs.spearman],
          ["Commuter legs", m.within_category.Commuter.legs, m.within_category.Commuter.spearman],
          ["Long-distance legs", m.within_category["Long-distance"].legs, m.within_category["Long-distance"].spearman],
        ],
      },
    ],
  };
}

function counterfactual(): MethodSection {
  const first = pack.lines[0].counterfactual;
  return {
    id: "counterfactual",
    title: "Moving the minutes",
    kind: "modelled",
    blocks: [
      { type: "p", text: `${first.method} Assumes: ${first.assumes}` },
      {
        type: "table",
        caption: "Survival at the next stop, per line. Journey time is unchanged in every variant.",
        columns: ["Line", "Service", "Today", "Best variant", "At strength", "Full strength"],
        left: [0, 1],
        rows: pack.lines.map((line) => {
          const best = bestVariant(line);
          const full = line.counterfactual.variants[line.counterfactual.variants.length - 1];
          return [
            line.label,
            line.category,
            pct(currentVariant(line).curve[0].share),
            pct(best.curve[0].share),
            best.strength,
            pct(full.curve[0].share),
          ];
        }),
      },
    ],
  };
}

export const WHERE_SHOULD_THE_RECOVERY_TIME_SIT_METHOD: StoryMethod = {
  pack,
  schema: {
    id: "Pack name.",
    version: "Pack version.",
    generated: "The day the pack was frozen.",
    source: "The open feed, its licence and the attribution it requires.",
    method: "Every rule: the late threshold, services, what a leg and a line are, the window and the timetable periods.",
    coverage: "How many rows and runs the year holds, and how many carry an actual time.",
    baseline: "Arrivals and late share for every day of the window.",
    survival: "Survival one to six stops on, for all trains and by service, with the daily range.",
    seasonality: "Late share and survival by month, all trains and by service.",
    padding: "Recovery margin for every leg, summarised by service, and how much the timetable change moved it.",
    category_head_to_head: "On how many days commuter survival beat long-distance.",
    line_separation: "Whether each pair of lines in the same service separates, day by day.",
    focus_line: "The line the film follows.",
    lines: "Each line's stops, survival, legs, margin and the counterfactual at five strengths.",
    mechanism: "The rank correlation between margin and survival, across lines, across legs and within each service.",
    limitations: "What the pack cannot support.",
  },
  sections: () => [data(), survival(), margin(), mechanism(), counterfactual()],
};
