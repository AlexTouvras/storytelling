import pack from "../../../data/figures/how-much-fast-reserve.v1.json";
import type { MethodSection, StoryMethod } from "@/lib/reader/method";
import {
  FFR_OPTIONS,
  GRID_CALIBRATION_TARGETS,
  GRID_MODEL,
  simulateTrip,
} from "@/lib/sim/grid-frequency";
import { checkTrip, summarise, type ObservedTrip } from "@/lib/sim/grid-validation";

const n = (x: number, digits = 0) =>
  x.toLocaleString("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const pct = (share: number) => `${Math.round(share * 100)}%`;

export const GRID_CLASS_NAMES: Record<string, string> = {
  trip: "Trip",
  "schedule-step": "Schedule step",
  gap: "Gap",
  "step-artifact": "Held-then-jump",
  shallow: "Shallow",
  "snap-back": "Snap-back",
  "fast-dip": "Fast dip",
};

type Source = { name: string; url: string; licence?: string };

function sources(): MethodSection {
  const all = pack.sources as Record<string, Source>;
  const used: Record<string, string> = {
    "fingrid-339": "Every frequency event and the featured trace",
    "fingrid-260": "The spinning mass of every hour; the mass at each event",
    "fingrid-276": "Which hours Fingrid bought fast reserve in, and how much",
    "nordic-tsos-2025": "The floor, the largest trip, the design points, the yearly counts",
    "ffr-design-2024": "About 300 MW of fast reserve at 100 GWs",
    "orum-2017": "About 20 GWs of extra mass per 0.1 Hz",
    "fingrid-ffr": "The fast reserve product: activation points and times",
  };
  const months = pack.coverage.months;
  const gappy = months.filter((m) => m.gap_share > 0);
  return {
    id: "data",
    title: "Data sources",
    blocks: [
      {
        type: "table",
        columns: ["Source", "Licence", "Used for"],
        left: [0, 1, 2],
        rows: Object.entries(all).map(([id, s]) => [`${s.name} · ${s.url}`, s.licence ?? "cited", used[id] ?? ""]),
      },
      {
        type: "p",
        text: `Window: ${pack.method.window.first_month} to ${pack.method.window.last_month}, ${n(pack.coverage.kinetic_hours_in_window)} hours. ${n(pack.coverage.samples)} frequency samples at 10 a second; ${gappy.length === 0 ? "no month has missing samples" : `${gappy.length} of ${months.length} months have missing samples, held at the last good value`}. Kinetic energy covers ${pack.coverage.kinetic_months} months since 2020, for the yearly counts.`,
      },
      {
        type: "p",
        text: "Time zones: the 10 Hz archive is in Finnish local time (29 March 2026 has no 03:00 hour), and the API datasets are UTC. Every event carries both, and events are paired with their hour on UTC.",
      },
      {
        type: "table",
        caption: "Frequency samples by month",
        columns: ["Month", "Samples", "Missing"],
        rows: months.map((m) => [m.month, n(m.samples), pct(m.gap_share)]),
      },
    ],
  };
}

function pipeline(): MethodSection {
  return {
    id: "pipeline",
    title: "Pipeline and how to reproduce it",
    blocks: [
      {
        type: "list",
        items: [
          "scripts/fetch-fingrid.py pulls the keyed datasets (260 kinetic energy, 276 fast reserve) into a local cache, one file per month, in 10-day ranges because the API stops paging at 40,000 rows.",
          "scripts/scan-grid-events.py downloads each month's 10 Hz archive (keyless), filters it, and lists every sustained fall.",
          "scripts/freeze-grid-inertia.py classifies each fall by its shape, pairs it with its hour, counts the hours, and writes the evidence pack.",
          "src/lib/sim/grid-frequency.ts is the frequency model; grid-validation.ts checks it against the trips in the pack.",
          "src/lib/sim/grid-evidence.test.ts checks the pack against the published figures on every test run.",
        ],
      },
      {
        type: "code",
        text: [
          "# Free key from https://data.fingrid.fi; kept in the environment, never in the repo",
          "export FINGRID_API_KEY=...",
          "python3 scripts/fetch-fingrid.py 260 2020-01 2026-07",
          "python3 scripts/fetch-fingrid.py 276 2020-01 2026-07",
          `python3 scripts/scan-grid-events.py ${monthsList()} > scan.json`,
          "python3 scripts/freeze-grid-inertia.py --scan scan.json",
          "npx vitest run src/lib/sim/grid-evidence.test.ts src/lib/sim/grid-validation.test.ts",
        ].join("\n"),
      },
    ],
  };
}

function monthsList(): string {
  return pack.coverage.months.map((m) => m.month).join(" ");
}

function events(): MethodSection {
  const classes = pack.method.classes as Record<string, string>;
  const counts = pack.events.summary.by_class as Record<string, number>;
  return {
    id: "events",
    title: "Events: what counts as a trip",
    kind: "observed",
    blocks: [
      { type: "p", text: `Filter: ${pack.method.filter}. Why: ${pack.method.why_filter}.` },
      { type: "p", text: `Detector: ${pack.method.event}. ${pack.method.on_hour}.` },
      { type: "p", text: `Times: ${pack.method.event_time}.` },
      {
        type: "p",
        text: `The detector caught ${pack.events.summary.sustained_falls} sustained falls. Each is classified by its shape; the rule was checked by eye on the borderline traces. Only trips enter the trip counts. Every event stays in the pack with its class.`,
      },
      {
        type: "table",
        caption: "Classes",
        columns: ["Class", "Rule", "Events"],
        left: [0, 1],
        rows: Object.entries(classes).map(([id, rule]) => [GRID_CLASS_NAMES[id] ?? id, rule, counts[id] ?? 0]),
      },
      {
        type: "p",
        text: `Loss size: ${pack.method.loss_estimate}. Kinetic energy at an event: ${pack.method.kinetic_at_event}.`,
      },
      {
        type: "table",
        caption: `All ${pack.events.all.length} events (onset in Finnish local time)`,
        columns: ["Onset", "Class", "Before, Hz", "Lowest, Hz", "Depth, mHz", "To lowest, s", "Mass, GWs", "Fast reserve, MW", "Est. loss, MW"],
        left: [0, 1],
        rows: pack.events.all.map((e) => [
          e.onset,
          GRID_CLASS_NAMES[e.class] ?? e.class,
          e.pre.toFixed(3),
          e.nadir.toFixed(3),
          e.depth_mHz,
          e.nadir_s.toFixed(1),
          e.kinetic_gws === null ? "—" : n(e.kinetic_gws, 1),
          e.ffr_mw === null ? "—" : n(e.ffr_mw, 1),
          e.loss_est_mw === null ? "—" : n(e.loss_est_mw),
        ]),
      },
    ],
  };
}

function hours(): MethodSection {
  const published = pack.years.published_hours_below_150 as Record<string, number>;
  const season = (s: typeof pack.pairing.apr_sep) => [
    n(s.hours),
    n(s.median_kinetic_gws, 1),
    s.trips,
    n(s.trips_per_1000_hours, 2),
    n(s.median_loss_est_mw),
  ];
  const band = (rows: typeof pack.ffr_by_kinetic.window) =>
    rows.map((r) => [`${r.from_gws}–${r.to_gws}`, n(r.hours), pct(r.share_procured), n(r.mean_mw, 1)]);
  return {
    id: "hours",
    title: "Hours and fast reserve",
    kind: "calculated",
    blocks: [
      { type: "p", text: pack.years.note },
      {
        type: "table",
        caption: "Hours below 150 GWs by year: ours from Fingrid's real-time estimate, and the operators' published count",
        columns: ["Year", "Hours", "Mean, GWs", "Lowest, GWs", "Below 150 (ours)", "Below 150 (published)", "Below 120 (ours)"],
        rows: pack.years.kinetic.map((y) => [
          y.year,
          n(y.hours),
          y.mean_gws,
          y.min_gws,
          n(y.hours_below_150),
          published[String(y.year)] === undefined ? "—" : n(published[String(y.year)]),
          y.hours_below_120,
        ]),
      },
      {
        type: "table",
        caption: "Hours below 150 GWs by month, the last 24 months: the same month two years apart is the fairest comparison, because light hours are seasonal",
        columns: ["Month", "Hours", "Below 150", "Below 120"],
        rows: pack.years.months.slice(-24).map((m) => [m.month, n(m.hours), n(m.hours_below_150), m.hours_below_120]),
      },
      {
        type: "table",
        caption: "Half-years in the window",
        columns: ["", "Hours", "Median mass, GWs", "Trips", "Trips per 1,000 hours", "Median est. loss, MW"],
        left: [0],
        rows: [
          ["April–September", ...season(pack.pairing.apr_sep)],
          ["October–March", ...season(pack.pairing.oct_mar)],
        ],
      },
      { type: "p", text: `${pack.ffr_by_kinetic.note}.` },
      {
        type: "table",
        caption: "Fast reserve bought, by the hour's spinning mass: the window",
        columns: ["GWs", "Hours", "Hours with reserve", "Mean MW"],
        left: [0],
        rows: band(pack.ffr_by_kinetic.window),
      },
      {
        type: "table",
        caption: "The same, since 2020",
        columns: ["GWs", "Hours", "Hours with reserve", "Mean MW"],
        left: [0],
        rows: band(pack.ffr_by_kinetic.since_2020),
      },
    ],
  };
}

function model(): MethodSection {
  const targets = GRID_CALIBRATION_TARGETS;
  const option = FFR_OPTIONS[1];
  const design = simulateTrip({ kineticGWs: targets.designPoint.kineticGWs, lossMW: targets.designPoint.lossMW });
  const low = simulateTrip({
    kineticGWs: targets.lowInertia.kineticGWs,
    lossMW: targets.lowInertia.lossMW,
    fastReserve: { ...option, mw: targets.lowInertia.ffrMW },
  });
  const trips: ObservedTrip[] = pack.events.all.filter((e) => e.class === "trip");
  const checks = trips.map((t) => checkTrip(t)).filter((c) => c !== null);
  const summary = summarise(checks);
  return {
    id: "model",
    title: "The model and its check",
    kind: "modelled",
    blocks: [
      {
        type: "p",
        text: "One-bus swing equation: the whole synchronous grid is one spinning mass. It draws the shape of a fall for the design case. It is never quoted as a figure in the film.",
      },
      { type: "code", text: "df/dt = f₀ · (−loss + slower reserve + fast reserve + load relief) / (2 · kinetic energy)" },
      {
        type: "table",
        caption: "Parameters",
        columns: ["Parameter", "Value"],
        left: [0],
        rows: [
          ["Slower reserve (FCR-D), full at 49.5 Hz, linear from 49.9 Hz", `${n(GRID_MODEL.fcrdMW)} MW`],
          ["Its dead time", `${GRID_MODEL.fcrdDeadSeconds} s`],
          ["Its first-order lag", `${GRID_MODEL.fcrdLagSeconds} s`],
          ["Load relief", `${GRID_MODEL.loadReliefPctPerHz} % per Hz of ${n(GRID_MODEL.loadMW)} MW`],
          ["Fast reserve options (activation, full within)", FFR_OPTIONS.map((o) => `${o.activationHz} Hz / ${o.fullSeconds} s`).join(" · ")],
        ],
      },
      {
        type: "table",
        caption: "Calibration against the published design points",
        columns: ["Case", "Published", "Model"],
        left: [0],
        rows: [
          [
            `${targets.designPoint.kineticGWs} GWs, ${n(targets.designPoint.lossMW)} MW lost, no fast reserve`,
            `${targets.designPoint.nadirHz.toFixed(2)} Hz`,
            `${design.nadirHz.toFixed(2)} Hz`,
          ],
          [
            `${targets.lowInertia.kineticGWs} GWs, ${n(targets.lowInertia.lossMW)} MW lost, ${targets.lowInertia.ffrMW} MW fast reserve at ${option.activationHz} Hz`,
            `${targets.lowInertia.nadirHz.toFixed(2)} Hz`,
            `${low.nadirHz.toFixed(2)} Hz`,
          ],
          [
            `Extra mass for 0.1 Hz at ${targets.massForTenthHz.kineticGWs} GWs`,
            `${targets.massForTenthHz.extraGWs} GWs`,
            "about 11 GWs: missed; that study used the pre-2024 reserve requirements",
          ],
        ],
      },
      {
        type: "p",
        text: `Check against the ${summary.trips} trips: each loss is backed out from the trip's first second at that hour's kinetic energy and pre-event frequency, and the model's lowest point compared with the measured one. Timing is right (median ${summary.medianNadirSecondsModeled} s modelled against ${summary.medianNadirSecondsObserved} s observed). Depth is a median ${summary.medianDepthRatio}× deeper than the real trips, because the design case leaves out the normal-operation reserve, part of the load relief and providers faster than the minimum. So the film draws the model only for the design case, labelled modelled, and never over an observed trip as a prediction.`,
      },
      {
        type: "table",
        caption: "Per trip",
        columns: ["Detected", "Mass, GWs", "Backed-out loss, MW", "Depth observed, mHz", "Depth modelled, mHz", "To lowest observed, s", "To lowest modelled, s"],
        left: [0],
        rows: checks.map((c) => [
          c.t,
          n(c.kineticGWs, 1),
          n(c.lossMW),
          c.observedDepthMHz,
          c.modeledDepthMHz,
          c.observedNadirSeconds.toFixed(1),
          c.modeledNadirSeconds.toFixed(1),
        ]),
      },
    ],
  };
}

function claims(): MethodSection {
  const s = pack.events.summary;
  return {
    id: "claims",
    title: "What we claim, and what we do not",
    blocks: [
      {
        type: "list",
        items: [
          "Claim: in a light hour, a few hundred MW that react within a second do what tens of GWs of extra spinning mass would. That comparison is the operators' published figures, not our model.",
          `Observed: in ${pack.method.window.first_month} to ${pack.method.window.last_month} we found ${s.trips} trips; the deepest reached ${s.deepest_hz} Hz, and nothing fell below 49.6 Hz. The grid held every time.`,
          "Not claimed: that the grid is unsafe; that any real event breached 49.0 Hz; which unit tripped on any day; a forecast of future spinning mass.",
          "The trips cluster in the months with the least spinning mass. With this few trips, we do not claim the grid trips more in summer.",
        ],
      },
    ],
  };
}

export const HOW_MUCH_FAST_RESERVE_METHOD: StoryMethod = {
  pack: pack as unknown as Record<string, unknown>,
  schema: {
    id: "The story's slug.",
    version: "Pack version; a re-freeze with a different shape bumps it.",
    generated: "Date the pack was frozen.",
    status: "What the pack is complete for.",
    sources: "Every dataset and report, with its link and licence.",
    method: "Every rule the pipeline applied, in words: filter, detector, classes, pairing, loss estimate.",
    coverage: "Samples per month and the share missing.",
    events: "All sustained falls with their class, pairing and estimated loss, and a summary by class.",
    pairing: "Trips against their hour's spinning mass, by half-year.",
    featured_event: "The trip the film opens on, with its 10 Hz trace (raw and filtered).",
    hours: "Every hour of the window: its mean kinetic energy, and the fast reserve bought where any was.",
    years: "Hours below 150 and 120 GWs by year and by month, ours and published, and fast reserve bought per year.",
    ffr_by_kinetic: "Share of hours with fast reserve bought, by 20 GWs band of spinning mass.",
    published: "Figures quoted from the operators' reports, each with its source.",
    limitations: "What the evidence cannot say.",
  },
  sections: () => [claims(), sources(), pipeline(), events(), hours(), model()],
};
