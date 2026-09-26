/**
 * Cue table → frame, for lectures.
 *
 * Identical in substance to `frame.ts` / `cutoff-frame.ts`, with one difference:
 * the poses are not hard-coded per film, they come from a validated manifest. A
 * lecture is a paced artifact, so its table is also its running order — hence
 * `beatStarts`, which lets a presenter jump to a beat and lets a test scrub to
 * one.
 */

import { clamp01, lerp, smoothstep } from "@/components/film/craft";
import { checkCueTable, holdAt, type Hold } from "@/components/film/cue-table";
import {
  AGENTIC_STACK_RENDERED,
  type AgenticStackCue,
  type LectureManifest,
} from "@/lectures/schemas/lecture";

type Channel = (typeof AGENTIC_STACK_RENDERED)[number];

export type LectureFrame = Record<Channel, number> & {
  beat: number;
  /** 0–1 how far into a span where no drawn channel moves. */
  hold: number;
};

export type LectureTimeline = {
  id: string;
  holds: readonly Hold[];
  /** Progress at which each beat first appears, indexed by beat number. */
  beatStarts: readonly number[];
  frameAt: (progress: number, reduced?: boolean) => LectureFrame;
  beatAt: (progress: number) => number;
};

function cueIndex(cues: readonly AgenticStackCue[], progress: number): number {
  const p = clamp01(progress);
  let index = 0;
  for (let i = 0; i < cues.length; i++) {
    if (p >= cues[i].at) index = i;
  }
  return index;
}

function toFrame(cue: AgenticStackCue, hold: number): LectureFrame {
  const frame = { beat: cue.beat, hold } as LectureFrame;
  for (const key of AGENTIC_STACK_RENDERED) frame[key] = cue[key];
  return frame;
}

export function buildLectureTimeline(manifest: LectureManifest): LectureTimeline {
  const cues = manifest.cues;
  const holds = checkCueTable(manifest.id, cues, {
    rendered: AGENTIC_STACK_RENDERED,
  });

  const beatStarts: number[] = [];
  for (const cue of cues) {
    if (beatStarts[cue.beat] === undefined) beatStarts[cue.beat] = cue.at;
  }

  const beatAt = (progress: number) => cues[cueIndex(cues, progress)].beat;

  const frameAt = (progress: number, reduced = false): LectureFrame => {
    const p = clamp01(progress);
    const i = cueIndex(cues, p);

    // Reduced motion snaps pose to pose: the reader still reaches every beat,
    // and the craft layer is handed a life of 0 by the canvas host.
    if (reduced) return toFrame(cues[i], 0);

    const a = cues[i];
    const b = cues[Math.min(i + 1, cues.length - 1)];
    const span = b.at - a.at;
    const t = span <= 0 ? 0 : smoothstep((p - a.at) / span);

    const frame = { beat: a.beat, hold: holdAt(holds, p) } as LectureFrame;
    for (const key of AGENTIC_STACK_RENDERED) {
      frame[key] = lerp(a[key], b[key], t);
    }
    return frame;
  };

  return { id: manifest.id, holds, beatStarts, frameAt, beatAt };
}
