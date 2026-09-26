"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LectureBeatCopy } from "@/components/lecture/LectureBeatCopy";
import type { LectureBeat, LectureManifest } from "@/lectures/schemas/lecture";

type Props = {
  manifest: LectureManifest;
  beat: LectureBeat;
  beatNumber: number;
  progress: number;
  playing: boolean;
  reduced: boolean;
  onTogglePlay: () => void;
  onSeek: (progress: number) => void;
  onBeat: (beat: number) => void;
  onExit: () => void;
  /** The board. Passed in so the same canvas host serves both drivers. */
  children: React.ReactNode;
};

function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The podium. Full-screen board, the beat's copy at projection size, and the
 * speaker notes where only the presenter can see them.
 *
 * The notes are the half of a lecture a scrolling reader never needs: what to
 * point at, what to say, and what not to rush. They live in the manifest beside
 * the reader copy, so one file is the lecture.
 */
export function LecturePresenter({
  manifest,
  beat,
  beatNumber,
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
      const index = beatNumbers.indexOf(beatNumber);
      const target = beatNumbers[Math.min(beatNumbers.length - 1, Math.max(0, index + delta))];
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

  return (
    <div
      data-testid="lecture-podium"
      className="fixed inset-0 z-50 flex flex-col bg-void text-white"
    >
      <div className="relative flex-1 overflow-hidden" data-testid="film-stage" data-beat={beatNumber}>
        {children}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-void via-void/85 to-transparent px-6 pb-8 pt-24 md:px-12">
          <div className="mx-auto flex w-full max-w-6xl items-end justify-between gap-8">
            <LectureBeatCopy beat={beat} variant="present" />
            {beat.figure ? (
              <p className="hidden font-display text-6xl font-semibold tracking-[-0.04em] text-neon-cyan md:block">
                {beat.figure}
              </p>
            ) : null}
          </div>
        </div>

        {camera ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute right-6 top-6 h-32 w-48 rounded-lg border border-white/20 object-cover shadow-glow md:h-40 md:w-60"
          />
        ) : null}

        {notesOpen ? (
          <aside
            data-testid="speaker-notes"
            className="absolute left-6 top-6 max-w-sm rounded-xl border border-white/12 bg-void/85 p-4 backdrop-blur md:left-12"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neon-violet/80">
              Speaker notes · beat {beatNumber}
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-white/75">
              {beat.notes.map((note) => (
                <li key={note.slice(0, 24)} className="border-l border-white/15 pl-3">
                  {note}
                </li>
              ))}
            </ul>
            {nextBeat ? (
              <p className="mt-4 border-t border-white/10 pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
                Next · {nextBeat.kicker}
              </p>
            ) : null}
          </aside>
        ) : null}
      </div>

      <div className="border-t border-white/10 bg-void/95 px-5 py-3">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-3">
          <button
            type="button"
            onClick={onTogglePlay}
            data-testid="podium-play"
            className="focus-ring rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-neon-cyan"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous beat"
              className="focus-ring rounded-full border border-white/15 px-3 py-2 font-mono text-[11px] text-white/70"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next beat"
              className="focus-ring rounded-full border border-white/15 px-3 py-2 font-mono text-[11px] text-white/70"
            >
              →
            </button>
          </div>

          <div className="flex min-w-[12rem] flex-1 items-center gap-3">
            <div className="relative h-5 flex-1">
              <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-neon-cyan"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              {beatNumbers.map((n) => (
                <span
                  key={n}
                  aria-hidden
                  className="absolute top-0 h-5 w-px -translate-x-1/2 bg-white/25"
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
            <span className="font-mono text-[11px] tabular-nums text-white/50">
              {clock(elapsed)} / {clock(manifest.presentSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNotesOpen((open) => !open)}
              className="focus-ring rounded-full border border-white/15 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-white/70"
            >
              Notes
            </button>
            <button
              type="button"
              onClick={() => setCamera((on) => !on)}
              className="focus-ring rounded-full border border-white/15 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-white/70"
            >
              {camera ? "Camera off" : "Camera"}
            </button>
            <button
              type="button"
              onClick={onExit}
              className="focus-ring rounded-full border border-white/15 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-white/70"
            >
              Exit
            </button>
          </div>
        </div>
        <p className="mx-auto mt-2 w-full max-w-6xl font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">
          Space play · ← → beats · N notes · Esc exit
          {reduced ? " · reduced motion: stepping beats, no autoplay" : ""}
          {cameraError ? ` · ${cameraError}` : ""}
        </p>
      </div>
    </div>
  );
}
