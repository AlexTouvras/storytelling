import { METHOD_REGISTRY, getStoryMethod } from "@/stories/method/registry";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(METHOD_REGISTRY).map((slug) => ({ slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const method = getStoryMethod(slug);
  if (!method) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify(method.pack, null, 1), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${slug}.json"`,
    },
  });
}
