export function eur(n: number): string {
  const sign = n < 0 ? "−" : "";
  const digits = String(Math.abs(Math.round(n)));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}€${grouped}`;
}

export function pct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
