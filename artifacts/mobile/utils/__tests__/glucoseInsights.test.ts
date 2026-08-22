import { describe, expect, it } from 'vitest';
import { generateGlucoseInsight } from '../glucoseInsights';

describe('generateGlucoseInsight', () => {
  it('returns null with no readings', () => {
    expect(generateGlucoseInsight([], 100)).toBeNull();
  });

  it('builds a local card with target language and the disclaimer', () => {
    const card = generateGlucoseInsight(
      [
        { timestamp: '2026-08-20T08:00:00.000Z', valueMgdl: 92, context: 'fasting' },
        { timestamp: '2026-08-21T08:00:00.000Z', valueMgdl: 94, context: 'fasting' },
        { timestamp: '2026-08-22T08:00:00.000Z', valueMgdl: 90, context: 'fasting' },
        { timestamp: '2026-08-22T18:00:00.000Z', valueMgdl: 130, context: 'after_meal' },
        { timestamp: '2026-08-21T18:00:00.000Z', valueMgdl: 128, context: 'after_meal' },
      ],
      100
    );
    expect(card).not.toBeNull();
    expect(card!.title.length).toBeGreaterThan(0);
    expect(card!.bullets.length).toBeGreaterThan(1);
    expect(card!.disclaimer.toLowerCase()).toContain('not medical advice');
    expect(card!.bullets.some((b) => /target/i.test(b))).toBe(true);
  });
});
