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
          initial={reduce ? false : { opacity: 0, y: 28, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
        >
          Skylore
        </motion.p>
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 22, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.85, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          Your local forecast, told as you scroll
        </motion.h1>
        <motion.p
          className="hero__lede"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          One idea at a time — hours, the country map, rain risk, and confidence
          for the next two weeks.
        </motion.p>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <LocationPicker
            place={place}
            busy={busy}
            onSelect={onSelect}
            onStatus={onStatus}
          />
          {status && <p className="status-banner">{status}</p>}
          {busy && !status && (
            <p className="status-banner">Loading forecast…</p>
          )}
        </motion.div>
      </div>
    </header>
  );
}
