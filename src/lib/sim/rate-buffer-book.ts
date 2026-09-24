/**
 * Illustrative mortgage-book simulation for the reference story.
 * Deterministic (seeded). Not fitted to a real portfolio.
 *
 * Mechanism: payment repricing on floating-rate loans → buffer compression
 * → accounts crossing a thin-buffer threshold.
 */

export type RateType = "floating" | "fixed";

export type SimBorrower = {
  id: number;
  incomeMonthly: number;
  essentialsMonthly: number;
  principal: number;
  remainingMonths: number;
  annualRate: number;
  rateType: RateType;
  /** Unpaid balance weight for book aggregates */
  balance: number;
};

export type SimSnapshot = {
  payment: number;
  buffer: number;
  bufferShareOfIncome: number;
  dsti: number;
  thinBuffer: boolean;
};

export type BookShockResult = {
  assumptions: {
    n: number;
    seed: number;
    floatingShareByBalance: number;
    shockBps: number;
    thinBufferCutoff: number;
    label: string;
  };
  before: {
    thinCount: number;
    thinBalanceShare: number;
    medianBufferShare: number;
  };
  after: {
    thinCount: number;
    thinBalanceShare: number;
    medianBufferShare: number;
  };
  delta: {
    newThinCount: number;
    newThinBalanceShare: number;
  };
  /** Of newly thin accounts, share that were already in bottom buffer tercile pre-shock */
  concentration: {
    newThinFromBottomTercileShare: number;
  };
  /** Floating thin-buffer unpaid balance / book unpaid balance after shock */
  actionableSlice: {
    floatingThinBalanceShare: number;
  };
};

export type SensitivityCell = {
  floatingShare: number;
  shockBps: number;
  newThinBalanceShare: number;
  floatingThinBalanceShare: number;
};

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard amortising payment; returns 0 if degenerate. */
export function amortisingPayment(
  principal: number,
  annualRate: number,
  remainingMonths: number,
): number {
  if (principal <= 0 || remainingMonths <= 0) return 0;
  const r = annualRate / 12;
  if (Math.abs(r) < 1e-12) return principal / remainingMonths;
  const pow = Math.pow(1 + r, remainingMonths);
  return (principal * r * pow) / (pow - 1);
}

export function snapshot(
  b: SimBorrower,
  annualRate: number,
  thinBufferCutoff: number,
): SimSnapshot {
  const payment = amortisingPayment(
    b.principal,
    annualRate,
    b.remainingMonths,
  );
  const buffer = b.incomeMonthly - b.essentialsMonthly - payment;
  const bufferShareOfIncome = buffer / b.incomeMonthly;
  const dsti = payment / b.incomeMonthly;
  return {
    payment,
    buffer,
    bufferShareOfIncome,
    dsti,
    thinBuffer: bufferShareOfIncome < thinBufferCutoff,
  };
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo];
  return sorted[lo] * (hi - i) + sorted[hi] * (i - lo);
}

/**
 * Build an illustrative book. Floating share is by unpaid balance.
 */
export function buildBook(opts: {
  n: number;
  seed: number;
  floatingShareByBalance: number;
}): SimBorrower[] {
  const rand = mulberry32(opts.seed);
  const raw: {
    incomeMonthly: number;
    essentialsMonthly: number;
    principal: number;
    remainingMonths: number;
    annualRate: number;
  }[] = [];

  for (let i = 0; i < opts.n; i++) {
    // Income ~ €2.2k–€7.5k monthly (skewed)
    const incomeMonthly = 2200 + Math.pow(rand(), 0.7) * 5300;
    const essentialsMonthly = incomeMonthly * (0.38 + rand() * 0.12);
    const principal = 80_000 + rand() * 320_000;
    const remainingMonths = 60 + Math.floor(rand() * 300);
    // Starting rates: mix around 1.5%–4.5% pre-shock world
    const annualRate = 0.015 + rand() * 0.03;
    raw.push({
      incomeMonthly,
      essentialsMonthly,
      principal,
      remainingMonths,
      annualRate,
    });
  }

  // Assign floating to largest balances until floating share target hit
  const byBalance = raw
    .map((b, index) => ({ index, balance: b.principal }))
    .sort((a, b) => b.balance - a.balance);
  const totalBal = byBalance.reduce((s, x) => s + x.balance, 0);
  const target = opts.floatingShareByBalance * totalBal;
  const floating = new Set<number>();
  let acc = 0;
  for (const row of byBalance) {
    if (acc >= target) break;
    floating.add(row.index);
    acc += row.balance;
  }

  return raw.map((b, id) => ({
    id,
    ...b,
    balance: b.principal,
    rateType: floating.has(id) ? ("floating" as const) : ("fixed" as const),
  }));
}

