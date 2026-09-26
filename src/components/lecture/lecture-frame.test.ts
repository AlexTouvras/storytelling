import { describe, expect, it } from "vitest";
import { loadLecture } from "@/lectures/load";
import { buildLectureTimeline } from "@/components/lecture/lecture-frame";
import { AGENTIC_STACK_RENDERED } from "@/lectures/schemas/lecture";

const lecture = loadLecture("agentic-ai");

describe("agentic-ai lecture timeline", () => {
  it("loads, so the manifest parses and every card row it cites exists", () => {
    expect(lecture).not.toBeNull();
  });

  const { manifest } = lecture!;
  const timeline = buildLectureTimeline(manifest);

  it("opens on the first cue and ends on the last", () => {
    const open = timeline.frameAt(0);
    for (const key of AGENTIC_STACK_RENDERED) {
      expect(open[key]).toBeCloseTo(manifest.cues[0][key], 6);
    }
    const close = timeline.frameAt(1);
    const last = manifest.cues[manifest.cues.length - 1];
    for (const key of AGENTIC_STACK_RENDERED) {
      expect(close[key]).toBeCloseTo(last[key], 6);
    }
  });

  it("only ever pulls the camera back", () => {
    // The craft rule the landing flight paid for: travel increases, then stops.
    // A lecture that zoomed back in would drop a layer the reader was just shown.
    let lastSpan = -Infinity;
    let lastCy = -Infinity;
    for (const cue of manifest.cues) {
      expect(cue.spanY).toBeGreaterThanOrEqual(lastSpan);
      expect(cue.cy).toBeGreaterThanOrEqual(lastCy);
      lastSpan = cue.spanY;
      lastCy = cue.cy;
    }
  });

  it("reaches every beat in order, and never skips one", () => {
    const seen: number[] = [];
    for (let p = 0; p <= 1.0001; p += 0.002) {
      const beat = timeline.beatAt(Math.min(1, p));
      if (seen[seen.length - 1] !== beat) seen.push(beat);
    }
    expect(seen).toEqual(manifest.beats.map((b) => b.beat));
  });

  it("puts each beat's start inside that beat", () => {
    manifest.beats.forEach((beat) => {
      const at = timeline.beatStarts[beat.beat];
      expect(at).toBeDefined();
      expect(timeline.beatAt(at + 0.001)).toBe(beat.beat);
    });
  });

  it("interpolates between cues, and snaps under reduced motion", () => {
    const a = manifest.cues[3];
    const b = manifest.cues[4];
    const mid = (a.at + b.at) / 2;
    const tweened = timeline.frameAt(mid);
    const snapped = timeline.frameAt(mid, true);
    expect(tweened.spanY).toBeGreaterThan(a.spanY);
    expect(tweened.spanY).toBeLessThan(b.spanY);
    expect(snapped.spanY).toBe(a.spanY);
    expect(snapped.hold).toBe(0);
  });

  it("declares the closing hold, and creeps through it", () => {
    const tail = timeline.holds[timeline.holds.length - 1];
    expect(tail).toBeDefined();
    expect(tail.to).toBe(1);
    const mid = (tail.from + tail.to) / 2;
    expect(timeline.frameAt(mid).hold).toBeGreaterThan(0.5);
  });
});
