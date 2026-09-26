/**
 * Seeded arrival field for *Why don't delays die?*
 *
 * A mark is one train at one stop, placed by position in the run against minutes
 * late. The marks are an **illustrative** picture of the mechanism the evidence
 * pack measured, not the measurement: each run walks its line stop by stop,
 * picking up primary delay and handing what the next leg's recovery margin
 * cannot absorb to the stop after it. Every figure the film prints comes from
 * `data/figures/where-should-the-recovery-time-sit.v1.json`; nothing is read off
 * these marks.
 *
 * The counterfactual re-walks the same runs with the line's margin re-laid toward
 * the legs where delay survives, conserving the line's total margin exactly — and
 * then **amplifies the effect to match the frozen replay.** Re-allocating slack
 * inside a seeded field moves per-leg survival by about 6 points where the replay
 * moves it by 19, because real delays concentrate on the legs with no margin and a
 * generator spreads them. One `gain` per frozen strength closes that gap, solved
 * so the field's own carry-over lands on the figure the pack froze. The shape of
 * the change is the rule's; the size of it is the evidence's.
 *
 * **Read the gains before trusting the picture.** Long-distance lines need 1.3–1.8×,
 * which is a nudge. Commuter lines need 5–11×, which is not: re-laying 0.2 minutes
 * a leg cannot buy an eleven-point fall in carry-over inside this mechanism, so the
 * commuter picture is being driven rather than derived. That is worth knowing in
 * both directions. It is a limit of the generator, and it is also a hint that the
 * frozen replay's commuter gains lean on a few unusual legs rather than a broad
 * effect — consistent with those lines being the ones where the rule is
 * non-monotone. Act IX's commuter copy must therefore rest on the pack's figures,
 * never on how far these marks moved.
 *
 * Scaling delay minutes was tried first and is wrong: shrinking every delay drops
 * the small ones below the threshold and out of the denominator, which leaves the
 * survivors and pushes carry-over *up*.
 *
 * **Every run here picks up a delay somewhere.** The film is about what happens
 * to a delay, and the pack's own survival figures are conditioned on a late
 * arrival too, so conditioning the field the same way is what makes the picture
 * comparable. It does mean `lateShare` is a property of this field and not of the
 * network: the network's median day is 3.45%, and the Open beat says so from the
 * pack rather than from these marks.
 */

import pack from "../../../data/figures/where-should-the-recovery-time-sit.v1.json";

export const RUNS_PER_LINE = 16;
export const DELAY_FIELD_SEED = 23;

/**
 * Runs used only to estimate per-leg survival for the re-allocation rule. The
 * pack measured that on a year; sixteen drawn runs is far too thin a sample to
 * allocate minutes from, and re-allocating on that noise made two lines worse.
 * These runs are never drawn.
 */
const WEIGHT_RUNS = 600;

/** Above this, an arrival counts as late. Matches the pack's threshold. */
export const LATE_MIN = pack.method.late_threshold_min;

/**
 * Fitted by grid search against the pack's per-line and per-category carry-over,
 * not against the aggregate: the field gives every line the same number of runs
 * and the network does not, so its overall figure is a mix artifact and only the
 * per-line comparison means anything. Long-distance lands at 0.72 against a
 * measured 0.717 and commuter at 0.90 against 0.888.
 *
 * These are the knobs of a picture, not estimates of anything. The field is
 * `illustrative`; every published figure comes from the pack.
 */
export type DelayFieldParams = {
  /** Chance a leg generates fresh delay beyond the run's own onset. */
  primaryRate: number;
  /** Minutes past the threshold a delay lands at, on average. */
  primaryMeanMin: number;
  /** Smallest share of its margin a train spends. */
  absorbLow: number;
  /**
   * Minutes a train can claw back per leg that leg run-time margin does not
   * describe — dwell that can be cut short, a signal that clears early. Small on
   * purpose: without it the lowest-margin lines carry every delay for ever, which
   * the pack says they do not (Ring Rail carries 93%, not 100%).
   */
  dwellRecoveryMin: number;
};

export const DELAY_FIELD_PARAMS: DelayFieldParams = {
  primaryRate: 0.014,
  primaryMeanMin: 4.5,
  absorbLow: 0.1,
  dwellRecoveryMin: 0.75,
};

