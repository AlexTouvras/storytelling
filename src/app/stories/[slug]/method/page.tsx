import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MethodPage } from "@/components/reader/MethodPage";
import { loadStoryManifest } from "@/lib/loadStory";
import { METHOD_REGISTRY, getStoryMethod } from "@/stories/method/registry";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(METHOD_REGISTRY).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const manifest = loadStoryManifest(slug);
  return {
    title: `Method · ${manifest.meta.title}`,
    description: `Data, schema, calculations and limitations behind ${manifest.meta.title}.`,
    robots: { index: false },
  };
}

export default async function StoryMethodPage({ params }: PageProps) {
  const { slug } = await params;
  const method = getStoryMethod(slug);
  if (!method) notFound();
  return <MethodPage manifest={loadStoryManifest(slug)} method={method} />;
}
