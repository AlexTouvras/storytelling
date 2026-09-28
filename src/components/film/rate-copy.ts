import type { FieldModel } from "@/lib/sim/book-field";
import type { EvidenceKind } from "@/lib/reader/kinds";
import { eur, pct } from "@/components/film/format";

/**
 * Narration for *When Rates Rise*, one entry per beat. Beat 0 is the title
 * card over the field; the narration column only fades in with beat 1.
 */
export type RateCopy = {
  kicker: string;
  title: string;
  paragraphs: string[];
  /** Null on the title card, which quotes no figure. */
  kind: EvidenceKind | null;
};

export const RATE_BEATS = [0, 1, 2, 3, 4, 5, 6] as const;

export function rateCopyFor(beat: number, model: FieldModel): RateCopy {
  const featured = model.featured;
  const thinBefore = pct(model.summary.before.thinBalanceShare);
  const thinAfter = pct(model.summary.after.thinBalanceShare);
  const sleeve = pct(model.summary.actionableSlice.floatingThinBalanceShare);
  const rest = pct(1 - model.summary.actionableSlice.floatingThinBalanceShare);
  const income = eur(featured.incomeMonthly);
  const balance = eur(featured.balance);
  const bufferBefore = eur(featured.bufferBefore);
  const paymentBefore = eur(featured.paymentBefore);
  const paymentAfter = eur(featured.paymentAfter);

  switch (beat) {
    case 0:
      return {
        kicker: "A portfolio decision",
        title: "Where do you cut when rates rise?",
        paragraphs: [
          "Scroll follows one mortgage, then every loan in the book. The cut is the group whose payment can still rise and whose cash is already short.",
        ],
        kind: null,
      };
    case 1:
      return {
        kicker: `Loan ${featured.id} · floating · ${balance} unpaid`,
        title: "This one still has room.",
        paragraphs: [
          `Loan ${featured.id} is one floating-rate mortgage in the model, with ${balance} still unpaid. ${income} comes in each month. Essentials take their share, the payment is ${paymentBefore}, and ${bufferBefore} is left. That remainder is the buffer.`,
          "The dot is this loan. Left means less residual income. The line you are moving toward is the teaching cut: under 6% of income left. This loan is still to the right of it.",
        ],
        kind: "modelled",
      };
    case 2:
      return {
        kicker: "The coupon steps up 300 basis points",
        title: "The payment eats the buffer.",
        paragraphs: [
          `A 300 basis point rise is three percentage points on the coupon. Only this loan’s rate changes. The payment moves from ${paymentBefore} to ${paymentAfter}. Essentials and income stay put, so the buffer is what shrinks.`,
          "Nothing abstract was added to the household. Euros that used to be left over now go to the mortgage. When the dot crosses the line, residual income is under 6%.",
        ],
        kind: "modelled",
      };
    case 3:
      return {
        kicker: "Seed 42 · modelled book",
        title: "Now the rest of the book.",
        paragraphs: [
          "That loan is one name. The cloud is 2,000 amortising mortgages, generated from a fixed seed so the same picture can be replayed. About 35% of unpaid balance is floating. In this model the largest balances are made floating first — a choice, not a census.",
          "Across is residual income, more room to the right. Up is unpaid balance, so larger loans sit higher. Cyan is a fixed coupon. Violet can still reprice. The line is still 6% of income left.",
        ],
        kind: "modelled",
      };
    case 4:
      return {
        kicker: "Fixed coupons do not move",
        title: "Only the floating loans travel.",
        paragraphs: [
          "The same 300 basis point shock now hits every floating loan. Fixed coupons stay on their old payment, which is why the cyan dots do not move. A parallel rate move is not a parallel risk move.",
          `The share of balances under the line goes from ${thinBefore} to ${thinAfter}. Most of the book is still fine. The useful question is which balances crossed, and whether “thin” is already the right watchlist.`,
        ],
        kind: "modelled",
      };
    case 5:
      return {
        kicker: "Floating and already thin",
        title: "This is the sleeve.",
        paragraphs: [
          "Thin on its own mixes two kinds of loan. Some were already short of room and are fixed: this hike does not change their payment. The balances that matter for a rate shock are the ones that can still reprice and are already under the line.",
          `In this book that sleeve is ${sleeve} of unpaid principal. The dimmed dots are outside it. What stays bright is the watchlist.`,
        ],
        kind: "modelled",
      };
    default:
      return {
        kicker: "Where you cut",
        title: "Not the overnight rate.",
        paragraphs: [
          `The overnight rate is common to the whole book, so it cannot tell you where to look. ${rest} of balances sit outside the sleeve. The cut starts with the ${sleeve} that are floating and already thin.`,
          "From there the work is ordinary credit work: when those coupons reset, what the buffer is after the new payment, and which names were already in the weakest third before the hike.",
        ],
        kind: "modelled",
      };
  }
}

export function rateNarration(model: FieldModel): RateCopy[] {
  return RATE_BEATS.map((beat) => rateCopyFor(beat, model));
}
