import { cardFrameHtml } from "@/components/director/card-frame";
import { FIELD_CARDS, type FieldCardId } from "@/illustrations/field-cards";

export const dynamic = "force-dynamic";

function isCardId(id: string): id is FieldCardId {
  return FIELD_CARDS.some((card) => card.id === id);
}

/**
 * The sheet lives on another origin. A browser fetch of it is blocked when
 * that origin omits CORS on a redirect, which an iframe navigation is not.
 * This route fetches it on the server and returns the framed copy the overlay
 * puts in a sandbox.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ card: string }> }) {
  const { card: id } = await params;
  if (!isCardId(id)) return new Response("Not found", { status: 404 });
  const card = FIELD_CARDS.find((item) => item.id === id)!;
  const upstream = await fetch(card.url, { redirect: "follow" });
  if (!upstream.ok) return new Response("Upstream failed", { status: 502 });
  const html = cardFrameHtml(await upstream.text(), upstream.url || card.url);
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
