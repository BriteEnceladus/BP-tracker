import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TARGET,
  glucoseTargetHitRate,
  isGlucoseInTarget,
  parseGlucoseTargetMgdl,
  parseStoredTarget,
} from '../targets';

describe('glucose personal target', () => {
  it('treats values strictly below the stored mg/dL ceiling as in target', () => {
    expect(isGlucoseInTarget(99, { glucoseMgdl: 100 })).toBe(true);
    expect(isGlucoseInTarget(100, { glucoseMgdl: 100 })).toBe(false);
  });

  it('parses stored JSON and defaults missing glucoseMgdl', () => {
    expect(parseStoredTarget(null).glucoseMgdl).toBe(DEFAULT_TARGET.glucoseMgdl);
    expect(parseStoredTarget(JSON.stringify({ systolic: 125, diastolic: 80 })).glucoseMgdl).toBe(100);
    expect(parseStoredTarget(JSON.stringify({ glucoseMgdl: 110 })).glucoseMgdl).toBe(110);
  });

  it('rejects out-of-range personal targets', () => {
    expect(parseGlucoseTargetMgdl('60').ok).toBe(false);
    expect(parseGlucoseTargetMgdl('90').ok).toBe(true);
  });

  it('computes hit rate', () => {
    const rate = glucoseTargetHitRate(
      [{ valueMgdl: 90 }, { valueMgdl: 110 }, { valueMgdl: 95 }],
      { glucoseMgdl: 100 }
    );
    expect(rate).toEqual({ hit: 2, total: 3, percent: 67 });
  });
});
