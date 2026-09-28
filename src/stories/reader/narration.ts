import type { BeatText } from "@/lib/reader/terms";
import { gridNarration } from "@/components/film/grid-copy";

/**
 * Each film's narration, beat by beat, so the term-order rules run against
 * the words the reader actually sees. Every manifest with a `reader` block
 * needs an entry; `reader-kit.test.ts` enforces it.
 */
export const NARRATION: Record<string, () => readonly BeatText[]> = {
  "how-much-fast-reserve": gridNarration,
};
