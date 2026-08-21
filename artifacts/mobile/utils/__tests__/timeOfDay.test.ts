import { describe, expect, it } from 'vitest';
import {
  bucketForHour,
  bucketForTimestamp,
  emptyBucketSummaries,
  peakSystolicBucket,
  summarizeTimeOfDay,
  timeOfDayInsightBullets,
} from '../timeOfDay';

function atLocalHour(hour: number, sys: number, dia: number) {
  return {
    timestamp: new Date(2026, 5, 15, hour, 10, 0).toISOString(),
    systolic: sys,
    diastolic: dia,
  };
}

describe('bucketForHour', () => {
  it('maps local hours into four windows', () => {
    expect(bucketForHour(5)).toBe('morning');
    expect(bucketForHour(11)).toBe('morning');
    expect(bucketForHour(12)).toBe('afternoon');
    expect(bucketForHour(16)).toBe('afternoon');
    expect(bucketForHour(17)).toBe('evening');
    expect(bucketForHour(20)).toBe('evening');
    expect(bucketForHour(21)).toBe('night');
    expect(bucketForHour(4)).toBe('night');
    expect(bucketForHour(0)).toBe('night');
  });
});

describe('summarizeTimeOfDay', () => {
  it('returns empty buckets for no readings', () => {
    expect(summarizeTimeOfDay([])).toEqual(emptyBucketSummaries());
  });

  it('averages SYS/DIA per local bucket', () => {
    const summaries = summarizeTimeOfDay([
      atLocalHour(8, 120, 80),
      atLocalHour(9, 130, 82),
      atLocalHour(18, 140, 90),
    ]);
    const morning = summaries.find((s) => s.bucket === 'morning')!;
    const evening = summaries.find((s) => s.bucket === 'evening')!;
    const night = summaries.find((s) => s.bucket === 'night')!;
    expect(morning.count).toBe(2);
    expect(morning.avgSystolic).toBe(125);
    expect(morning.avgDiastolic).toBe(81);
    expect(evening.count).toBe(1);
    expect(evening.avgSystolic).toBe(140);
    expect(night.count).toBe(0);
    expect(night.avgSystolic).toBeNull();
  });

  it('uses local hour from ISO timestamps', () => {
    const ts = new Date(2026, 0, 2, 7, 0, 0).toISOString();
    expect(bucketForTimestamp(ts)).toBe('morning');
  });
});

describe('peakSystolicBucket', () => {
  it('needs at least two buckets with minCount samples', () => {
    const summaries = summarizeTimeOfDay([
      atLocalHour(8, 150, 90),
      atLocalHour(8, 148, 88),
      atLocalHour(8, 146, 86),
    ]);
    expect(peakSystolicBucket(summaries, 3)).toBeNull();
  });

  it('picks the higher systolic window when both have enough data', () => {
    const summaries = summarizeTimeOfDay([
      atLocalHour(8, 120, 70),
      atLocalHour(8, 122, 72),
      atLocalHour(8, 118, 68),
      atLocalHour(19, 140, 85),
      atLocalHour(19, 138, 84),
      atLocalHour(19, 142, 86),
    ]);
    const peak = peakSystolicBucket(summaries, 3);
    expect(peak?.bucket).toBe('evening');
    expect(peak?.avgSystolic).toBe(140);
  });
});

describe('timeOfDayInsightBullets', () => {
  it('stays empty until enough data exists', () => {
    expect(timeOfDayInsightBullets(summarizeTimeOfDay([atLocalHour(8, 120, 80)]))).toEqual([]);
  });

  it('emits a local numbers-only bullet for the peak window', () => {
    const bullets = timeOfDayInsightBullets(
      summarizeTimeOfDay([
        atLocalHour(8, 120, 70),
        atLocalHour(8, 122, 72),
        atLocalHour(8, 118, 68),
        atLocalHour(19, 140, 85),
        atLocalHour(19, 138, 84),
        atLocalHour(19, 142, 86),
      ])
    );
    expect(bullets).toHaveLength(1);
    expect(bullets[0]).toMatch(/Evening readings average 140\/85/);
  });
});
