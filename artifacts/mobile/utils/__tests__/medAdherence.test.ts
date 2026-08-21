import { describe, expect, it } from 'vitest';
import {
  MIN_MEDS_COMPARE_COUNT,
  formatMedsVsBpLine,
  medsVsBpInsightBullet,
  summarizeMedsVsBp,
} from '../medAdherence';

function r(sys: number, dia: number, taken?: boolean) {
  return { systolic: sys, diastolic: dia, medicationTaken: taken };
}

describe('summarizeMedsVsBp', () => {
  it('splits by medicationTaken and withholds enough until both groups meet the floor', () => {
    const summary = summarizeMedsVsBp([
      r(120, 80, true),
      r(122, 82, true),
      r(140, 90, false),
      r(138, 88),
    ]);
    expect(summary.taken.count).toBe(2);
    expect(summary.notTaken.count).toBe(2);
    expect(summary.enough).toBe(false);
    expect(formatMedsVsBpLine(summary)).toBeNull();
  });

  it('averages each group once both have enough samples', () => {
    const taken = [r(120, 70, true), r(122, 72, true), r(118, 68, true)];
    const skipped = [r(140, 90, false), r(138, 88, false), r(142, 92, false)];
    const summary = summarizeMedsVsBp([...taken, ...skipped]);
    expect(MIN_MEDS_COMPARE_COUNT).toBe(3);
    expect(summary.enough).toBe(true);
    expect(summary.taken.avgSystolic).toBe(120);
    expect(summary.notTaken.avgSystolic).toBe(140);
    expect(formatMedsVsBpLine(summary)).toBe(
      'Taken: 120/70 (n=3). Not taken: 140/90 (n=3).'
    );
    expect(medsVsBpInsightBullet(summary)).toMatch(/lower on days marked taken/);
  });
});
