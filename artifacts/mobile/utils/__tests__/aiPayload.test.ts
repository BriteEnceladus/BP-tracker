import { describe, expect, it } from 'vitest';
import { buildAnonymizedInsightPayload, payloadContainsForbiddenFields } from '../aiPayload';
import type { BPReading } from '../../src/schemas';

const readings: BPReading[] = [
  {
    id: 1,
    timestamp: '2026-08-01T10:00:00.000Z',
    systolic: 118,
    diastolic: 76,
    notes: 'secret note with my name',
  },
  {
    id: 2,
    timestamp: '2026-08-10T10:00:00.000Z',
    systolic: 128,
    diastolic: 82,
  },
  {
    id: 3,
    timestamp: '2026-08-13T10:00:00.000Z',
    systolic: 142,
    diastolic: 90,
    heartRate: 80,
    medicationTaken: true,
  },
];

describe('buildAnonymizedInsightPayload', () => {
  it('omits notes, ids, and timestamps from the outbound payload', () => {
    const payload = buildAnonymizedInsightPayload(readings[2], readings);
    expect(payload.latest.category).toBe('stage2');
    expect(payload.latest.medicationTaken).toBe(true);
    expect(payloadContainsForbiddenFields(payload)).toBe(false);
    expect(JSON.stringify(payload)).not.toContain('secret note');
  });
});