export function shockBook(
  book: SimBorrower[],
  opts: {
    shockBps: number;
    thinBufferCutoff: number;
    seed: number;
    floatingShareByBalance: number;
    label?: string;
  },
): BookShockResult {
  const shock = opts.shockBps / 10_000;
  const totalBal = book.reduce((s, b) => s + b.balance, 0);

  const beforeSnaps = book.map((b) => snapshot(b, b.annualRate, opts.thinBufferCutoff));
  const afterRates = book.map((b) =>
    b.rateType === "floating" ? b.annualRate + shock : b.annualRate,
  );
  const afterSnaps = book.map((b, i) =>
    snapshot(b, afterRates[i], opts.thinBufferCutoff),
  );

  const bufferBefore = beforeSnaps
    .map((s) => s.bufferShareOfIncome)
    .sort((a, b) => a - b);
  const bufferAfter = afterSnaps
    .map((s) => s.bufferShareOfIncome)
    .sort((a, b) => a - b);
  const tercileCut = quantile(bufferBefore, 1 / 3);

  let thinBalBefore = 0;
  let thinBalAfter = 0;
  let thinCountBefore = 0;
  let thinCountAfter = 0;
  let newThinCount = 0;
  let newThinBal = 0;
  let newThinFromBottom = 0;
  let floatingThinBal = 0;

  for (let i = 0; i < book.length; i++) {
    const b = book[i];
    const before = beforeSnaps[i];
    const after = afterSnaps[i];
    if (before.thinBuffer) {
      thinCountBefore += 1;
      thinBalBefore += b.balance;
    }
    if (after.thinBuffer) {
      thinCountAfter += 1;
      thinBalAfter += b.balance;
      if (b.rateType === "floating") floatingThinBal += b.balance;
    }
    if (!before.thinBuffer && after.thinBuffer) {
      newThinCount += 1;
      newThinBal += b.balance;
      if (before.bufferShareOfIncome <= tercileCut) newThinFromBottom += 1;
    }
  }

  return {
    assumptions: {
      n: book.length,
      seed: opts.seed,
      floatingShareByBalance: opts.floatingShareByBalance,
      shockBps: opts.shockBps,
      thinBufferCutoff: opts.thinBufferCutoff,
      label: opts.label ?? "illustrative-book",
    },
    before: {
      thinCount: thinCountBefore,
      thinBalanceShare: thinBalBefore / totalBal,
      medianBufferShare: quantile(bufferBefore, 0.5),
    },
    after: {
      thinCount: thinCountAfter,
      thinBalanceShare: thinBalAfter / totalBal,
      medianBufferShare: quantile(bufferAfter, 0.5),
    },
    delta: {
      newThinCount,
      newThinBalanceShare: newThinBal / totalBal,
    },
    concentration: {
      newThinFromBottomTercileShare:
        newThinCount === 0 ? 0 : newThinFromBottom / newThinCount,
    },
    actionableSlice: {
      floatingThinBalanceShare: floatingThinBal / totalBal,
    },
  };
}

export function runBaseCase() {
  const n = 2000;
  const seed = 42;
  const floatingShareByBalance = 0.35;
  const shockBps = 300;
  /** Calibrated v2: thin <6% residual income — rhyme-check vs WP 3053 DSTI>40% 26→33%. */
  const thinBufferCutoff = 0.06;
  const book = buildBook({ n, seed, floatingShareByBalance });
  return shockBook(book, {
    shockBps,
    thinBufferCutoff,
    seed,
    floatingShareByBalance,
    label: "calibrated-v2-35float-300bp-thin6",
  });
}

export function runSensitivityGrid(): SensitivityCell[] {
  const n = 2000;
  const seed = 42;
  const thinBufferCutoff = 0.06;
  const floats = [0.2, 0.35, 0.5];
  const shocks = [100, 200, 300];
  const cells: SensitivityCell[] = [];
  for (const floatingShare of floats) {
    const book = buildBook({ n, seed, floatingShareByBalance: floatingShare });
    for (const shockBps of shocks) {
      const r = shockBook(book, {
        shockBps,
        thinBufferCutoff,
        seed,
        floatingShareByBalance: floatingShare,
      });
      cells.push({
        floatingShare,
        shockBps,
        newThinBalanceShare: r.delta.newThinBalanceShare,
        floatingThinBalanceShare: r.actionableSlice.floatingThinBalanceShare,
      });
    }
  }
  return cells;
}

/** Frozen figures for the reference story UI (seed 42). */
export const STORY_SIM = (() => {
  const base = runBaseCase();
  const grid = runSensitivityGrid();
  const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
  return {
    base,
    grid,
    display: {
      thinBefore: pct(base.before.thinBalanceShare),
      thinAfter: pct(base.after.thinBalanceShare),
      newThin: pct(base.delta.newThinBalanceShare),
      newThinFromBottom: pct(base.concentration.newThinFromBottomTercileShare),
      floatingThin: pct(base.actionableSlice.floatingThinBalanceShare),
      medianBufferBefore: pct(base.before.medianBufferShare),
      medianBufferAfter: pct(base.after.medianBufferShare),
      n: base.assumptions.n,
      floatingShare: pct(base.assumptions.floatingShareByBalance, 0),
      shockBps: base.assumptions.shockBps,
      cutoff: pct(base.assumptions.thinBufferCutoff, 0),
    },
  };
})();
