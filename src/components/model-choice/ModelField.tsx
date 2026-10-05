import { FIELD_BOX, fieldScale } from "@/lib/model-choice/field";
import { indexText } from "@/lib/model-choice/format";
import type { ScoredModel } from "@/lib/model-choice/types";

type Props = {
  rows: ScoredModel[];
  winnerId: string | null;
  leaderId: string | null;
  activeId: string | null;
  indexName: string;
  onHover: (id: string | null) => void;
};

function axisMoney(n: number): string {
  if (n >= 1_000_000) return `$${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  if (n >= 1) return `$${Math.round(n)}`;
  return `$${n.toFixed(2)}`;
}

/** Eligible models only. Across is workload cost, up is the job's published index. */
export function ModelField({ rows, winnerId, leaderId, activeId, indexName, onHover }: Props) {
  const points = rows
    .filter((row) => row.eligible && row.index != null)
    .map((row) => ({
      id: row.model.id,
      name: row.model.name,
      cost: row.cost,
      index: row.index as number,
    }));
  const scale = fieldScale(points);
  const { width, height, padLeft, padRight, padBottom } = FIELD_BOX;
  const byId = new Map(scale.placed.map((point) => [point.id, point]));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
      <p className="px-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">{indexName}</p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-1 h-[280px] w-full sm:h-[420px]"
        role="img"
        aria-label={`Models that can take this job, placed by workload cost and ${indexName}`}
      >
        {scale.indexTicks.map((tick) => (
          <g key={`y-${tick.value}`}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={tick.y}
              y2={tick.y}
              stroke="rgba(255,255,255,0.08)"
            />
            <text x={padLeft - 8} y={tick.y + 3} textAnchor="end" fill="rgba(255,255,255,0.45)" fontSize={11}>
              {tick.value === 0 ? "0" : indexText(tick.value)}
            </text>
          </g>
        ))}
        {scale.costTicks.map((tick) => (
          <g key={`x-${tick.value}`}>
            <line
              x1={tick.x}
              x2={tick.x}
              y1={FIELD_BOX.padTop}
              y2={height - padBottom}
              stroke="rgba(255,255,255,0.06)"
            />
            <text
              x={tick.x}
              y={height - 12}
              textAnchor="middle"
              fill="rgba(255,255,255,0.45)"
              fontSize={11}
            >
              {axisMoney(tick.value)}
            </text>
          </g>
        ))}
        {points.map((point) => {
          const placed = byId.get(point.id);
          if (!placed) return null;
          const winner = point.id === winnerId;
          const leader = point.id === leaderId && point.id !== winnerId;
          const active = point.id === activeId;
          const showName = winner || active;
          const labelLeft = placed.x > width * 0.62;
          return (
            <g
              key={point.id}
              className="transition-opacity duration-300 motion-reduce:transition-none"
              onMouseEnter={() => onHover(point.id)}
              onMouseLeave={() => onHover(null)}
            >
              {leader ? (
                <circle cx={placed.x} cy={placed.y} r={9} fill="none" stroke="oklch(0.62 0.22 300)" strokeWidth={1.5} />
              ) : null}
              <circle
                cx={placed.x}
                cy={placed.y}
                r={winner ? 7 : active ? 6 : 4.5}
                fill={winner ? "oklch(0.78 0.14 195)" : "rgba(255,255,255,0.82)"}
                className="cursor-pointer transition-[cx,cy,r] duration-500 motion-reduce:transition-none"
              />
              {showName ? (
                <text
                  x={placed.x + (labelLeft ? -12 : 12)}
                  y={placed.y - 12}
                  textAnchor={labelLeft ? "end" : "start"}
                  fill="white"
                  fontSize={13}
                >
                  {point.name}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <p className="px-1 text-right font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
        Workload cost, log scale
      </p>
    </div>
  );
}
