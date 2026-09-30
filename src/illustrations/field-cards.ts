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
 * `lines` is that rotation: six judgements for a host that does not know
 * where the reader is. `sections` is one line per block of the sheet, in
 * document order. The overlay shows the section under the cursor, or — on
 * a phone, where there is no cursor — the section crossing the reading
 * band as the sheet scrolls. Headings match the card's `h1` / `h2` text.
 *
 * Lines are judgements, not measurements. The bubble font is printable ASCII.
 * Headings keep the card's own punctuation; they are never drawn.
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
    sections: [
      { heading: "Agentic AI is a loop, not a menu", line: "This card is which layer to use, and which to leave out." },
      { heading: "Problem → use → example", line: "Match the real problem to the thinnest layer that solves it." },
      { heading: "Framework picker", line: "A framework is how you build the layer you already chose." },
      { heading: "Rules vs skills", line: "Rules stay on. A skill loads when the task matches." },
      { heading: "Ladder + gates", line: "Climb one rung at a time. Earn A2A, do not start there." },
      { heading: "Anti-patterns", line: "An agent for plain questions is the usual overbuild." },
      { heading: "Always on", line: "If you cannot stop it, you do not ship it." },
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
    sections: [
      { heading: "Delivery is a sequence, not a ticket", line: "This card is evidence before the change is called done." },
      { heading: "Problem → use → example", line: "Name the outcome and the owner. A title is not that." },
      { heading: "Tool picker", line: "Flags and pipelines are lanes. The sequence is the call." },
      { heading: "Ready vs green", line: "Pipeline green is not the same as held in production." },
      { heading: "Ladder + gates", line: "Write the rollback before anyone says it is ready." },
      { heading: "Anti-patterns", line: "Not yet is a decision. Sequence beats a pile of drafts." },
      { heading: "Always on", line: "Owner, window, proof, and rollback stay on every change." },
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
    sections: [
      { heading: "Analytics is a stack, not a dashboard", line: "This card is when a number is real enough to use." },
      { heading: "Problem → use → example", line: "Name the question and the grain before the tool." },
      { heading: "Tool picker", line: "The tool is a lane. Add one only if the decision needs it." },
      { heading: "Definition vs report", line: "One definition, owned upstream. Do not remix it." },
      { heading: "Ladder + gates", line: "A dashboard reads gold, not the raw landing zone." },
      { heading: "Anti-patterns", line: "If the gap has no named cause, do not publish it." },
      { heading: "Always on", line: "Question, grain, definition, and a check stay on." },
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
    sections: [
      { heading: "Write the plan before the code", line: "This card is the order of the work, before the code." },
      { heading: "Problem → use → example", line: "Write the acceptance down. A chat ticket is not a plan." },
      { heading: "Tool picker", line: "The picker is a lane. The plan still sets the order." },
      { heading: "What has to be written down", line: "Write what done means while the plan is still cheap." },
      { heading: "Ladder + gates", line: "Small tested changes. Skipping the test does not buy speed." },
      { heading: "Anti-patterns", line: "A rubber stamp after the fact is not a review." },
      { heading: "Always on", line: "Plan, review, and the test stay in the loop." },
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
    sections: [
      { heading: "Credit risk is for a lifetime. Act early.", line: "This card is the life of the loan. Act before the loss." },
      { heading: "Problem → use → example", line: "A score at application is not the loss you hold." },
      { heading: "Tool picker", line: "Standards name the job. A score is not the decision." },
      { heading: "Decision vs number", line: "Name the increase in risk before you book the number." },
      { heading: "Ladder + gates", line: "Watch the book in production. A launch deck is not that." },
      { heading: "Anti-patterns", line: "A missed payment is a trigger, not a debate." },
      { heading: "Always on", line: "Originate, watch, stage, then hold the loss." },
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
    sections: [
      { heading: "Turn evidence into a decision", line: "This card turns evidence into a decision." },
      { heading: "Problem → use → example", line: "Start with the decision, not the dataset." },
      { heading: "Representation picker", line: "A bar when larger is the claim. A custom mark is earned." },
      { heading: "Story spec (write this down)", line: "Write the question, the claim, and what would change it." },
      { heading: "Ladder + gates", line: "The story never upgrades evidence into certainty." },
      { heading: "Kill the story when…", line: "If nothing creates a next scene, it is analysis." },
      { heading: "Craft · inside every stage", line: "End on what changes, and what is still uncertain." },
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
