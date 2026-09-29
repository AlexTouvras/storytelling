import pack from "../../../data/figures/where-should-the-speed-be-held.v1.json";
import type { MethodSection, StoryMethod } from "@/lib/reader/method";
import { JAM_MODEL, jamModel, jamModelDrawn } from "@/lib/sim/car-following";

const n = (x: number, digits = 0) =>
  x.toLocaleString("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });

function data(): MethodSection {
  const source = pack.sources["ngsim-us-101"];
  const lanes = pack.recording.lanes;
  const ramps = pack.recording.ramp_lanes.lanes as Record<
    string,
    { role: string; sample: number; later_through: number; earlier_through: number }
  >;
  return {
    id: "data",
    title: "Data",
    kind: "observed",
    blocks: [
      {
        type: "p",
        text: `${source.name}. ${source.licence}. ${source.url}. The file is location='us-101', ${pack.recording.when}, ${pack.recording.clock}, ${n(pack.recording.rows)} rows. local_y increases in the direction of travel, from 0 to about ${n(pack.recording.length_ft)} ft.`,
      },
      {
        type: "table",
        caption: "Lanes. Means are the whole morning.",
        columns: ["Lane", "From, ft", "To, ft", "Mean, mph", "Role"],
        rows: lanes.map((lane) => [
          lane.lane,
          n(lane.y0_ft, 0),
          n(lane.y1_ft, 0),
          n(lane.mean_mph, 1),
          ramps[String(lane.lane)]?.role ?? "through",
        ]),
      },
      {
        type: "p",
        text: `Lane 7 sits at the upstream end and its vehicles continue into a through lane (${ramps["7"].later_through} of a sample of ${ramps["7"].sample}). Lane 8 sits further down and its vehicles arrive from a through lane (${ramps["8"].earlier_through} of ${ramps["8"].sample}). Lane 6 lies between them. The sample is six vehicles a lane. The lanes are drawn and not modelled.`,
      },
    ],
  };
}

function pipeline(): MethodSection {
  return {
    id: "pipeline",
    title: "Pipeline",
    blocks: [
      {
        type: "p",
        text: `${pack.method.window}. ${pack.method.cells} ${pack.method.lamp}`,
      },
      { type: "code", text: pack.method.command },
      {
        type: "p",
        text: "The replay is src/lib/sim/car-following.ts. It reads the lane-2 trajectories in the pack and is checked by src/lib/sim/car-following.test.ts.",
      },
    ],
  };
}

function morning(): MethodSection {
  return {
    id: "morning",
    title: "The morning",
    kind: "calculated",
    blocks: [
      { type: "p", text: pack.bands.rule },
      {
        type: "table",
        caption: "Five-minute bands, lanes 1–5",
        columns: ["Minutes", "Upstream, mph", "Middle, mph", "Downstream, mph"],
        rows: pack.bands.rows.map((row) => [
          `${row.from_min}–${row.to_min}`,
          row.upstream_mph ?? "—",
          row.middle_mph ?? "—",
          row.downstream_mph ?? "—",
        ]),
      },
    ],
  };
}

function pockets(): MethodSection {
  const car = pack.featured.car;
  const walk = pack.featured.walk;
  return {
    id: "pockets",
    title: "The pockets",
    kind: "calculated",
    blocks: [
      { type: "p", text: pack.pockets.rule },
      {
        type: "p",
        text: `The featured picture is lane ${pack.featured.lane}, from ${pack.featured.from_s} s to ${pack.featured.to_s} s, on 100-ft cells. The slowest cell moves from ${walk.from_y_ft} ft at ${walk.from_mph} mph to ${walk.to_y_ft} ft at ${walk.to_mph} mph. That is ${walk.walk_ft} ft, ${walk.walk_mph} mph against the traffic. The car the illustration opens is ${car.id}, at ${car.y} ft and ${car.mph} mph. Its measured acceleration at that instant is ${car.acc} ft/s², so the lamp on the road is off. The side view is the mechanism, enlarged.`,
      },
      {
        type: "table",
        caption: "Crossings the coarser rule counted",
        columns: ["Lane", "From, s", "To, s", "From, ft", "To, ft", "Walk, mph", "Ahead, mph"],
        rows: pack.pockets.crossings.map((row) => [
          row.lane,
          row.from_s,
          row.to_s,
          row.from_y_ft,
          row.to_y_ft,
          row.walk_mph,
          row.downstream_mph,
        ]),
      },
    ],
  };
}

function model(): MethodSection {
  const { base, variant } = jamModel();
  const drawn = jamModelDrawn();
  const line = (run: typeof base) => {
    const end = run.samples[run.samples.length - 1];
    return [
      n(run.walkMph, 1),
      end ? n(end.yFt) : "—",
      end ? n(end.slowMph, 1) : "—",
      end?.downstreamMph == null ? "—" : n(end.downstreamMph, 1),
    ];
  };
  return {
    id: "model",
    title: "The model",
    kind: "modelled",
    blocks: [
      {
        type: "p",
        text: `Replay the downstream-most car on its observed path. Each follower accelerates from the gap and the speed difference, lagged ${JAM_MODEL.lagS} s (alpha ${JAM_MODEL.alpha} /s, beta ${JAM_MODEL.beta} /s per foot, standstill gap ${JAM_MODEL.s0Ft} ft, time gap ${JAM_MODEL.timeGapS} s). The variant does not allow a follower to brake harder than the car ahead. It is drawn only when the slow cell walks upstream at 7–11 mph, stays above 5 mph, and leaves the far end above 40 mph.`,
      },
      {
        type: "p",
        text: drawn
          ? "The replay passes, so the decision card draws it as a shape. The cell ends slower than the measured cell, and that depth is not quoted as a measurement."
          : "The replay does not pass, so the film does not draw it.",
      },
      {
        type: "table",
        caption: "The featured minute",
        columns: ["Run", "Walk, mph", "Slow cell at 300 s, ft", "Slow cell, mph", "Ahead, mph"],
        left: [0],
        rows: [
          ["Replay", ...line(base)],
          ["No harder brake", ...line(variant)],
        ],
      },
    ],
  };
}

export const WHERE_SHOULD_THE_SPEED_BE_HELD_METHOD: StoryMethod = {
  pack: pack as unknown as Record<string, unknown>,
  schema: {
    id: "Story slug",
    version: "Pack version",
    generated: "Date the pack was frozen",
    recording: "The US-101 morning: window, rows, lane extents, and which short lanes are the entrance and the exit",
    bands: "Five-minute mean speeds for lanes 1–5, upstream, middle and downstream",
    featured: "Lane 2 from 240 s to 300 s, the walk, the two frames, the 10-second steps, and the car the picture opens",
    pockets: "Crossings of the 200-ft rule on lanes 1–5",
    trajectories: "Lane 2, one sample a second, for the replay",
    morning: "Instants of lanes 1–5 for the pullback",
    sources: "Where the file was read, and its licence",
    method: "The freeze command, the cell sizes, and the acceleration floor for a road lamp",
    limitations: "What this recording cannot say",
  },
  sections: () => [data(), pipeline(), morning(), pockets(), model()],
};
