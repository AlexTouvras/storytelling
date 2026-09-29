import { describe, expect, it } from "vitest";
import {
  FIELD_RANGE,
  GRID_HOLDS,
  GRID_POSES,
  GRID_RUNS,
  GRID_BEAT_STARTS,
  SUBTITLE_BAND,
  WIDE_MIN,
  fieldPoint,
  gridBeatAt,
  gridFrameAt,
  gridLayout,
  gridRunAt,
  phoneMomentAt,
  phoneReadAt,
  phoneTrackAt,
} from "@/lib/director/grid-film";
import { GRID_BEATS } from "@/components/film/grid-copy";
import { gridFilmData } from "@/components/film/grid-film-data";

describe("grid film timeline", () => {
  it("walks the six beats in order and ends on the decision", () => {
    const beats = [...new Set(GRID_POSES.map((p) => p.beat))];
    expect(beats).toEqual(GRID_BEATS.map((_, i) => i));
    expect(gridBeatAt(1)).toBe(GRID_BEATS.length - 1);
  });

  it("holds on the hour until the pullback, and ends wide", () => {
    for (const p of [0, 0.2, 0.5, 0.8]) expect(gridFrameAt(p).focus).toBe(1);
    expect(gridFrameAt(1).focus).toBe(0);
    expect(gridFrameAt(1).field).toBe(1);
  });

  it("only opens the machine once the trace has folded away", () => {
    for (let p = 0; p <= 1; p += 0.005) {
      const f = gridFrameAt(p);
      expect(f.trace * f.open, `at ${p.toFixed(3)}`).toBeLessThan(0.02);
    }
  });

  it("fires each run's trip while the machine is open, in its own segment", () => {
    GRID_RUNS.forEach((run, i) => {
      expect(gridRunAt(run.cue.at)).toBe(i);
      expect(gridFrameAt(run.cue.at).open).toBeGreaterThan(0.99);
      expect(run.cue.at).toBeGreaterThan(run.from);
    });
    expect(GRID_RUNS.map((r) => [r.light, r.reserve])).toEqual([
      [false, false],
      [true, false],
      [true, true],
    ]);
  });

  it("lists holds for the camera to creep through", () => {
    expect(GRID_HOLDS.length).toBeGreaterThanOrEqual(4);
  });

  it("cuts under reduced motion: no channel is ever between two poses", () => {
    const values = new Set(GRID_POSES.map((p) => p.pen));
    for (let p = 0; p <= 1; p += 0.01) expect(values.has(gridFrameAt(p, true).pen)).toBe(true);
    expect(gridFrameAt(0.05, true).pen).toBe(60);
  });
});

describe("grid layout", () => {
  it("gives the picture the frame above the subtitle on a laptop", () => {
    const laptop = gridLayout({ width: 1280, height: 800 });
    expect(laptop.pictureBottom).toBeLessThanOrEqual(800 - SUBTITLE_BAND);
    expect(laptop.screen.x).toBeGreaterThan(0.4 * 1280);
    expect(laptop.screen.x).toBeLessThan(0.6 * 1280);
    expect(laptop.field.width).toBeGreaterThan(0.7 * 1280);
    expect(laptop.field.y + laptop.field.height).toBeLessThanOrEqual(laptop.pictureBottom);
  });

  it("gives the phone picture the whole screen above the subtitle", () => {
    for (const vp of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 412, height: 780 }]) {
      const phone = gridLayout(vp);
      expect(phone.pictureBottom).toBeLessThanOrEqual(vp.height - SUBTITLE_BAND);
      const low = (r: { y: number; height: number }) => phone.screen.y + r.y + r.height;
      expect(low(phone.machine) + 36).toBeLessThanOrEqual(phone.pictureBottom + 0.5);
      expect(low(phone.chart)).toBeLessThanOrEqual(phone.pictureBottom);
      expect(low(phone.trace)).toBeLessThanOrEqual(phone.pictureBottom);
      expect(phone.field.y + phone.field.height).toBeLessThanOrEqual(phone.pictureBottom);
      expect(phone.machine.width).toBeGreaterThanOrEqual(0.85 * vp.width);
    }
  });

  it("switches to the side-by-side layout where the narration moves into its column", () => {
    expect(gridLayout({ width: WIDE_MIN - 1, height: 800 }).wide).toBe(false);
    expect(gridLayout({ width: WIDE_MIN, height: 800 }).wide).toBe(true);
  });

  it("keeps every drawn sample of the trip above the axis bottom, and shows the floor before the fall", () => {
    const { trace, sampleSeconds, onsetSeconds } = gridFilmData();
    for (let p = 0; p <= 0.4; p += 0.002) {
      const f = gridFrameAt(p);
      if (f.trace < 0.5) continue;
      const first = Math.max(0, Math.floor(f.t0 / sampleSeconds));
      const last = Math.min(trace.length - 1, Math.floor(Math.min(f.pen, f.t1) / sampleSeconds));
      const drawn = trace.slice(first, last + 1);
      if (drawn.length) expect(Math.min(...drawn), `at ${p.toFixed(3)}`).toBeGreaterThanOrEqual(f.yLo);
      if (f.pen > onsetSeconds + 1) expect(f.yLo, `at ${p.toFixed(3)}`).toBeLessThan(49);
    }
  });

  it("places an hour inside the field", () => {
    const { field } = gridLayout({ width: 1280, height: 800 });
    const p = fieldPoint(field, 7310, 8760, 169.6, FIELD_RANGE);
    expect(p.x).toBeGreaterThan(field.x);
    expect(p.x).toBeLessThan(field.x + field.width);
    expect(p.y).toBeGreaterThan(field.y);
    expect(p.y).toBeLessThan(field.y + field.height);
  });
});

describe("phone reading schedule", () => {
  it("raises each beat's narration while the picture holds, then lowers it for the beat to play", () => {
    GRID_BEAT_STARTS.forEach((start, beat) => {
      const read = phoneMomentAt(phoneReadAt(beat));
      expect(read.card, `beat ${beat}`).toBe(1);
      expect(read.film).toBe(start);
      expect(gridBeatAt(read.film)).toBe(beat);
    });
    const mid = (GRID_BEAT_STARTS[2] + GRID_BEAT_STARTS[3]) / 2;
    expect(phoneMomentAt(phoneTrackAt(mid))).toEqual({ film: expect.closeTo(mid, 6), card: 0 });
  });

  it("never runs the film backwards, and reaches both ends", () => {
    let last = -1;
    for (let q = 0; q <= 1.0000001; q += 0.001) {
      const { film } = phoneMomentAt(q);
      expect(film).toBeGreaterThanOrEqual(last);
      last = film;
    }
    expect(phoneMomentAt(0)).toEqual({ film: 0, card: 1 });
    expect(phoneMomentAt(1).film).toBeCloseTo(1, 9);
    expect(phoneMomentAt(1).card).toBe(1);
  });

  it("keeps the narration down whenever the picture is moving", () => {
    for (let q = 0; q < 0.999; q += 0.0005) {
      const a = phoneMomentAt(q);
      const b = phoneMomentAt(q + 0.0005);
      const moving = b.film > a.film && !GRID_BEAT_STARTS.includes(b.film);
      if (moving && gridBeatAt(b.film) < GRID_BEAT_STARTS.length - 1) expect(b.card, `at ${q.toFixed(4)}`).toBe(0);
    }
  });

  it("maps a film moment to the track and back", () => {
    for (const t of [0.05, 0.2, 0.31, 0.5, 0.7, 0.9]) expect(phoneMomentAt(phoneTrackAt(t)).film).toBeCloseTo(t, 6);
  });
});
