import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "UX benefit",
  robots: { index: false, follow: false },
};

/**
 * What four checks from plugin87/ux-ui-agent-skills did on this app.
 * The kit is not installed. `node scripts/ux-benefit-demo.mjs` remeasures.
 */
export default function UxBenefitPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 pb-28 pt-24 text-white">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan/80">Lab</p>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
        Four checks, on the pages we ship
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-snug text-white/75">
        Contrast of the rendered pixels, a 24px target, a control that changes something, and words
        on the picture. Measured on the desk, the grid film, its method page, and the cut-off sleeve.
      </p>

      <section className="mt-12">
        <h2 className="font-display text-2xl tracking-tight">The cut-off chart was the benefit</h2>
        <p className="mt-3 text-base leading-relaxed text-white/70">
          The acceptance horizon already had its scale on the picture: twenty labels, and an
          accessible name that states the gate. The name was doing the work the ticks could not.
          Approval ticks in cyan at 45% measured 3.0:1. The bad-rate ticks in violet at 55% measured
          2.6:1. The word “youden”, white at 18%, measured 1.7:1. Small text needs 4.5:1.
        </p>
        <p className="mt-3 text-base leading-relaxed text-white/70">
          The ticks are now the same ink as the curves. “youden” sits to the left of its guide and
          “op” to the right, because those two cuts are half a point apart and a readable pair was
          drawing one word on top of the other. The guide strokes stay quieter than the live gate.
          After the change the sleeve has no contrast failure, on a laptop or a phone. The same pass
          lifted the desk’s Index, workload and context captions, which measured 3.8:1, and the
          figure note beside a film’s hero number.
        </p>
        <figure className="mt-6">
          <img
            src="/lab/ux-benefit/cutoff-before.png"
            alt="Cut-off sleeve before the lift. Pink outlines mark labels that failed contrast, including youden, op, and both axes."
            className="w-full rounded-lg border border-white/10"
          />
          <figcaption className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-white/55">
            Before. Pink is a label under 4.5:1. 24 of 34 text nodes on the sleeve failed.
          </figcaption>
        </figure>
        <figure className="mt-6">
          <img
            src="/lab/ux-benefit/cutoff-after.png"
            alt="Cut-off sleeve after the lift. Axis labels, youden, and op are readable and no longer outlined."
            className="w-full rounded-lg border border-white/10"
          />
          <figcaption className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-white/55">
            After. 0 of 34 failed. The sleeve is{" "}
            <Link href="/stories/where-should-the-cutoff-sit/film" className="text-neon-cyan hover:underline">
              on the film
            </Link>
            , below the scroll.
          </figcaption>
        </figure>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl tracking-tight">The method list was too thin to tap</h2>
        <p className="mt-3 text-base leading-relaxed text-white/70">
          On the grid method page, eight section links were 14px tall and 4px apart, so a 24px
          circle on one crossed the next. That fails WCAG 2.5.8. They are now at least 24px tall,
          and the same check passes on the phone. Kind badges and the Terms control are still under
          24px, and the spacing around them keeps them inside the exception, so a gate that demands
          24px on every control would be flagging things the criterion allows.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl tracking-tight">What already held</h2>
        <ul className="mt-4 space-y-3 text-base leading-relaxed text-white/70">
          <li>
            Choosing Translation on the desk moves the recommendation from GLM 5.3 Flash to
            MiMo-V2.6-Flash. Raising the cost weight moves the fit from 92.5 to 96.6. Opening every
            model shows 28 rows. The cut-off slider moves the gate from 7.5% to 11.5% and the
            chart’s name moves with it.
          </li>
          <li>
            The Terms drawer opens, Escape closes it, and focus returns to the button. The word
            “trip” opens its definition in the subtitle.
          </li>
          <li>
            With reduced motion on, the grid beat still shows the subtitle “That is a trip.” and the
            figure 49.65 Hz.
          </li>
          <li>
            The desk field and the horizon chart both draw their categories on the picture. No chart
            was a picture whose only label was an accessible name.
          </li>
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl tracking-tight">Left on the line</h2>
        <p className="mt-3 text-base leading-relaxed text-white/70">
          The “50 Hz” tick on the grid trace measures 4.47:1. The muted captions the axe suite
          already skips sit in that same band. Chasing the last three hundredths would repaint the
          house style. The misses that were actually hard to read were the ones under 3.5:1, and
          those were on the cut-off chart.
        </p>
        <p className="mt-3 font-mono text-[12px] leading-relaxed text-white/55">
          Remeasure with <span className="text-white/80">node scripts/ux-benefit-demo.mjs</span>{" "}
          while <span className="text-white/80">next dev</span> is on port 3210.
        </p>
      </section>
    </main>
  );
}
