import { describe, expect, it } from 'vitest';
import {
  PDF_DISCLAIMER,
  buildPdfHtml,
  categoryCounts,
  lastTwelveMonthKeys,
  monthAverages,
} from '../pdfReport';
import type { BPReading } from '../../src/schemas';

function reading(iso: string, sys: number, dia: number): BPReading {
  return { timestamp: iso, systolic: sys, diastolic: dia };
}

describe('monthAverages', () => {
  it('returns 12 calendar months ending at now', () => {
    const now = new Date(2026, 5, 15);
    const keys = lastTwelveMonthKeys(now);
    expect(keys).toHaveLength(12);
    expect(keys[0]).toBe('2025-07');
    expect(keys[11]).toBe('2026-06');
  });

  it('averages readings that fall in a month and zeros empty months', () => {
    const now = new Date(2026, 5, 15);
    const rows = monthAverages(
      [
        reading(new Date(2026, 5, 2, 8).toISOString(), 120, 80),
        reading(new Date(2026, 5, 10, 8).toISOString(), 130, 84),
      ],
      now
    );
    const june = rows.find((m) => m.key === '2026-06')!;
    const may = rows.find((m) => m.key === '2026-05')!;
    expect(june.count).toBe(2);
    expect(june.avgSystolic).toBe(125);
    expect(may.count).toBe(0);
  });
});

describe('categoryCounts', () => {
  it('tallies AHA-style categories', () => {
    expect(
      categoryCounts([
        reading('2026-01-01T12:00:00.000Z', 110, 70),
        reading('2026-01-02T12:00:00.000Z', 150, 95),
        reading('2026-01-03T12:00:00.000Z', 150, 95),
      ])
    ).toEqual({
      normal: 1,
      elevated: 0,
      stage1: 0,
      stage2: 2,
      crisis: 0,
    });
  });
});

describe('buildPdfHtml', () => {
  it('includes year-in-review sections, meds, optional streak/target, and the medical-device disclaimer', () => {
    const html = buildPdfHtml(
      [reading(new Date(2026, 5, 2, 8).toISOString(), 120, 80)],
      {
        now: new Date(2026, 5, 15),
        medications: [{ name: 'Lisinopril', dosage: '10 mg', frequency: 'daily', active: true }],
        glucose: [{ timestamp: new Date(2026, 5, 2, 8).toISOString(), valueMgdl: 99, context: 'fasting' }],
        target: { systolic: 130, diastolic: 80, hitPercent: 100 },
        streak: { current: 4, best: 12 },
      }
    );
    expect(html).toContain('Year in Review');
    expect(html).toContain('Monthly averages');
    expect(html).toContain('Category counts');
    expect(html).toContain('Lisinopril');
    expect(html).toContain('Glucose (mg/dL');
    expect(html).toContain('In personal target');
    expect(html).toContain('Logging streak');
    expect(html).toContain(PDF_DISCLAIMER);
    expect(html).not.toContain('felt dizzy');
    expect(html.toLowerCase()).toContain('not a medical device');
  });
});
