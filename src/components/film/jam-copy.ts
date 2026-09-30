/**
 * Narration for *Why is the road ahead already moving?* Every figure is
 * formatted from the frozen pack or from the replay of that pack.
 */

import pack from "../../../data/figures/where-should-the-speed-be-held.v1.json";
import type { EvidenceKind } from "@/lib/reader/kinds";
import type { BeatText } from "@/lib/reader/terms";
import { jamModel, jamModelDrawn } from "@/lib/sim/car-following";

export type JamCopy = BeatText & {
  kicker: string;
  title: string;
  kind: EvidenceKind;
  figure?: string;
  figureNote?: string;
  caveat?: string;
};

export type JamBandRow = {
  label: string;
  upstream: number;
  downstream: number;
  kind: EvidenceKind;
};

export type JamDecision = {
  title: string;
  paragraphs: string[];
  bands: JamBandRow[];
  model: string | null;
  notClaimed: string[];
  attribution: string;
};

const mph = (x: number) => Math.round(x);

const band = (from: number) => pack.bands.rows.find((row) => row.from_min === from)!;
const now = pack.featured.frames[0];
const walk = pack.featured.walk;

export function jamNarration(): JamCopy[] {
  return [
    {
      kicker: "Southbound US-101",
      title: "You are stopped. The far end is not",
      kind: "calculated",
      paragraphs: ["You are stopped, and the road ahead is not."],
    },
    {
      kicker: "One brake",
      title: "The next one is harder",
      kind: "illustrative",
      paragraphs: [
        "One car brakes a little. The car behind brakes harder, and a little later. The third later still.",
      ],
      caveat: "Illustration. The brake is enlarged. The speeds on the road are measured.",
    },
    {
      kicker: "Lane 2",
      title: "It walks back through the cars",
      kind: "calculated",
      paragraphs: [
        "The pocket is the slow part here, and every car points ahead.",
        "A minute later the cars still point ahead and the pocket is at the back.",
        `It walked back ${walk.walk_ft} feet at ${mph(walk.walk_mph)} mph, against the traffic; ahead still ${mph(now.downstream_mph ?? 0)}.`,
      ],
      figure: String(mph(walk.walk_mph)),
      figureNote: "mph, back",
      caveat: "Car length is illustrative. Positions and speeds are measured.",
    },
    {
      kicker: "The morning",
      title: "Then the far end slows too",
      kind: "calculated",
      paragraphs: [
        `The road ahead is at ${mph(band(0).downstream_mph ?? 0)} mph in the first five minutes and ${mph(band(5).downstream_mph ?? 0)} in the next five. By fifteen minutes it is ${mph(band(10).downstream_mph ?? 0)}, with the rest of the stretch.`,
      ],
      figure: String(mph(band(10).downstream_mph ?? 0)),
      figureNote: "mph, ahead, at 15 min",
    },
    {
      kicker: "The window",
      title: "Hold it while the far end is still moving",
      kind: "calculated",
      paragraphs: [
        "Hold a steadier speed while the road ahead is still moving. A new lane answers a front that is already full. For the first ten minutes, this one was not.",
      ],
    },
  ];
}

export function jamDecision(): JamDecision {
  const rows = [0, 5, 10, 15].map((from) => {
    const row = band(from);
    return {
      label: `${row.from_min}–${row.to_min} min`,
      upstream: mph(row.upstream_mph ?? 0),
      downstream: mph(row.downstream_mph ?? 0),
      kind: "calculated" as const,
    };
  });
  const drawn = jamModelDrawn();
  const { base, variant } = jamModel();
  const baseEnd = base.samples[base.samples.length - 1];
  const variantEnd = variant.samples[variant.samples.length - 1];
  const model = drawn
    ? `A replay of this minute walks the slow cell back at ${base.walkMph.toFixed(1)} mph and leaves the far end near ${mph(baseEnd.downstreamMph ?? 0)} mph. It also slows that cell to ${mph(baseEnd.slowMph)} mph; the road's cell was ${mph(walk.to_mph)}, so that depth is the model's, not a measurement. Followers that may not brake harder than the car ahead do not keep the pocket: the slowest cell ends near ${mph(variantEnd.slowMph)} mph.`
    : null;
  return {
    title: "Hold the speed while the road ahead is still moving",
    paragraphs: [
      "The window on this morning is the first ten minutes, while the far end is still near 40 mph. By fifteen minutes the far end has fallen into line with the rest.",
      "A new lane answers a front that is already full. The entrance and the exit are in the picture. They are not in the model, so this does not say they caused the pocket, and it does not say they did not.",
    ],
    bands: rows,
    model,
    notClaimed: pack.limitations,
    attribution:
      "Positions and speeds from FHWA NGSIM, US-101, 15 June 2005, CC BY-SA 3.0. Not affiliated with, and not endorsed by, FHWA or Caltrans.",
  };
}
