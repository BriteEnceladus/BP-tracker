import { describe, expect, it } from 'vitest';
import { downsampleEven } from '../chartDownsample';

describe('downsampleEven', () => {
  it('returns the same array when already short', () => {
    expect(downsampleEven([1, 2, 3], 8)).toEqual([1, 2, 3]);
  });

  it('keeps endpoints and a bounded number of points', () => {
    const src = Array.from({ length: 200 }, (_, i) => i);
    const out = downsampleEven(src, 48);
    expect(out).toHaveLength(48);
    expect(out[0]).toBe(0);
    expect(out[out.length - 1]).toBe(199);
  });
});
