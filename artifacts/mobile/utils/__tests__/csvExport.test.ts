import { describe, expect, it } from 'vitest';
import { readingsToCsv } from '../csvExport';

describe('readingsToCsv', () => {
  it('escapes quotes and omits missing heart rate', () => {
    const csv = readingsToCsv([
      {
        timestamp: '2026-08-14T12:00:00.000Z',
        systolic: 120,
        diastolic: 80,
        notes: 'felt "ok"',
        medicationTaken: true,
      },
    ]);

    expect(csv).toContain('Timestamp,Systolic (mmHg),Diastolic (mmHg),Heart Rate (bpm),Notes,Medication Taken');
    expect(csv).toContain('2026-08-14T12:00:00.000Z,120,80,,"felt ""ok""",Yes');
  });
});
