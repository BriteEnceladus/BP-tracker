import { describe, expect, it } from 'vitest';
import { readingsToCsv } from '../csvExport';
import { isDuplicateReading, parseCsvReadings } from '../csvImport';

describe('parseCsvReadings', () => {
  it('round-trips the app export format', () => {
    const csv = readingsToCsv([
      {
        timestamp: '2026-08-14T12:00:00.000Z',
        systolic: 128,
        diastolic: 82,
        heartRate: 74,
        notes: 'felt "ok", after walk',
        medicationTaken: true,
      },
    ]);

    const { readings, errors } = parseCsvReadings(csv);
    expect(errors).toEqual([]);
    expect(readings).toEqual([
      {
        timestamp: '2026-08-14T12:00:00.000Z',
        systolic: 128,
        diastolic: 82,
        heartRate: 74,
        notes: 'felt "ok", after walk',
        medicationTaken: true,
      },
    ]);
  });

  it('accepts a BOM and locale-ish dates', () => {
    const csv =
      '\uFEFFTimestamp,Systolic (mmHg),Diastolic (mmHg),Heart Rate (bpm),Notes,Medication Taken\n' +
      '2026-08-15 08:30,118,76,,morning,No\n';
    const { readings, errors } = parseCsvReadings(csv);
    expect(errors).toEqual([]);
    expect(readings).toHaveLength(1);
    expect(readings[0].systolic).toBe(118);
    expect(readings[0].medicationTaken).toBe(false);
    expect(readings[0].timestamp).toMatch(/2026-08-15T/);
  });

  it('reports invalid rows without aborting the file', () => {
    const csv = [
      'Timestamp,Systolic,Diastolic',
      '2026-08-15T12:00:00.000Z,120,80',
      'not-a-date,130,85',
      '2026-08-15T13:00:00.000Z,999,80',
    ].join('\n');
    const { readings, errors } = parseCsvReadings(csv);
    expect(readings).toHaveLength(1);
    expect(errors.length).toBe(2);
  });

  it('detects duplicate readings', () => {
    const incoming = {
      timestamp: '2026-08-15T12:00:00.000Z',
      systolic: 120,
      diastolic: 80,
    };
    expect(isDuplicateReading([incoming], incoming)).toBe(true);
    expect(isDuplicateReading([], incoming)).toBe(false);
  });
});
