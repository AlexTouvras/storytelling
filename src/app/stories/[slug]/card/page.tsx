import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoryShareCard } from "@/components/onepager/StoryShareCard";
import { listManifestSlugs, loadStoryManifest } from "@/lib/loadStory";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listManifestSlugs()
    .filter((slug) => {
      try {
        return Boolean(loadStoryManifest(slug).reader);
      } catch {
        return false;
      }
    })
    .map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const manifest = loadStoryManifest(slug);
    return {
      title: manifest.meta.hero?.title ?? manifest.meta.title,
      description: manifest.meta.summary,
      robots: { index: false },
    };
  } catch {
    return { title: "Story" };
  }
}

export default async function StoryCardPage({ params }: PageProps) {
  const { slug } = await params;
  let manifest;
  try {
    manifest = loadStoryManifest(slug);
  } catch {
    notFound();
  }
  if (!manifest.reader) notFound();

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] items-center bg-void">
      <StoryShareCard
        slug={slug}
        title={manifest.meta.hero?.title ?? manifest.meta.title}
        question={manifest.meta.hero?.question ?? manifest.meta.summary}
        data={manifest.meta.summary}
        orientation={manifest.reader.orientation}
      />
    </div>
  );
}
