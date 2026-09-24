"use client";

import { eur } from "@/components/film/format";

type Props = {
  income: number;
  essentials: number;
  payment: number;
  className?: string;
};

type Segment = {
  key: string;
  label: string;
  amount: number;
  className: string;
};

export function CashColumn({ income, essentials, payment }: Props) {
  const buffer = income - essentials - payment;
  const stack = Math.max(income, essentials + Math.max(payment, 0));
  const segments: Segment[] = [
    {
      key: "buffer",
      label: buffer >= 0 ? "Buffer" : "Short",
      amount: buffer,
      className: buffer >= 0 ? "bg-neon-cyan" : "bg-neon-violet",
    },
    {
      key: "payment",
      label: "Payment",
      amount: Math.max(payment, 0),
      className: "bg-neon-violet/80",
    },
    {
      key: "essentials",
      label: "Essentials",
      amount: essentials,
      className: "bg-white/15",
    },
  ];

  const placed: Array<Segment & { start: number; size: number }> = [];
  let cursor = 0;
  for (const segment of segments) {
    const size = Math.max(0, Math.abs(segment.amount) / stack);
    placed.push({ ...segment, start: cursor, size });
    cursor += size;
  }

  return (
    <div data-testid="cash-column">
      <div className="relative h-[min(46vh,420px)] min-h-[240px] w-56">
        <div className="absolute bottom-0 left-0 flex h-full w-11 flex-col-reverse overflow-hidden rounded-[2px] bg-white/[0.03] ring-1 ring-white/10">
          {placed.map((segment) => (
            <div
              key={segment.key}
              className={segment.className}
              style={{ height: `${segment.size * 100}%` }}
            />
          ))}
        </div>
        {placed.map((segment) => (
          <div
            key={segment.key}
            className="absolute left-16"
            style={{
              bottom: `${(segment.start + segment.size / 2) * 100}%`,
              transform: "translateY(50%)",
            }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
              {segment.label}
            </p>
            <p className="font-mono text-sm text-white">{eur(segment.amount)}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
        Income {eur(income)}
      </p>
    </div>
  );
}

export function CashMeter({ income, essentials, payment, className }: Props) {
  const buffer = income - essentials - payment;
  const stack = Math.max(income, essentials + Math.max(payment, 0));
  const width = (n: number) => `${Math.max(0, (n / stack) * 100)}%`;
  return (
    <div className={className ? `mt-4 ${className}` : "mt-4"} data-testid="cash-meter">
      <div className="flex h-2.5 overflow-hidden rounded-[1px] bg-white/5">
        <div className="h-full bg-white/20" style={{ width: width(essentials) }} />
        <div className="h-full bg-neon-violet/85" style={{ width: width(payment) }} />
        <div
          className={buffer >= 0 ? "h-full bg-neon-cyan" : "h-full bg-neon-violet"}
          style={{ width: width(Math.abs(buffer)) }}
        />
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
        Essentials {eur(essentials)} · payment {eur(payment)} · buffer {eur(buffer)}
      </p>
    </div>
  );
}
