import { describe, expect, it } from "vitest";
import { CAR_FT, SLOW_STRETCH_FRAMES, WINDOW_FT, slowStretchPhase, slowStretchScene } from "./slow-stretch";

const [now, later] = SLOW_STRETCH_FRAMES;

describe("slow-stretch still", () => {
  it("keeps both frames inside the window that holds the walk", () => {
    expect(now.seconds).toBe(240);
    expect(later.seconds).toBe(300);
    expect(now.clock).toBe("7:54 a.m.");
    expect(later.clock).toBe("7:55 a.m.");
    expect(now.cellFt).toBe(800);
    expect(later.cellFt).toBe(0);
    for (const frame of SLOW_STRETCH_FRAMES) {
      expect(frame.cars.length).toBeGreaterThan(0);
      for (const car of frame.cars) {
        expect(car.y).toBeGreaterThanOrEqual(0);
        expect(car.y).toBeLessThanOrEqual(WINDOW_FT);
      }
      for (let i = 1; i < frame.cars.length; i++) {
        expect(frame.cars[i].y - frame.cars[i - 1].y).toBeGreaterThan(CAR_FT);
      }
    }
  });

  it("states the walk speed only once both positions are on screen", () => {
    const early = slowStretchScene("now").svg;
    const mid = slowStretchScene("later").svg;
    const pair = slowStretchScene("pair").svg;
    expect(early).not.toContain("9.1");
    expect(mid).not.toContain("9.1");
    expect(early).not.toContain("800 feet");
    expect(mid).not.toContain("800 feet");
    expect(pair).toContain("800 feet");
    expect(pair).toContain("9.1 mph");
    expect(early).toContain("44.6");
    expect(mid).toContain("48.1");
    expect(pair).toContain("illustrative");
    expect(early).toContain("illustrative");
    expect(early).not.toContain("2005");
    expect(pair).not.toContain("2005");
  });

  it("maps the beat's cues onto now, then later, then the pair", () => {
    expect(slowStretchPhase(0, 3)).toBe("now");
    expect(slowStretchPhase(1, 3)).toBe("later");
    expect(slowStretchPhase(2, 3)).toBe("pair");
    const compact = slowStretchScene("now", { compact: true }).svg;
    expect(compact).not.toContain("9.1");
    expect(slowStretchScene("pair", { compact: true }).svg).toContain("9.1");
  });
});
