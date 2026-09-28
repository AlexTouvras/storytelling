import pack from "../../../data/figures/where-should-the-cutoff-sit.v1.json";
import type { EvidenceKind } from "@/lib/reader/kinds";

/**
 * Narration for *Where Should the Cut-Off Sit?*, one entry per beat. Beat 0
 * is the title card over the field; the narration column fades in with beat 1.
 */
export type CutoffCopy = {
  kicker: string;
  title: string;
  paragraphs: string[];
  kind: EvidenceKind | null;
};

export const CUTOFF_BEATS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

export function cutoffCopyFor(beat: number): CutoffCopy {
  const op = pack.policy.operating.display;
  switch (beat) {
    case 1:
      return {
        kicker: "One file",
        title: "Decide with what you know now",
        paragraphs: [
          "An application arrives with what is known at decision time. Income, bureau history, contract type — not the future default.",
          "The yes or no has to be made before anyone knows how the loan ends. That is the whole job.",
        ],
        kind: "illustrative",
      };
    case 2:
      return {
        kicker: "Score → PD",
        title: "A rank becomes a probability",
        paragraphs: [
          `The champion (${pack.source.champion}) turns the file into a calibrated PD and a grade band.`,
          "A sample model built for this portfolio, not a bank's regulatory model.",
        ],
        kind: "modelled",
      };
    case 3:
      return {
        kicker: "The book",
        title: "Many files, one shape",
        paragraphs: [
          `The working cloud holds ${pack.sample.display.sampleN} marks from a ${pack.sample.display.fullN}-application history. Observed default rate ${pack.sample.display.defaultRate}.`,
          "Horizontal position is PD. The camera stays on the same marks as the story widens.",
        ],
        kind: "observed",
      };
    case 4:
      return {
        kicker: "The frontier",
        title: "Volume versus risk is a curve",
        paragraphs: [
          "Every PD gate buys a different approval rate and a different bad rate among the approved. Together they trace the frontier.",
          "Youden picks a statistical peak. Appetite picks a book you can live with.",
        ],
        kind: "calculated",
      };
    case 5:
      return {
        kicker: "Move the gate",
        title: `Operating cut: PD ≤ ${op.cutoffPd}`,
        paragraphs: [
          `Maximise approval on out-of-time applications (OOT) subject to bad among approved ≤ ${pack.policy.appetite.display}. That lands at PD ≤ ${op.cutoffPd}.`,
          `Approved marks stay lit. Rejected marks dim. Same field — policy is a filter.`,
        ],
        kind: "calculated",
      };
    case 6:
      return {
        kicker: "Out of time",
        title: "Pay for the gate on OOT",
        paragraphs: [
          `At the operating cut: approval ${op.approval}, bad among approved ${op.badAmongApproved}. OOT Gini ${pack.model.display.ootGini}.`,
          `Calibration ${pack.model.display.calib}. Mid-50s time-OOT Gini is honest for this public feature set.`,
        ],
        kind: "calculated",
      };
    case 7:
      return {
        kicker: "After go-live",
        title: "Watch the book, not Train Gini",
        paragraphs: [
          "Once the gate is set, steer on OOT bad rate among approved and PSI on the drivers that built the score.",
          "A pretty Train Gini with a drifting IV is a story that already failed.",
        ],
        kind: "calculated",
      };
    default:
      return {
        kicker: "An origination decision",
        title: "Where should the cut-off sit?",
        paragraphs: [
          "Scroll one application into a risk score, then the whole book, then a line set by how much loss you accept, checked on later data.",
        ],
        kind: null,
      };
  }
}

export function cutoffFigureFor(beat: number): string | null {
  const op = pack.policy.operating.display;
  if (beat === 5 || beat === 6) return op.cutoffPd;
  if (beat === 7) return op.approval;
  if (beat === 3) return pack.sample.display.defaultRate;
  return null;
}

export function cutoffNarration(): CutoffCopy[] {
  return CUTOFF_BEATS.map((beat) => cutoffCopyFor(beat));
}
