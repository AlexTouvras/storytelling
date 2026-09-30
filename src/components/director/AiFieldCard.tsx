"use client";

import { FieldCardStage } from "@/components/director/FieldCardStage";

/**
 * Opener the Agentic AI field card's `robot.js` reads from this file.
 * It must stay a double-quoted string literal on its own line. That script matches it.
 * The same sentence is `fieldCard("ai").lines[0]`.
 */
const CARD_LINE = "This card is which layer to use, and which to leave out.";

/** The Agentic AI field card. The other cards use `FieldCardStage` with their own id. */
export function AiFieldCard() {
  return (
    <div className="contents" data-card-line={CARD_LINE}>
      <FieldCardStage card="ai" />
    </div>
  );
}
