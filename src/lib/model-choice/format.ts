/** Dollars for a calculated workload cost. Grouped, and precise below $100. */
export function usd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${sign}$${trim(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}$${trim(abs / 1_000_000)}M`;
  if (abs >= 100) return `${sign}$${grouped(abs, 0)}`;
  if (abs >= 0.01) return `${sign}$${grouped(abs, 2)}`;
  return `${sign}$${grouped(abs, 3)}`;
}

function trim(n: number): string {
  const text = n.toFixed(1);
  return text.endsWith(".0") ? text.slice(0, -2) : text;
}

function grouped(n: number, digits: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Published list price, USD per million tokens. */
export function usdPerMillion(perToken: number): string {
  const n = perToken * 1_000_000;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(4)}`;
}

export function fitLabel(fit: number): string {
  return (fit * 100).toFixed(1);
}

export function indexText(n: number): string {
  return n.toFixed(1);
}

export function countLabel(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** 1048576 → 1.05M, 500000 → 500K. */
export function tokensLabel(n: number): string {
  if (n >= 1_000_000) {
    const millions = n / 1_000_000;
    const text = millions >= 10 ? millions.toFixed(0) : millions.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return `${text}M`;
  }
  if (n >= 1_000) {
    const thousands = n / 1_000;
    const text = Number.isInteger(thousands) ? String(thousands) : thousands.toFixed(1);
    return `${text}K`;
  }
  return String(n);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `2026-10-05` → `5 Oct 2026`. */
export function fetchedLabel(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
