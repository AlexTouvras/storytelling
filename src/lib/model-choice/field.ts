export const FIELD_BOX = {
  width: 640,
  height: 400,
  padLeft: 52,
  padRight: 24,
  padTop: 24,
  padBottom: 36,
} as const;

export type FieldInput = { id: string; cost: number; index: number };

export type FieldScale = {
  placed: { id: string; x: number; y: number; cost: number; index: number }[];
  costTicks: { value: number; x: number }[];
  indexTicks: { value: number; y: number }[];
};

function log10(cost: number): number {
  return Math.log10(Math.max(cost, 1e-9));
}

/** Log cost across, published index up. Empty input returns an empty scale. */
export function fieldScale(points: FieldInput[]): FieldScale {
  const { width, height, padLeft, padRight, padTop, padBottom } = FIELD_BOX;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  if (points.length === 0) return { placed: [], costTicks: [], indexTicks: [] };

  const logs = points.map((point) => log10(point.cost));
  const lo = Math.min(...logs);
  const hi = Math.max(...logs);
  const span = hi - lo || 1;
  const yMax = Math.max(...points.map((point) => point.index), 0) * 1.08 || 1;

  const xOf = (cost: number) => padLeft + ((log10(cost) - lo) / span) * plotW;
  const yOf = (index: number) => padTop + (1 - index / yMax) * plotH;

  const minCost = Math.min(...points.map((point) => point.cost));
  const maxCost = Math.max(...points.map((point) => point.cost));
  const costTicks: { value: number; x: number }[] = [];
  const from = Math.ceil(lo - 1e-9);
  const to = Math.floor(hi + 1e-9);
  for (let exp = from; exp <= to; exp += 1) {
    const value = 10 ** exp;
    if (value >= minCost && value <= maxCost) costTicks.push({ value, x: xOf(value) });
  }

  const peak = Math.max(...points.map((point) => point.index));
  const indexTicks = [0, peak / 2, peak]
    .filter((value, index, all) => all.findIndex((item) => Math.abs(item - value) < 1e-9) === index)
    .map((value) => ({ value, y: yOf(value) }));

  return {
    placed: points.map((point) => ({
      ...point,
      x: xOf(point.cost),
      y: yOf(point.index),
    })),
    costTicks,
    indexTicks,
  };
}
