import { useEffect, useState, type RefObject } from "react";

/**
 * Tracks which scroll chapter is in the reading band via IntersectionObserver.
 * Returns the active beat id (data-beat on each chapter section).
 */
export function useActiveBeat(
  rootRef: RefObject<HTMLElement | null>,
  beatIds: string[],
  fallback: string,
): string {
  const [active, setActive] = useState(fallback);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const sections = beatIds
      .map((id) => root.querySelector<HTMLElement>(`[data-beat="${id}"]`))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!sections.length) return;

    const ratios = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.beat;
          if (!id) continue;
          ratios.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        let best = fallback;
        let bestRatio = 0;
        for (const id of beatIds) {
          const r = ratios.get(id) ?? 0;
          if (r > bestRatio) {
            bestRatio = r;
            best = id;
          }
        }
        if (bestRatio > 0) setActive(best);
      },
      {
        // Reading band: middle of the viewport
        root: null,
        rootMargin: "-28% 0px -42% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const el of sections) observer.observe(el);
    return () => observer.disconnect();
  }, [rootRef, beatIds, fallback]);

  return active;
}
