/**
 * One robot for every homepage field card.
 *
 * `robot.riv` crossfades six text runs. Each run is bound to a view-model
 * string (`line`, then `line2` … `line6`), and `accent` tints the eyes, the
 * chest, the speaker, and the bubble edge. A host writes those strings and
 * the colour. It does not need its own character.
 *
 * The defaults baked into the file are the Agentic AI card, because that
 * card's `robot.js` still sets only `line` (the opener it reads from
 * `AiFieldCard.tsx` as `CARD_LINE`). The other cards set all six strings.
 *
 * Lines are judgements, not measurements. The bubble font is printable ASCII.
 */

export const TUCK_LINE = "Tap me and I'll wait in the corner.";

/** Homepage neon, sRGB. SDLC shares Delivery violet; the story card shares AI cyan. */
export const FIELD_CARD_ACCENTS = [
  { id: "ai", label: "AI", rgb: [0, 210, 211] },
  { id: "delivery", label: "Delivery", rgb: [157, 91, 244] },
  { id: "analytics", label: "Analytics", rgb: [57, 134, 228] },
  { id: "credit", label: "Credit risk", rgb: [240, 166, 70] },
] as const;

export type FieldCardAccentId = (typeof FIELD_CARD_ACCENTS)[number]["id"];

export const FIELD_CARDS = [
  {
    id: "ai",
    label: "AI",
    title: "Agentic AI field card",
    /** Overlay path under `/stories` and `/lab`. Orbit serves the stories one. */
    route: "ai-card",
    url: "https://alextouvras.github.io/agentic-ai-field-card/",
    accent: "ai",
    lines: [
      "This card is which layer to use, and which to leave out.",
      "Start at the thinnest layer that solves the job.",
      "RAG grounds answers. An agent is for work that branches.",
      "MCP reaches a live system. Do not fine-tune facts.",
      "If you cannot stop it, you do not ship it.",
      TUCK_LINE,
    ],
  },
  {
    id: "delivery",
    label: "Delivery",
    title: "Technology delivery field card",
    route: "delivery-card",
    url: "https://alextouvras.github.io/technology-delivery-field-card/",
    accent: "delivery",
    lines: [
      "This card is evidence before the change is called done.",
      "Name the outcome and the owner. A title is not that.",
      "Pipeline green is not the same as held in production.",
      "Write the rollback before anyone says it is ready.",
      "Not yet is a decision. Sequence beats a pile of drafts.",
      TUCK_LINE,
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    title: "Data analytics field card",
    route: "analytics-card",
    url: "https://alextouvras.github.io/data-analytics-field-card/",
    accent: "analytics",
    lines: [
      "This card is when a number is real enough to use.",
      "Name the question and the grain before the tool.",
      "One definition, owned upstream. Do not remix it.",
      "A dashboard reads gold, not the raw landing zone.",
      "If the gap has no named cause, do not publish it.",
      TUCK_LINE,
    ],
  },
  {
    id: "sdlc",
    label: "SDLC",
    title: "SDLC field card",
    route: "sdlc-card",
    url: "https://alextouvras.com/sdlc-field-card/",
    accent: "delivery",
    lines: [
      "This card is the order of the work, before the code.",
      "Write what done means while the plan is still cheap.",
      "Security sits in design and in test, not after the demo.",
      "A test that cannot fail for the right reason is out.",
      "Release, proof, and cutover live on the Delivery card.",
      TUCK_LINE,
    ],
  },
  {
    id: "credit",
    label: "Credit risk",
    title: "Credit risk field card",
    route: "credit-risk-card",
    url: "https://alextouvras.com/credit-risk-field-card/",
    accent: "credit",
    lines: [
      "This card is the life of the loan. Act before the loss.",
      "A score at application is not the loss you hold.",
      "Name the increase in risk before you book the number.",
      "Watch the book in production. A launch deck is not that.",
      "A missed payment is a trigger, not a debate.",
      TUCK_LINE,
    ],
  },
  {
    id: "story",
    label: "Story",
    title: "Storytelling field card",
    route: "story-card",
    url: "https://alextouvras.com/story-field-card/",
    accent: "ai",
    lines: [
      "This card turns evidence into a decision.",
      "Start with the decision, not the dataset.",
      "The story never upgrades evidence into certainty.",
      "If nothing creates a next scene, it is analysis.",
      "End on what changes, and what is still uncertain.",
      TUCK_LINE,
    ],
  },
] as const;

export type FieldCardId = (typeof FIELD_CARDS)[number]["id"];
export type FieldCard = (typeof FIELD_CARDS)[number];

export function fieldCard(id: FieldCardId): FieldCard {
  const card = FIELD_CARDS.find((c) => c.id === id);
  if (!card) throw new Error(`unknown field card ${id}`);
  return card;
}

export function fieldCardAccent(id: FieldCardId) {
  const accent = FIELD_CARD_ACCENTS.find((a) => a.id === fieldCard(id).accent);
  if (!accent) throw new Error(`unknown accent for ${id}`);
  return accent;
}