export type DelayMark = {
  id: number;
  lineIndex: number;
  /** 0 commuter, 1 long-distance. */
  service: 0 | 1;
  runIndex: number;
  stop: number;
  /** Position in the run, 0–1. */
  stopShare: number;
  /** Minutes late as scheduled today. */
  late: number;
  /** Minutes late at each frozen counterfactual strength. Index 0 equals `late`. */
  lateByVariant: number[];
  /** Stable vertical jitter key. */
  row: number;
};

export type DelayLine = {
  id: string;
  label: string;
  category: string;
  service: 0 | 1;
  stopCodes: string[];
  stopNames: string[];
  /** Recovery margin per leg, in stop order. Legs number stops - 1. */
  margin: number[];
  /** The same total margin, re-laid toward the legs that shed least. */
  marginAlt: number[];
  /**
   * How hard the re-laid margin has to work for the field to reproduce the figure
   * the pack froze, one per frozen strength. Index 0 is today and is always 1. On
   * commuter lines these fall again past the best variant, because the replay gets
   * worse there too.
   */
  variantGain: number[];
  /** Counterfactual strengths the pack froze, alongside `variantGain`. */
  variantStrength: number[];
};

export type DelayFieldModel = {
  marks: DelayMark[];
  lines: DelayLine[];
  focusLineIndex: number;
  /** The one run Acts II and III follow. */
  featured: { lineIndex: number; runIndex: number };
  lateShare: number;
};

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

type PackLine = (typeof pack.lines)[number];

/** Margin per leg in stop order, falling back to the line median where a leg is unmeasured. */
function marginProfile(line: PackLine): number[] {
  const byLeg = new Map(line.legs.map((leg) => [`${leg.from}>${leg.to}`, leg.padding_min]));
  const fallback = line.padding_summary.median_min;
  const profile: number[] = [];
  for (let i = 0; i < line.stops.length - 1; i++) {
    const key = `${line.stops[i].code}>${line.stops[i + 1].code}`;
    profile.push(byLeg.get(key) ?? fallback);
  }
  return profile;
}

/**
 * Re-lay the same total margin in proportion to measured delay survival per leg —
 * the pack's own rule, applied to the field's first pass rather than to a proxy.
 *
 * An earlier version weighted by `beats_schedule` instead, on the grounds that it
 * was the per-leg figure the pack exposes. It moved the marks the *wrong way* on
 * five of the seven lines, which would have put a picture of a worse timetable
 * under a caption saying survival falls. Measuring survival on the field and
 * feeding that back is what makes the picture agree with the frozen replay.
 */
function marginAltProfile(margin: number[], survival: number[]): number[] {
  const total = margin.reduce((sum, value) => sum + value, 0);
  // A floor keeps a leg that never saw a late train from being stripped bare on
  // the strength of having no evidence.
  const weights = survival.map((share) => share + 0.05);
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  if (weightSum <= 0 || total <= 0) return [...margin];
  return weights.map((weight) => (weight / weightSum) * total);
}

/** Carry-over across a set of walked runs. */
function sampleCarry(runs: number[][]): number {
  let late = 0;
  let carried = 0;
  for (const run of runs) {
    for (let i = 0; i < run.length - 1; i++) {
      if (run[i] < LATE_MIN) continue;
      late += 1;
      if (run[i + 1] >= LATE_MIN) carried += 1;
    }
  }
  return late === 0 ? 0 : carried / late;
}

/** Margin part-way between today's profile and the re-laid one. */
function blend(margin: number[], marginAlt: number[], strength: number): number[] {
  return margin.map((value, i) => value + (marginAlt[i] - value) * strength);
}

/**
 * How hard the re-laid margin must work for the field's carry-over to land on a
 * frozen figure. More gain means more slack spent per leg, so carry falls with
 * gain and a bisection settles it.
 */
