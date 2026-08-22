/** Evenly pick at most `max` points so SVG charts stay cheap on long histories. */
export function downsampleEven<T>(items: T[], max = 48): T[] {
  if (items.length <= max) return items;
  const out: T[] = [];
  const last = items.length - 1;
  for (let i = 0; i < max; i++) {
    const index = Math.round((i / (max - 1)) * last);
    out.push(items[index]);
  }
  return out;
}
