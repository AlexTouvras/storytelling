import { describe, expect, it } from "vitest";
import {
  EXHIBIT_GEOMETRY,
  requiredExtent,
  runnerPhase,
} from "@/components/lecture/draw-exhibit";
import type { LectureFrame } from "@/components/lecture/lecture-frame";

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
    const d = Math.abs(((p - EXHIBIT_GEOMETRY.GATE_U + 1.5) % 1) - 0.5);
    return d < window;
  });
  return near.length / phases.length;
}

function frame(over: Partial<LectureFrame> = {}): LectureFrame {
  return {
    beat: 0,
    hold: 0,
    spanY: 2.3,
    cy: 0.25,
    model: 1,
    corpus: 0,
    ground: 0,
    loop: 0,
    runner: 0,
    reach: 0,
    peers: 0,
    gate: 0,
    focus: 0,
    focusOn: 0,
    thin: 0,
    ...over,
  };
}

describe("the control cycle runner", () => {
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

  it("keeps the same lap time, so the cycle still reads as a cycle", () => {
    // The brake is a reparameterisation, not a slowdown: a lap is a lap.
    const phases = lap(1);
    expect(phases[phases.length - 1] - phases[0]).toBeGreaterThan(0.9);
  });

  it("puts Approve on the side of the cycle that follows act", () => {
    const { GATE_U } = EXHIBIT_GEOMETRY;
    // Clockwise from plan, the act → observe side runs from a quarter to a half
    // of the perimeter once the rectangle's aspect is taken into account.
    expect(GATE_U).toBeGreaterThan(0.25);
    expect(GATE_U).toBeLessThan(0.5);
  });
});

describe("exhibit geometry", () => {
  it("keeps the rows in stack order, each below the rule that opens it", () => {
    const { ROWS, ROW_END } = EXHIBIT_GEOMETRY;
    ROWS.forEach((row, i) => {
      expect(row.top).toBeLessThan(row.y);
      const bottom = i < ROWS.length - 1 ? ROWS[i + 1].top : ROW_END;
      expect(row.y).toBeLessThan(bottom);
      if (i > 0) expect(ROWS[i - 1].y).toBeLessThan(row.y);
    });
  });

  it("fits inside the widest camera span the cue table asks for", () => {
    const { ROWS, ROW_END, WIDEST_SPAN } = EXHIBIT_GEOMETRY;
    expect(ROW_END - ROWS[0].top).toBeLessThanOrEqual(WIDEST_SPAN);
  });

  it("clears the rules above and below the control cycle", () => {
    const { ROWS, CYCLE_DY, CYCLE_BOX_H } = EXHIBIT_GEOMETRY;
    const agent = ROWS[2];
    expect(agent.y - CYCLE_DY - CYCLE_BOX_H / 2).toBeGreaterThan(agent.top);
    expect(agent.y + CYCLE_DY + CYCLE_BOX_H / 2).toBeLessThan(ROWS[3].top);
  });

  it("slides the highlight between rows instead of cutting", () => {
    const { focusBand, ROWS } = EXHIBIT_GEOMETRY;
    const second = focusBand(1);
    const third = focusBand(2);
    const between = focusBand(1.5);
    expect(second.top).toBe(ROWS[1].top);
    expect(third.top).toBe(ROWS[2].top);
    expect(between.top).toBeGreaterThan(second.top);
    expect(between.top).toBeLessThan(third.top);
  });

  it("only ever widens the frame as rows are built", () => {
    // The cue table owns the vertical span; the width is derived, and it has to
    // grow monotonically or a row the reader was just shown would be cropped.
    const steps: LectureFrame[] = [
      frame(),
      frame({ corpus: 1 }),
      frame({ corpus: 1, loop: 1 }),
      frame({ corpus: 1, loop: 1, gate: 1 }),
      frame({ corpus: 1, loop: 1, gate: 1, reach: 1 }),
      frame({ corpus: 1, loop: 1, gate: 1, reach: 1, peers: 1 }),
    ];
    let previous = requiredExtent(steps[0]);
    for (const step of steps.slice(1)) {
      const next = requiredExtent(step);
      expect(next.x0).toBeLessThanOrEqual(previous.x0);
      expect(next.x1).toBeGreaterThanOrEqual(previous.x1);
      previous = next;
    }
  });

  it("widens continuously, so a frame never steps sideways", () => {
    const start = requiredExtent(frame({ peers: 0 }));
    let widest = start.x1 - start.x0;
    for (let k = 0; k <= 1.0001; k += 0.02) {
      const { x0, x1 } = requiredExtent(frame({ peers: Math.min(1, k) }));
      const width = x1 - x0;
      expect(width - widest).toBeLessThan(0.2);
      widest = width;
    }
  });
});
