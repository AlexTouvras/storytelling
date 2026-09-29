/**
 * Terms a story teaches, and the rules that keep it teaching them in order.
 *
 * A film speaks plain words. Each term has one film word, taught by a term
 * button at its first use in the beat it belongs to, and a technical name shown
 * once inside that definition for readers who know the field. The rules are
 * checked against the narration itself, so a copy edit that uses a word before
 * the film has explained it fails a test instead of confusing a reader.
 */

export type Term = {
  id: string;
  /** The film's word, as it appears in the narration. */
  word: string;
  /** Other spellings the narration may use: plurals it cannot guess, "50 Hz" for frequency. */
  forms?: readonly string[];
  /** Shown once, inside the definition. Several names are separated by ";" or ",". */
  technical: string;
  /** One line, plain words. */
  definition: string;
  /** The beat that teaches it. */
  beat: number;
};

export type BeatText = {
  kicker?: string;
  title?: string;
  paragraphs: readonly string[];
};

export type Segment = { text: string; termId?: string };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole-word match with an optional plural. `trip` finds "trips", not "tripped". */
export function formsPattern(forms: readonly string[]): RegExp {
  const alternatives = [...forms]
    .map((f) => f.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(escape);
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives.join("|")})(?:s|es)?(?![\\p{L}\\p{N}])`, "giu");
}

export function filmForms(term: Term): string[] {
  return [term.word, ...(term.forms ?? [])];
}

/** The technical name split into the names a narration might use on its own. */
export function technicalForms(term: Term): string[] {
  const film = new Set(filmForms(term).map((f) => f.toLowerCase()));
  return term.technical
    .split(/[;,]/)
    .map((f) => f.trim())
    .filter((f) => f.length > 0 && !film.has(f.toLowerCase()));
}

function beatStrings(beat: BeatText): string[] {
  return [beat.kicker ?? "", beat.title ?? "", ...beat.paragraphs];
}

export function uses(texts: readonly string[], forms: readonly string[]): boolean {
  if (forms.length === 0) return false;
  const pattern = formsPattern(forms);
  return texts.some((t) => {
    pattern.lastIndex = 0;
    return pattern.test(t);
  });
}

/**
 * Everything wrong with how a narration teaches its terms:
 * - a term's beat does not exist, or its word is not in that beat's paragraphs
 *   (so no term button can be drawn and the term is never taught);
 * - a film word or a technical name appears in an earlier beat than the one
 *   that teaches it.
 */
export function termOrderProblems(terms: readonly Term[], beats: readonly BeatText[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const term of terms) {
    if (ids.has(term.id)) problems.push(`term "${term.id}" is listed twice`);
    ids.add(term.id);
    if (!Number.isInteger(term.beat) || term.beat < 0 || term.beat >= beats.length) {
      problems.push(`term "${term.id}" is taught at beat ${term.beat}, which the narration does not have`);
      continue;
    }
    if (!uses(beats[term.beat].paragraphs, filmForms(term))) {
      problems.push(`term "${term.id}" is never used in the paragraphs of beat ${term.beat}, so it is never taught`);
    }
    for (let b = 0; b < term.beat; b++) {
      const texts = beatStrings(beats[b]);
      if (uses(texts, filmForms(term))) {
        problems.push(`beat ${b} uses "${term.word}" before beat ${term.beat} teaches it`);
      }
      for (const form of technicalForms(term)) {
        if (uses(texts, [form])) {
          problems.push(`beat ${b} uses the technical name "${form}" before beat ${term.beat} teaches "${term.word}"`);
        }
      }
    }
  }
  return problems;
}

/**
 * An orientation card is read before anything is taught, so it may not lean
 * on a technical name, and it has to stay short enough to read in one breath.
 */
export const ORIENTATION_WORDS = { min: 20, max: 60 } as const;

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function orientationProblems(orientation: string, terms: readonly Term[]): string[] {
  const problems: string[] = [];
  const words = wordCount(orientation);
  if (words < ORIENTATION_WORDS.min || words > ORIENTATION_WORDS.max) {
    problems.push(
      `orientation is ${words} words; keep it between ${ORIENTATION_WORDS.min} and ${ORIENTATION_WORDS.max}`,
    );
  }
  for (const term of terms) {
    for (const form of technicalForms(term)) {
      if (uses([orientation], [form])) {
        problems.push(`orientation uses the technical name "${form}"`);
      }
    }
  }
  return problems;
}

/**
 * Split a beat's paragraphs into text and term buttons. Only terms this beat
 * teaches become buttons, and only at their first use in the beat, so a word is
 * explained once, where the reader first needs it.
 */
export function segmentBeat(paragraphs: readonly string[], terms: readonly Term[], beat: number): Segment[][] {
  const pending = new Map(terms.filter((t) => t.beat === beat).map((t) => [t.id, t]));
  return paragraphs.map((paragraph) => {
    const hits: { start: number; end: number; termId: string }[] = [];
    for (const term of pending.values()) {
      const pattern = formsPattern(filmForms(term));
      const match = pattern.exec(paragraph);
      if (!match) continue;
      const start = match.index;
      const end = start + match[0].length;
      if (hits.some((h) => start < h.end && end > h.start)) continue;
      hits.push({ start, end, termId: term.id });
    }
    for (const hit of hits) pending.delete(hit.termId);
    hits.sort((a, b) => a.start - b.start);
    const segments: Segment[] = [];
    let cursor = 0;
    for (const hit of hits) {
      if (hit.start > cursor) segments.push({ text: paragraph.slice(cursor, hit.start) });
      segments.push({ text: paragraph.slice(hit.start, hit.end), termId: hit.termId });
      cursor = hit.end;
    }
    if (cursor < paragraph.length) segments.push({ text: paragraph.slice(cursor) });
    return segments;
  });
}
