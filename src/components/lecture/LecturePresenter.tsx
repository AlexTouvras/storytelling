"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LectureSlide } from "@/components/lecture/LectureSlide";
import type { LectureBeat, LectureManifest } from "@/lectures/schemas/lecture";
import type { FieldCard } from "@/lectures/schemas/fieldCard";

type Props = {
  manifest: LectureManifest;
  card: FieldCard;
  beat: LectureBeat;
  beatNumber: number;
  /** Position in the running order, 1-based. */
  index: number;
  total: number;
  progress: number;
  playing: boolean;
  reduced: boolean;
  onTogglePlay: () => void;
  onSeek: (progress: number) => void;
  onBeat: (beat: number) => void;
  onExit: () => void;
  /** The exhibit. Passed in so the same canvas host serves both drivers. */
  children: React.ReactNode;
};

function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The podium: the same slide at projection size, with a presenter's console
 * around it.
 *
 * The console is dark and the slide is not, which is the whole trick — a glance
 * tells the speaker which half of the screen the room can see. The notes are the
 * half of a lecture a scrolling reader never needs: what to point at, what to
 * say, and what not to rush. They live in the manifest beside the reader copy,
 * so one file is the lecture.
 */
export function LecturePresenter({
  manifest,
  card,
  beat,
  beatNumber,
  index,
  total,
  progress,
  playing,
  reduced,
  onTogglePlay,
  onSeek,
  onBeat,
  onExit,
  children,
}: Props) {
  const [notesOpen, setNotesOpen] = useState(true);
  const [camera, setCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const beatNumbers = useMemo(
    () => manifest.beats.map((b) => b.beat).sort((a, b) => a - b),
    [manifest],
  );
  const nextBeat = useMemo(
    () => manifest.beats.find((b) => b.beat === beatNumber + 1) ?? null,
    [manifest, beatNumber],
  );

  const step = useCallback(
    (delta: number) => {
      const i = beatNumbers.indexOf(beatNumber);
      const target = beatNumbers[Math.min(beatNumbers.length - 1, Math.max(0, i + delta))];
      if (target !== undefined) onBeat(target);
    },
    [beatNumber, beatNumbers, onBeat],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      switch (event.key) {
        case " ":
          event.preventDefault();
          onTogglePlay();
          break;
        case "ArrowRight":
        case "PageDown":
          event.preventDefault();
          step(1);
          break;
        case "ArrowLeft":
        case "PageUp":
          event.preventDefault();
          step(-1);
          break;
        case "n":
        case "N":
          setNotesOpen((open) => !open);
          break;
        case "Escape":
          onExit();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit, onTogglePlay, step]);

  useEffect(() => {
    if (!camera) return;
    let stream: MediaStream | null = null;
    let cancelled = false;

    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 640 }, audio: false })
      .then((granted) => {
        if (cancelled) {
          granted.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = granted;
        setCameraError(null);
        if (videoRef.current) videoRef.current.srcObject = granted;
      })
      .catch(() => {
        if (!cancelled) {
          setCameraError("No camera available in this context.");
          setCamera(false);
        }
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [camera]);

  const elapsed = progress * manifest.presentSeconds;
  const chip =
    "focus-ring border border-white/25 px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-white/75 transition hover:border-white/50";

  return (
    <div
      data-testid="lecture-podium"
      className="fixed inset-0 z-50 flex flex-col bg-steel-deep text-white"
    >
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div
          data-testid="film-stage"
          data-beat={beatNumber}
          className="relative flex min-h-0 flex-1 items-center justify-center p-2.5 md:p-4"
        >
          {/* Letterboxed to the reader's own slide shape, so a rehearsal in the
              browser is a rehearsal of what the room will see. */}
          <div className="flex h-full w-full md:h-auto md:max-h-full md:aspect-[16/10]">
            <LectureSlide
              manifest={manifest}
              card={card}
              beat={beat}
              index={index}
              total={total}
              progress={progress}
              board={children}
              variant="present"
            />
          </div>
          {camera ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="absolute bottom-6 right-6 h-28 w-44 border border-white/25 object-cover shadow-lg md:h-36 md:w-56"
            />
          ) : null}
        </div>

        {notesOpen ? (
          <aside
            data-testid="speaker-notes"
            className="max-h-[40%] shrink-0 overflow-y-auto border-t border-white/12 px-4 py-3 md:max-h-none md:w-[19rem] md:border-l md:border-t-0 md:px-5 md:py-5 lg:w-[22rem]"
          >
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Speaker notes · section {index} of {total}
            </p>
            <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-white/80">
              {beat.notes.map((note) => (
                <li key={note.slice(0, 24)} className="border-l border-white/20 pl-3">
                  {note}
                </li>
              ))}
            </ul>
            {nextBeat ? (
              <p className="mt-5 border-t border-white/12 pt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-white/40">
                Next · {nextBeat.kicker}
              </p>
            ) : null}
          </aside>
        ) : null}
      </div>

      <div className="border-t border-white/12 bg-black/25 px-4 py-2.5">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2.5">
          <button
            type="button"
            onClick={onTogglePlay}
            data-testid="podium-play"
            className="focus-ring bg-white px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-steel-deep"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous beat"
              className={chip}
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next beat"
              className={chip}
            >
              →
            </button>
          </div>

          <div className="flex min-w-[12rem] flex-1 items-center gap-3">
            <div className="relative h-5 flex-1">
              <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-white/15">
                <div
                  className="h-full bg-white"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              {beatNumbers.map((n) => (
                <span
                  key={n}
                  aria-hidden
                  className="absolute top-0 h-5 w-px -translate-x-1/2 bg-white/30"
                  style={{
                    left: `${(manifest.cues.find((c) => c.beat === n)?.at ?? 0) * 100}%`,
                  }}
                />
              ))}
              <input
                type="range"
                min={0}
                max={1000}
                value={Math.round(progress * 1000)}
                onChange={(event) => onSeek(Number(event.target.value) / 1000)}
                aria-label="Lecture position"
                className="focus-ring absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
            <span className="font-mono text-[10px] tabular-nums text-white/60">
              {clock(elapsed)} / {clock(manifest.presentSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setNotesOpen((o) => !o)} className={chip}>
              Notes
            </button>
            <button type="button" onClick={() => setCamera((on) => !on)} className={chip}>
              {camera ? "Camera off" : "Camera"}
            </button>
            <button type="button" onClick={onExit} className={chip}>
              Exit
            </button>
          </div>
        </div>
        <p className="mx-auto mt-2 w-full max-w-6xl font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
          Space play · ← → sections · N notes · Esc exit
          {reduced ? " · reduced motion: stepping sections, no autoplay" : ""}
          {cameraError ? ` · ${cameraError}` : ""}
        </p>
      </div>
    </div>
  );
}
