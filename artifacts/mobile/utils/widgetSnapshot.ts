import type { BPReading } from '../src/db';
import { getBPCategory, getCategoryLabel, type BPCategory } from './bpUtils';
import { getGlucoseBand, getGlucoseBandLabel, type GlucoseBand } from './glucoseUtils';

export type WidgetSnapshotReason = 'locked' | 'off' | 'empty';

/** Redacted home-screen payload. No notes, ids, names, or reading timestamps. */
export type WidgetSnapshot = {
  showNumbers: boolean;
  reason?: WidgetSnapshotReason;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  category?: BPCategory;
  categoryLabel?: string;
  sparkline?: number[];
  glucoseMgdl?: number;
  glucoseBand?: GlucoseBand;
  glucoseLabel?: string;
  glucoseSparkline?: number[];
};

export const LOCKED_WIDGET_SNAPSHOT: WidgetSnapshot = {
  showNumbers: false,
  reason: 'locked',
};

export const OFF_WIDGET_SNAPSHOT: WidgetSnapshot = {
  showNumbers: false,
  reason: 'off',
};

const FORBIDDEN_KEY = /"(notes|timestamp|createdAt|updatedAt|email|name|id)"/i;

export function snapshotContainsForbiddenFields(payload: unknown): boolean {
  return FORBIDDEN_KEY.test(JSON.stringify(payload));
}

function sparklineSystolic(readings: Array<Pick<BPReading, 'systolic' | 'timestamp'>>): number[] {
  if (readings.length === 0) return [];
  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  return sorted.slice(-7).map((r) => r.systolic);
}

export function buildWidgetSnapshot(input: {
  enabled: boolean;
  locked: boolean;
  readings: Array<Pick<BPReading, 'systolic' | 'diastolic' | 'heartRate' | 'timestamp'>>;
  glucose?: Array<{ valueMgdl: number; timestamp: string }>;
}): WidgetSnapshot {
  if (!input.enabled) return OFF_WIDGET_SNAPSHOT;
  if (input.locked) return LOCKED_WIDGET_SNAPSHOT;
  const glucose = input.glucose ?? [];
  if (input.readings.length === 0 && glucose.length === 0) {
    return { showNumbers: false, reason: 'empty' };
  }

  const latest =
    input.readings.length > 0
      ? [...input.readings].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0]
      : null;
  const latestGlu =
    glucose.length > 0
      ? [...glucose].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0]
      : null;

  const category = latest ? getBPCategory(latest.systolic, latest.diastolic) : undefined;
  const gluBand = latestGlu ? getGlucoseBand(latestGlu.valueMgdl) : undefined;

  return {
    showNumbers: true,
    ...(latest
      ? {
          systolic: latest.systolic,
          diastolic: latest.diastolic,
          ...(typeof latest.heartRate === 'number' ? { heartRate: latest.heartRate } : {}),
          category,
          categoryLabel: category ? getCategoryLabel(category) : undefined,
          sparkline: sparklineSystolic(input.readings),
        }
      : {}),
    ...(latestGlu && gluBand
      ? {
          glucoseMgdl: Math.round(latestGlu.valueMgdl),
          glucoseBand: gluBand,
          glucoseLabel: getGlucoseBandLabel(gluBand),
          glucoseSparkline: [...glucose]
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .slice(-7)
            .map((g) => Math.round(g.valueMgdl)),
        }
      : {}),
  };
}
