export type TimeOfDayBucket = 'morning' | 'afternoon' | 'evening' | 'night';

export const TIME_OF_DAY_BUCKETS: TimeOfDayBucket[] = [
  'morning',
  'afternoon',
  'evening',
  'night',
];

export const TIME_OF_DAY_LABELS: Record<TimeOfDayBucket, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

export const TIME_OF_DAY_HINTS: Record<TimeOfDayBucket, string> = {
  morning: '5:00–11:59',
  afternoon: '12:00–16:59',
  evening: '17:00–20:59',
  night: '21:00–4:59',
};

export type TimeOfDayReading = {
  timestamp: string;
  systolic: number;
  diastolic: number;
};

export type BucketSummary = {
  bucket: TimeOfDayBucket;
  count: number;
  avgSystolic: number | null;
  avgDiastolic: number | null;
};

/** Local wall-clock hour from an ISO timestamp. */
export function getLocalHour(isoTimestamp: string): number {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return 12;
  return date.getHours();
}

/**
 * Morning 5–11, afternoon 12–16, evening 17–20, night 21–4 (local).
 */
export function bucketForHour(hour: number): TimeOfDayBucket {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

export function bucketForTimestamp(isoTimestamp: string): TimeOfDayBucket {
  return bucketForHour(getLocalHour(isoTimestamp));
}

export function emptyBucketSummaries(): BucketSummary[] {
  return TIME_OF_DAY_BUCKETS.map((bucket) => ({
    bucket,
    count: 0,
    avgSystolic: null,
    avgDiastolic: null,
  }));
}

export function summarizeTimeOfDay(readings: TimeOfDayReading[]): BucketSummary[] {
  const acc: Record<TimeOfDayBucket, { count: number; sys: number; dia: number }> = {
    morning: { count: 0, sys: 0, dia: 0 },
    afternoon: { count: 0, sys: 0, dia: 0 },
    evening: { count: 0, sys: 0, dia: 0 },
    night: { count: 0, sys: 0, dia: 0 },
  };

  for (const reading of readings) {
    const bucket = bucketForTimestamp(reading.timestamp);
    acc[bucket].count += 1;
    acc[bucket].sys += reading.systolic;
    acc[bucket].dia += reading.diastolic;
  }

  return TIME_OF_DAY_BUCKETS.map((bucket) => {
    const { count, sys, dia } = acc[bucket];
    return {
      bucket,
      count,
      avgSystolic: count > 0 ? Math.round(sys / count) : null,
      avgDiastolic: count > 0 ? Math.round(dia / count) : null,
    };
  });
}

/** Bucket with the highest systolic average among those with enough samples. */
export function peakSystolicBucket(
  summaries: BucketSummary[],
  minCount = 3
): BucketSummary | null {
  const eligible = summaries.filter(
    (s) => s.count >= minCount && s.avgSystolic != null
  );
  if (eligible.length < 2) return null;
  return eligible.reduce((best, next) =>
    (next.avgSystolic ?? 0) > (best.avgSystolic ?? 0) ? next : best
  );
}

/**
 * Optional local-insight bullets. Fully on-device. Not medical advice.
 * Safe to call even when localInsights.ts is not present.
 */
export function timeOfDayInsightBullets(
  summaries: BucketSummary[],
  minCount = 3
): string[] {
  const peak = peakSystolicBucket(summaries, minCount);
  if (!peak || peak.avgSystolic == null || peak.avgDiastolic == null) return [];
  return [
    `${TIME_OF_DAY_LABELS[peak.bucket]} readings average ${peak.avgSystolic}/${peak.avgDiastolic} (n=${peak.count}), the highest window with enough data.`,
  ];
}
