import { describe, expect, it } from "vitest";
import { runnerPhase, STACK_GEOMETRY } from "@/components/lecture/draw-stack";

/** Samples of one lap, in seconds. */
function lap(gate: number, samples = 600): number[] {
  const seconds = 1 / 0.13;
  return Array.from({ length: samples }, (_, i) =>
    runnerPhase((i / samples) * seconds, gate),
  );
}

/** Share of a lap the runner spends within `window` of the gate. */
function dwellShare(gate: number, window = 0.1): number {
  const phases = lap(gate);
  const near = phases.filter((p) => {
    const d = Math.abs(((p - STACK_GEOMETRY.GATE_U + 1.5) % 1) - 0.5);
    return d < window;
  });
  return near.length / phases.length;
}

describe("the control loop runner", () => {
  it("never runs backwards, gate or no gate", () => {
    for (const gate of [0, 0.5, 1]) {
      const phases = lap(gate);
      for (let i = 1; i < phases.length; i++) {
        // One wrap per lap is expected; everything else must advance.
        const step = phases[i] - phases[i - 1];
        if (step < -0.5) continue;
        expect(step).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("runs an even lap with no gate", () => {
    // Even means the runner is nowhere in particular: about 2 × the window.
    expect(dwellShare(0)).toBeLessThan(0.25);
  });

  it("waits at the gate once Approve is in the path", () => {
    // The pause is the teaching point of that beat, so about half the lap is
    // spent within a tenth of a lap of the bar — visibly creeping, not stopped,
    // because a frozen mark is dead air whatever it means.
    expect(dwellShare(1)).toBeGreaterThan(0.45);
  });

  it("keeps the same lap time, so the loop still reads as a loop", () => {
    // The brake is a reparameterisation, not a slowdown: a lap is a lap.
    const phases = lap(1);
    expect(phases[phases.length - 1] - phases[0]).toBeGreaterThan(0.9);
  });
});

describe("board geometry", () => {
  it("keeps the layers in stack order", () => {
    const { BAND } = STACK_GEOMETRY;
    expect(BAND.llm).toBeLessThan(BAND.rag);
    expect(BAND.rag).toBeLessThan(BAND.agent);
    expect(BAND.agent).toBeLessThan(BAND.mcp);
    expect(BAND.mcp).toBeLessThan(BAND.a2a);
  });

  it("fits inside the widest camera span the cue table asks for", () => {
    const { BAND, LOOP_R, WIDEST_SPAN } = STACK_GEOMETRY;
    const top = BAND.llm - 0.8;
    const bottom = BAND.a2a + 0.9;
    expect(bottom - top).toBeLessThanOrEqual(WIDEST_SPAN);
    // The ring must clear the rows above and below it.
    expect(BAND.agent - LOOP_R).toBeGreaterThan(BAND.rag);
    expect(BAND.agent + LOOP_R).toBeLessThan(BAND.mcp);
  });
});
