import Link from "next/link";
import { LANE2_MINUTE, speedFill, type LaneCar } from "./lane2-minute";

const W = 720;
const H = 228;
const PAD = 28;

function xOf(feet: number) {
  return PAD + (feet / LANE2_MINUTE.lengthFt) * (W - PAD * 2);
}

function Road({
  y,
  kicker,
  cars,
  pocket,
  ghostFt,
}: {
  y: number;
  kicker: string;
  cars: readonly LaneCar[];
  pocket: readonly [number, number];
  /** Where the slow stretch sat on the earlier frame, drawn on the later road. */
  ghostFt?: number;
}) {
  const x0 = xOf(pocket[0]);
  const x1 = xOf(pocket[1]);
  const slow = cars.reduce((a, b) => (a.mph < b.mph ? a : b));
  const ahead = cars.filter((c) => c.y > 1800);
  const aheadMph = Math.round(
    ahead.reduce((s, c) => s + c.mph, 0) / ahead.length,
  );

  return (
    <g>
      <text
        x={PAD}
        y={y - 28}
        fill="oklch(0.78 0.02 264)"
        fontSize="13"
        fontFamily="var(--font-mono), ui-monospace, monospace"
        letterSpacing="0.12em"
      >
        {kicker.toUpperCase()}
      </text>
      <line
        x1={xOf(0)}
        x2={xOf(LANE2_MINUTE.lengthFt)}
        y1={y}
        y2={y}
        stroke="white"
        strokeOpacity={0.18}
      />
      {ghostFt != null && (
        <line
          x1={xOf(ghostFt)}
          x2={xOf(ghostFt)}
          y1={y - 18}
          y2={y + 16}
          stroke="white"
          strokeOpacity={0.35}
          strokeDasharray="2 3"
        />
      )}
      <path
        d={`M ${x0} ${y - 16} V ${y - 8} H ${x1} V ${y - 16}`}
        fill="none"
        stroke="white"
        strokeOpacity={0.85}
      />
      <text
        x={(x0 + x1) / 2}
        y={y - 20}
        textAnchor="middle"
        fill="white"
        fontSize="11"
        fontFamily="var(--font-sans), system-ui, sans-serif"
      >
        slow
      </text>
      {cars.map((car) => (
        <rect
          key={`${kicker}-${car.y}`}
          x={xOf(car.y) - 5}
          y={y - 4}
          width={10}
          height={8}
          rx={1.5}
          fill={speedFill(car.mph)}
        />
      ))}
      <text
        x={xOf(slow.y)}
        y={y + 22}
        textAnchor="middle"
        fill="oklch(0.72 0.16 300)"
        fontSize="12"
        fontFamily="var(--font-mono), ui-monospace, monospace"
      >
        {Math.round(slow.mph)} mph
      </text>
      <text
        x={xOf(2000)}
        y={y + 22}
        textAnchor="middle"
        fill="oklch(0.82 0.12 195)"
        fontSize="12"
        fontFamily="var(--font-mono), ui-monospace, monospace"
      >
        {aheadMph} mph
      </text>
    </g>
  );
}

export function JamCard() {
  const [now, later] = LANE2_MINUTE.frames;
  const was = now.cars.reduce((a, b) => (a.mph < b.mph ? a : b)).y;

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-5 pb-2 pt-14 sm:px-8 sm:pb-3 sm:pt-16">
      <header className="space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
          {LANE2_MINUTE.place} · lane {LANE2_MINUTE.lane} · {LANE2_MINUTE.when}
        </p>
        <h1 className="font-display text-[1.75rem] leading-[1.05] tracking-tight text-white sm:text-4xl">
          The jam grows backward
        </h1>
        <p className="max-w-xl text-base leading-snug text-white/75 sm:text-lg">
          Every car is moving forward. The slow stretch is moving back.
        </p>
      </header>

      <figure className="space-y-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-labelledby="jam-title jam-desc"
          className="w-full"
        >
          <title id="jam-title">Two moments on one lane, a minute apart</title>
          <desc id="jam-desc">
            Twenty-five cars, then twenty-seven. In the first moment the
            slowest car is near the middle at 15 mph and the far end is near
            45. A minute later the slowest cars are at the back, near 9 mph,
            and the far end is still near 45.
          </desc>
          <Road y={78} kicker={now.kicker} cars={now.cars} pocket={now.pocketFt} />
          <Road
            y={178}
            kicker={later.kicker}
            cars={later.cars}
            pocket={later.pocketFt}
            ghostFt={was}
          />
        </svg>
        <figcaption className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
          <span>Back</span>
          <span>Cars →</span>
          <span>Ahead</span>
        </figcaption>
      </figure>

      <dl className="grid grid-cols-3 gap-3 border-y border-white/10 py-3">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
            Walked back
          </dt>
          <dd className="mt-1 font-display text-2xl tracking-tight text-white sm:text-3xl">
            {LANE2_MINUTE.walkFt}
            <span className="ml-1 font-sans text-sm text-white/50">ft</span>
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
            The walk
          </dt>
          <dd className="mt-1 font-display text-2xl tracking-tight text-white sm:text-3xl">
            {LANE2_MINUTE.walkMph}
            <span className="ml-1 font-sans text-sm text-white/50">mph</span>
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
            Ahead, mph
          </dt>
          <dd className="mt-1 font-display text-2xl tracking-tight text-neon-cyan sm:text-3xl">
            {LANE2_MINUTE.ahead[0]}
            <span className="mx-0.5 text-white/30">→</span>
            {LANE2_MINUTE.ahead[1]}
          </dd>
        </div>
      </dl>

      <footer className="space-y-1.5">
        <p className="font-display text-lg leading-snug tracking-tight text-white sm:text-xl">
          Hold the speed while the road ahead is still moving.
        </p>
        <p className="max-w-xl text-sm leading-relaxed text-white/55">
          A new lane answers a front that is already full. On this minute the
          front was still near 45 mph. The dashed mark is where the slow
          stretch sat sixty seconds earlier. Place is measured; the mark size
          is not.
        </p>
        <nav className="flex gap-6">
          <Link
            href="/stories/where-should-the-speed-be-held/film"
            className="focus-ring font-mono text-[11px] uppercase tracking-[0.16em] text-neon-cyan"
          >
            The film →
          </Link>
          <Link
            href="/stories/where-should-the-speed-be-held/method"
            className="focus-ring font-mono text-[11px] uppercase tracking-[0.16em] text-white/70 hover:text-white"
          >
            Method and data →
          </Link>
        </nav>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">
          Observed positions · one lane · two frames · FHWA NGSIM
        </p>
      </footer>
    </article>
  );
}
