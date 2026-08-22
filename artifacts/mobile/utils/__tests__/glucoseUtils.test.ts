import { describe, expect, it } from 'vitest';
import {
  formatGlucoseValue,
  getGlucoseBand,
  mgdlToMmol,
  mmolToMgdl,
  parseDisplayInput,
} from '../glucoseUtils';

describe('glucose unit conversion', () => {
  it('round-trips mg/dL through mmol/L without corrupting canonical storage', () => {
    const stored = 99;
    const mmol = mgdlToMmol(stored);
    expect(mmol).toBeCloseTo(5.5, 1);
    expect(mmolToMgdl(mmol)).toBeGreaterThanOrEqual(98);
    expect(mmolToMgdl(mmol)).toBeLessThanOrEqual(100);
  });

  it('parses display input back to mg/dL', () => {
    expect(parseDisplayInput('110', 'mg/dL')).toBe(110);
    expect(parseDisplayInput('5.5', 'mmol/L')).toBe(mmolToMgdl(5.5));
  });

  it('formats for the selected display unit only', () => {
    expect(formatGlucoseValue(99, 'mg/dL')).toBe('99');
    expect(formatGlucoseValue(99, 'mmol/L')).toMatch(/^\d+\.\d$/);
  });
});

describe('getGlucoseBand', () => {
  it('uses educational generic bands, not diagnosis', () => {
    expect(getGlucoseBand(69)).toBe('low');
    expect(getGlucoseBand(70)).toBe('inRange');
    expect(getGlucoseBand(99)).toBe('inRange');
    expect(getGlucoseBand(100)).toBe('elevated');
    expect(getGlucoseBand(125)).toBe('elevated');
    expect(getGlucoseBand(126)).toBe('high');
  });
});