function solveGain(
  draws: Draw[],
  profile: number[],
  target: number,
): number {
  const carryAt = (gain: number) =>
    sampleCarry(
      draws.map((draw) =>
        walk(profile, draw.primaries, draw.absorbs, draw.dwells, gain),
      ),
    );
  let low = 1;
  let high = 12;
  if (carryAt(low) <= target) return low;
  if (carryAt(high) > target) return high;
  for (let i = 0; i < 32; i++) {
    const mid = (low + high) / 2;
    if (carryAt(mid) > target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/** Share of late arrivals at each leg's start that are still late at its end. */
function legSurvival(runs: number[][], legs: number): number[] {
  const survival: number[] = [];
  for (let leg = 0; leg < legs; leg++) {
    let late = 0;
    let carried = 0;
    for (const late_ of runs) {
      if (late_[leg] < LATE_MIN) continue;
      late += 1;
      if (late_[leg + 1] >= LATE_MIN) carried += 1;
    }
    survival.push(late === 0 ? 0 : carried / late);
  }
  return survival;
}

type Draw = { primaries: number[]; absorbs: number[]; dwells: number[] };

function walk(
  margin: number[],
  primaries: number[],
  absorbs: number[],
  dwells: number[],
  gain = 1,
): number[] {
  const late: number[] = [0];
  let carried = 0;
  for (let leg = 0; leg < margin.length; leg++) {
    const slack = Math.max(0, margin[leg]) * absorbs[leg] * gain + dwells[leg];
    carried = Math.max(0, carried + primaries[leg] - slack);
    late.push(carried);
  }
  return late;
}

export function buildDelayField(
  runsPerLine = RUNS_PER_LINE,
  seed = DELAY_FIELD_SEED,
  params: DelayFieldParams = DELAY_FIELD_PARAMS,
): DelayFieldModel {
  const rand = mulberry32(seed);
  const marks: DelayMark[] = [];
  const lines: DelayLine[] = [];
  let id = 0;
  let late = 0;

  pack.lines.forEach((packLine, lineIndex) => {
    const margin = marginProfile(packLine);
    const service: 0 | 1 = packLine.category === "Commuter" ? 0 : 1;
    const lastStop = packLine.stops.length - 1;

    const drawRun = (): Draw => {
      const primaries = margin.map(() =>
        rand() < params.primaryRate
          ? LATE_MIN + -Math.log(1 - rand()) * params.primaryMeanMin
          : 0,
      );
      // Every run gets one onset, in the first two thirds of the line so the
      // delay has somewhere to travel. Without it the high-margin lines would
      // hold almost no late marks and the field would stop being a picture of
      // anything.
      const onsetLeg = Math.floor(rand() * Math.max(1, Math.floor(margin.length * 0.66)));
      primaries[onsetLeg] = LATE_MIN + -Math.log(1 - rand()) * params.primaryMeanMin;
      return {
        primaries,
        absorbs: margin.map(() => params.absorbLow + rand() * (1 - params.absorbLow)),
        dwells: margin.map(() => rand() * params.dwellRecoveryMin),
      };
    };

    // Where the rule puts the minutes, and how hard it has to work: both measured
    // on a large unseen sample, the way the pack measured them on a year.
    const sampleDraws: Draw[] = [];
    for (let i = 0; i < WEIGHT_RUNS; i++) sampleDraws.push(drawRun());
    const sample = sampleDraws.map((draw) =>
      walk(margin, draw.primaries, draw.absorbs, draw.dwells),
    );
    const marginAlt = marginAltProfile(margin, legSurvival(sample, margin.length));

    // The zero-strength variant reproduces what was measured, so it anchors the
    // ratio: gain 1 is today by definition.
    const variants = packLine.counterfactual.variants;
    const measured = sampleCarry(sample);
    const profiles = variants.map((variant) => blend(margin, marginAlt, variant.strength));
    const variantGain = variants.map((variant, v) =>
      variant.strength === 0
        ? 1
        : solveGain(
            sampleDraws,
            profiles[v],
            (variant.curve[0].share / variants[0].curve[0].share) * measured,
          ),
    );

    lines.push({
      id: packLine.id,
      label: packLine.label,
      category: packLine.category,
      service,
      stopCodes: packLine.stops.map((stop) => stop.code),
      stopNames: packLine.stops.map((stop) => stop.name),
      margin,
      marginAlt,
      variantGain,
      variantStrength: variants.map((variant) => variant.strength),
    });

    // The runs the reader actually sees, walked once per frozen strength so the
    // scrub has something to move between.
    for (let runIndex = 0; runIndex < runsPerLine; runIndex++) {
      const draw = drawRun();
      const byVariant = profiles.map((profile, v) =>
        walk(profile, draw.primaries, draw.absorbs, draw.dwells, variantGain[v]),
      );
      const today = byVariant[0];

      for (let stop = 0; stop <= lastStop; stop++) {
        if (today[stop] >= LATE_MIN) late += 1;
        marks.push({
          id: id++,
          lineIndex,
          service,
          runIndex,
          stop,
          stopShare: lastStop === 0 ? 0 : stop / lastStop,
          late: today[stop],
          lateByVariant: byVariant.map((profile) => profile[stop]),
          row: rand(),
        });
      }
    }
  });

  const focusLineIndex = pack.lines.findIndex((line) => line.id === pack.focus_line);

  return {
    marks,
    lines,
    focusLineIndex: focusLineIndex < 0 ? 0 : focusLineIndex,
    featured: pickFeatured(marks, focusLineIndex < 0 ? 0 : focusLineIndex),
    lateShare: late / marks.length,
  };
}

/**
 * Acts II and III need a run that leaves on time and then picks a delay up, so
 * the reader watches it happen rather than arriving after it did.
 */
function pickFeatured(
  marks: DelayMark[],
  lineIndex: number,
): { lineIndex: number; runIndex: number } {
  const runs = new Map<number, DelayMark[]>();
  for (const mark of marks) {
    if (mark.lineIndex !== lineIndex) continue;
    const seen = runs.get(mark.runIndex);
    if (seen) seen.push(mark);
    else runs.set(mark.runIndex, [mark]);
  }

  let best = -1;
  let bestScore = -Infinity;
  for (const [runIndex, run] of runs) {
    const ordered = [...run].sort((a, b) => a.stop - b.stop);
    if (ordered[0].late > 0.01) continue;
    const peak = Math.max(...ordered.map((mark) => mark.late));
    if (peak < LATE_MIN) continue;
    const onsetAt = ordered.findIndex((mark) => mark.late >= LATE_MIN) / ordered.length;
    // Late early enough to leave stops for the delay to travel through, and not
    // so late that the beat is about one enormous outlier.
    const score = -Math.abs(onsetAt - 0.2) * 4 - Math.abs(peak - 8) * 0.1;
    if (score > bestScore) {
      bestScore = score;
      best = runIndex;
    }
  }

  return { lineIndex, runIndex: best < 0 ? 0 : best };
}

export function marksOfRun(
  model: DelayFieldModel,
  lineIndex: number,
  runIndex: number,
): DelayMark[] {
  return model.marks
    .filter((mark) => mark.lineIndex === lineIndex && mark.runIndex === runIndex)
    .sort((a, b) => a.stop - b.stop);
}

/**
 * Minutes late under the scrub. The reader's thumb sits between frozen strengths,
 * so the marks move continuously between the walks either side of it. A figure
 * printed on screen snaps to a frozen variant instead — see `recoveryVariantIndex`.
 */
export function lateAt(mark: DelayMark, strengths: number[], budget: number): number {
  const b = Math.min(1, Math.max(0, budget));
  for (let i = 0; i < strengths.length - 1; i++) {
    if (b <= strengths[i + 1]) {
      const span = strengths[i + 1] - strengths[i];
      const t = span <= 0 ? 0 : (b - strengths[i]) / span;
      return mark.lateByVariant[i] + (mark.lateByVariant[i + 1] - mark.lateByVariant[i]) * t;
    }
  }
  return mark.lateByVariant[mark.lateByVariant.length - 1];
}

/** Share of late arrivals still late one stop later, measured on the field. */
export function fieldCarryOver(
  model: DelayFieldModel,
  lineIndex?: number,
  variant = 0,
): number {
  let late = 0;
  let carried = 0;
  const byRun = new Map<string, DelayMark[]>();
  for (const mark of model.marks) {
    if (lineIndex !== undefined && mark.lineIndex !== lineIndex) continue;
    const key = `${mark.lineIndex}:${mark.runIndex}`;
    const seen = byRun.get(key);
    if (seen) seen.push(mark);
    else byRun.set(key, [mark]);
  }
  for (const run of byRun.values()) {
    const ordered = run.sort((a, b) => a.stop - b.stop);
    for (let i = 0; i < ordered.length - 1; i++) {
      if (ordered[i].lateByVariant[variant] < LATE_MIN) continue;
      late += 1;
      if (ordered[i + 1].lateByVariant[variant] >= LATE_MIN) carried += 1;
    }
  }
  return late === 0 ? 0 : carried / late;
}
