import Link from "next/link";

export type StoryShare = {
  slug: string;
  title: string;
  question: string;
  /** Where the numbers come from, in one or two sentences. */
  data: string;
  /** The plain account of the story, with no term to learn. */
  orientation: string;
};

/** One screen to share. The film is the scroll; the method page is the documentation. */
export function StoryShareCard({ slug, title, question, data, orientation }: StoryShare) {
  return (
    <article className="mx-auto flex w-full max-w-xl flex-col gap-6 px-5 pb-6 pt-20 sm:px-8">
      <header className="space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">Data</p>
        <p className="text-sm leading-relaxed text-white/70">{data}</p>
        <h1 className="font-display text-3xl leading-[1.05] tracking-tight text-white sm:text-4xl">{title}</h1>
        <p className="text-lg leading-snug text-white/85">{question}</p>
      </header>
      <p className="text-base leading-relaxed text-white/70">{orientation}</p>
      <nav className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:gap-8">
        <Link
          href={`/stories/${slug}/film`}
          className="focus-ring font-mono text-[11px] uppercase tracking-[0.16em] text-neon-cyan"
        >
          The film →
        </Link>
        <Link
          href={`/stories/${slug}/method`}
          className="focus-ring font-mono text-[11px] uppercase tracking-[0.16em] text-white/70 hover:text-white"
        >
          Method and data →
        </Link>
      </nav>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">
        One screen to share. The film is the scroll.
      </p>
    </article>
  );
}
