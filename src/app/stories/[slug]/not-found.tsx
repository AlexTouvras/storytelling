import Link from "next/link";

export default function StoryNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-display text-section text-white">Story not found</h1>
      <p className="mt-3 text-[oklch(var(--muted))]">
        No validated manifest exists for this slug.
      </p>
      <Link
        href="/"
        className="focus-ring mt-8 inline-block text-neon-cyan hover:underline"
      >
        Back home
      </Link>
    </div>
  );
}
