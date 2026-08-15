import { BPReading } from '../src/schemas';
import { getAverages, getBPCategory, getReadingsForDays, type BPCategory } from './bpUtils';

export type TrendDirection = 'up' | 'down' | 'stable' | 'insufficient';

export interface AnonymizedInsightPayload {
  latest: {
    systolic: number;
    diastolic: number;
    heartRate?: number;
    category: BPCategory;
    medicationTaken: boolean;
  };
  last7: {
    count: number;
    avgSystolic: number;
    avgDiastolic: number;
    avgHeartRate: number;
  };
  last14CategoryCounts: Record<BPCategory, number>;
  trend: TrendDirection;
}

const EMPTY_COUNTS: Record<BPCategory, number> = {
  normal: 0,
  elevated: 0,
  stage1: 0,
  stage2: 0,
  crisis: 0,
};

export function buildAnonymizedInsightPayload(
  latest: Pick<BPReading, 'systolic' | 'diastolic' | 'heartRate' | 'medicationTaken'>,
  allReadings: BPReading[]
): AnonymizedInsightPayload {
  const last7 = getReadingsForDays(allReadings, 7);
  const last14 = getReadingsForDays(allReadings, 14);
  const averages = getAverages(last7);

  const last14CategoryCounts = { ...EMPTY_COUNTS };
  for (const reading of last14) {
    last14CategoryCounts[getBPCategory(reading.systolic, reading.diastolic)] += 1;
  }

  return {
    latest: {
      systolic: latest.systolic,
      diastolic: latest.diastolic,
      heartRate: latest.heartRate,
      category: getBPCategory(latest.systolic, latest.diastolic),
      medicationTaken: !!latest.medicationTaken,
    },
    last7: {
      count: last7.length,
      avgSystolic: averages.avgSystolic,
      avgDiastolic: averages.avgDiastolic,
      avgHeartRate: averages.avgHeartRate,
    },
    last14CategoryCounts,
    trend: computeTrend(allReadings),
  };
}

export function payloadContainsForbiddenFields(payload: unknown): boolean {
  const text = JSON.stringify(payload);
  return /"(notes|timestamp|createdAt|updatedAt|email|name|id)"/i.test(text);
}

function computeTrend(readings: BPReading[]): TrendDirection {
  if (readings.length < 3) return 'insufficient';
  const recent = [...readings]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-3);
  const sysDelta = recent[2].systolic - recent[0].systolic;
  const diaDelta = recent[2].diastolic - recent[0].diastolic;
  if (sysDelta >= 10 || diaDelta >= 5) return 'up';
  if (sysDelta <= -10 || diaDelta <= -5) return 'down';
  return 'stable';
}
