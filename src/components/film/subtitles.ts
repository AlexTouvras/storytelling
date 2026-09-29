/**
 * A beat's paragraphs, played as movie subtitles.
 *
 * One cue is at most two lines, about a subtitle's width. Scroll moves to the
 * next cue. The picture keeps the frame above `SUBTITLE_BAND`; the words sit
 * on the bottom edge instead of stacking into a column.
 */

/** Room the picture leaves for the subtitle, px. Two lines, a caption, a figure. */
export const SUBTITLE_BAND = 100;

/** Characters on one subtitle line. A cue is at most two of these. */
const LINE = 36;

export function beatStarts(poses: readonly { at: number; beat: number }[]): number[] {
  const starts: number[] = [];
  let last = -1;
  for (const pose of poses) {
    if (pose.beat !== last) {
      starts.push(pose.at);
      last = pose.beat;
    }
  }
  return starts;
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/** 0 at the start of the beat that contains `progress`, 1 at the start of the next. */
export function beatLocal(progress: number, starts: readonly number[]): number {
  const p = clamp01(progress);
  let i = 0;
  for (let k = 0; k < starts.length; k++) if (p >= starts[k]) i = k;
  const start = starts[i] ?? 0;
  const end = starts[i + 1] ?? 1;
  const span = end - start;
  if (span <= 0) return 0;
  return clamp01((p - start) / span);
}

/** Which cue is on screen. The last cue owns the end of the beat. */
export function cueIndex(local: number, count: number): number {
  if (count <= 1) return 0;
  const x = clamp01(local);
  if (x >= 1) return count - 1;
  return Math.min(count - 1, Math.floor(x * count));
}

/**
 * Film progress at the middle of a beat's first subtitle. That is the line
 * where a term taught in the beat is on screen.
 */
export function firstCueAt(start: number, end: number, count: number): number {
  const n = Math.max(1, count);
  return start + ((end - start) * 0.5) / n;
}

function sentences(paragraph: string): string[] {
  return paragraph
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Break a long sentence into cues of at most two lines, on word boundaries. */
function packWords(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const cues: string[] = [];
  let line = "";
  let linesInCue = 0;
  let cue = "";
  const closeLine = () => {
    cue = cue ? `${cue} ${line}` : line;
    line = "";
    linesInCue += 1;
    if (linesInCue === 2) {
      cues.push(cue);
      cue = "";
      linesInCue = 0;
    }
  };
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && next.length > LINE) closeLine();
    line = line ? `${line} ${word}` : word;
    if (!line.includes(" ") && line.length > LINE) closeLine();
  }
  if (line) closeLine();
  if (cue) cues.push(cue);
  return cues;
}

/** Pieces of a long sentence, split after a comma or similar, keeping the mark. */
function clauses(sentence: string): string[] {
  return sentence
    .split(/(?<=[,;:—–])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * A long sentence, packed so a cue ends on a phrase when it can. A clause
 * that is still longer than two lines falls back to word boundaries.
 */
function packClauses(sentence: string): string[] {
  const cues: string[] = [];
  let current = "";
  const flush = () => {
    if (current) cues.push(current);
    current = "";
  };
  for (const bit of clauses(sentence)) {
    if (bit.length > LINE * 2) {
      flush();
      cues.push(...packWords(bit));
      continue;
    }
    const next = current ? `${current} ${bit}` : bit;
    if (current && next.length > LINE * 2) flush();
    current = current ? `${current} ${bit}` : bit;
  }
  flush();
  return cues;
}

/**
 * The lines a beat speaks, in order. A sentence that fits in two lines is one
 * cue, so a term taught at the start of a sentence stays with that sentence.
 */
export function subtitleCues(paragraphs: readonly string[]): string[] {
  const cues: string[] = [];
  for (const paragraph of paragraphs) {
    for (const sentence of sentences(paragraph)) {
      if (sentence.length <= LINE * 2) cues.push(sentence);
      else cues.push(...packClauses(sentence));
    }
  }
  return cues.length > 0 ? cues : [""];
}

/**
 * Where a film draws its marks: below a short top margin, above the subtitle.
 * `reserveBelow` is extra pixels for an axis caption under the plot.
 */
export function picturePlot(height: number, reserveBelow = 0): { top: number; height: number } {
  const top = Math.max(40, Math.round(height * 0.055));
  const bottom = height - SUBTITLE_BAND - reserveBelow;
  return { top, height: Math.max(180, bottom - top) };
}
