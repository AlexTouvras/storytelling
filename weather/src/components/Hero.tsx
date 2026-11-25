import { motion, useReducedMotion } from "framer-motion";
import type { Place } from "../lib/types";
import { Atmosphere } from "./Atmosphere";
import { LocationPicker } from "./LocationPicker";

type Props = {
  place: Place | null;
  weatherCode: number;
  isDay: boolean;
  busy: boolean;
  status: string | null;
  onSelect: (place: Place) => void;
  onStatus: (message: string | null) => void;
};

export function Hero({
  place,
  weatherCode,
  isDay,
  busy,
  status,
  onSelect,
  onStatus,
}: Props) {
  const reduce = useReducedMotion();

  return (
    <header className="hero">
      <Atmosphere weatherCode={weatherCode} isDay={isDay} />
      <div className="hero__content">
        <motion.p
          className="brand"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          Skylore
        </motion.p>
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          What the sky will do where you are
        </motion.h1>
        <motion.p
          className="hero__lede"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          A clear scroll story of the next two weeks — not a wall of widgets.
        </motion.p>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <LocationPicker
            place={place}
            busy={busy}
            onSelect={onSelect}
            onStatus={onStatus}
          />
          {status && <p className="status-banner">{status}</p>}
          {busy && !status && (
            <p className="status-banner">Fetching the forecast story…</p>
          )}
        </motion.div>
      </div>
    </header>
  );
}
