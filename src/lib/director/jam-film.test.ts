import { describe, expect, it } from "vitest";
import { jamBeatAt, jamFrameAt, phoneMomentAt, phoneReadAt } from "@/lib/director/jam-film";

describe("jam film timeline", () => {
  it("teaches the pocket where a wide screen and a phone both land", () => {
    const at = phoneReadAt(2);
    expect(jamBeatAt(at)).toBe(2);
    expect(jamBeatAt(phoneMomentAt(at).film)).toBe(2);
  });

  it("cuts to a finished pose when motion is reduced", () => {
    const frame = jamFrameAt(0.22, true);
    expect(frame.beat).toBe(1);
    expect(frame.open === 0 || frame.open === 1).toBe(true);
  });

  it("opens the cars before the brake cue and closes them before the pullback", () => {
    expect(jamFrameAt(0.3).open).toBeGreaterThan(0.9);
    expect(jamFrameAt(0.5).open).toBe(0);
    expect(jamFrameAt(0.5).trace).toBeGreaterThan(0.5);
    expect(jamFrameAt(0.9).pull).toBe(1);
  });
});
