import type { StoryMethod } from "@/lib/reader/method";
import { HOW_MUCH_FAST_RESERVE_METHOD } from "@/stories/method/how-much-fast-reserve";
import { WHEN_RATES_RISE_METHOD } from "@/stories/method/when-rates-rise";
import { WHERE_SHOULD_THE_CUTOFF_SIT_METHOD } from "@/stories/method/where-should-the-cutoff-sit";
import { WHERE_SHOULD_THE_SPEED_BE_HELD_METHOD } from "@/stories/method/where-should-the-speed-be-held";

/**
 * Method pages by slug. Allow-listed like visuals: the route renders only
 * slugs listed here, and the validator requires one for every story whose
 * manifest declares a `method` block.
 */
export const METHOD_REGISTRY: Record<string, StoryMethod> = {
  "how-much-fast-reserve": HOW_MUCH_FAST_RESERVE_METHOD,
  "when-rates-rise": WHEN_RATES_RISE_METHOD,
  "where-should-the-cutoff-sit": WHERE_SHOULD_THE_CUTOFF_SIT_METHOD,
  "where-should-the-speed-be-held": WHERE_SHOULD_THE_SPEED_BE_HELD_METHOD,
};

export function getStoryMethod(slug: string): StoryMethod | null {
  return METHOD_REGISTRY[slug] ?? null;
}
