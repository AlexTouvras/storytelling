import { listManifestSlugs, loadStoryManifest } from "@/lib/loadStory";
import { FlagshipLanding } from "@/components/storytelling/FlagshipLanding";

/** Stories shown on the flagship index. Add slugs here when a story is ready to list. */
const LISTED_SLUGS = new Set<string>([
  "when-rates-rise",
  "where-should-the-cutoff-sit",
  "where-should-the-recovery-time-sit",
]);

export default function HomePage() {
  const stories = listManifestSlugs()
    .filter((slug) => LISTED_SLUGS.has(slug))
    .map((slug) => {
      const manifest = loadStoryManifest(slug);
      return {
        slug,
        title: manifest.meta.hero?.title ?? manifest.meta.title,
        summary: manifest.meta.summary,
        date: manifest.meta.date,
        question: manifest.meta.hero?.question,
        role: manifest.meta.role,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return <FlagshipLanding stories={stories} />;
}
