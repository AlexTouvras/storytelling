import type { BeatText } from "@/lib/reader/terms";
import { buildField } from "@/lib/sim/book-field";
import { gridNarration } from "@/components/film/grid-copy";
import { rateNarration } from "@/components/film/rate-copy";
import { cutoffNarration } from "@/components/film/cutoff-copy";
import { recoveryNarration } from "@/components/film/recovery-copy";

/**
 * Each film's narration, beat by beat, so the term-order rules run against
 * the words the reader actually sees. Every manifest with a `reader` block
 * needs an entry; `reader-kit.test.ts` enforces it.
 */
export const NARRATION: Record<string, () => readonly BeatText[]> = {
  "how-much-fast-reserve": gridNarration,
  "when-rates-rise": () => rateNarration(buildField()),
  "where-should-the-cutoff-sit": cutoffNarration,
  "where-should-the-recovery-time-sit": recoveryNarration,
};
