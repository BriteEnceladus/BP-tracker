import type { GlucoseReading } from '../src/schemas';
import { glucoseTargetHitRate, isGlucoseInTarget } from './targets';
import {
  GLUCOSE_DISCLAIMER,
  getGlucoseAverage,
  getGlucoseBand,
  getGlucoseBandLabel,
  getGlucoseContextLabel,
  getGlucoseReadingsForDays,
} from './glucoseUtils';

export type GlucoseTrend = 'improving' | 'stable' | 'rising' | 'insufficient';

export type GlucoseInsightCard = {
  title: string;
  bullets: string[];
  disclaimer: string;
};

function trendOf(readings: GlucoseReading[]): GlucoseTrend {
  if (readings.length < 3) return 'insufficient';
  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const mid = Math.floor(sorted.length / 2);
  const early = getGlucoseAverage(sorted.slice(0, Math.max(1, mid)));
  const late = getGlucoseAverage(sorted.slice(mid));
  if (early == null || late == null) return 'insufficient';
  const delta = late - early;
  if (delta <= -8) return 'improving';
  if (delta >= 8) return 'rising';
  return 'stable';
}

function contextAverage(
  readings: GlucoseReading[],
  context: GlucoseReading['context']
): { avg: number; count: number } | null {
  const subset = readings.filter((r) => r.context === context);
  if (subset.length < 2) return null;
  const avg = getGlucoseAverage(subset);
  if (avg == null) return null;
  return { avg, count: subset.length };
}

export function generateGlucoseInsight(
  readings: GlucoseReading[],
  targetMgdl: number
): GlucoseInsightCard | null {
  if (readings.length === 0) return null;
  const latest = [...readings].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];
  const last7 = getGlucoseReadingsForDays(readings, 7);
  const avg7 = getGlucoseAverage(last7);
  const band = getGlucoseBand(latest.valueMgdl);
  const inTarget = isGlucoseInTarget(latest.valueMgdl, { glucoseMgdl: targetMgdl });
  const hit = glucoseTargetHitRate(last7, { glucoseMgdl: targetMgdl });
  const trend = trendOf(last7.length >= 3 ? last7 : readings.slice(0, 14));
  const fasting = contextAverage(readings, 'fasting');
  const afterMeal = contextAverage(readings, 'after_meal');

  const bullets: string[] = [];
  bullets.push(
    `Latest is ${Math.round(latest.valueMgdl)} mg/dL (${getGlucoseBandLabel(band).toLowerCase()} on generic reference bands; ${getGlucoseContextLabel(latest.context)}).`
  );
  bullets.push(
    inTarget
      ? `That is below your personal target of ${targetMgdl} mg/dL.`
      : `That is at or above your personal target of ${targetMgdl} mg/dL. Targets are yours, not a diagnosis.`
  );
  if (avg7 != null && last7.length >= 2) {
    bullets.push(`7-day average is ${avg7} mg/dL across ${last7.length} reading(s).`);
  }
  if (hit.percent != null && hit.total >= 3) {
    bullets.push(`${hit.percent}% of the last ${hit.total} reading(s) were below your personal target.`);
  }
  if (trend === 'improving') {
    bullets.push('Recent values are trending lower than the earlier part of this window.');
  } else if (trend === 'rising') {
    bullets.push('Recent values are trending higher than the earlier part of this window.');
  } else if (trend === 'stable' && last7.length >= 3) {
    bullets.push('Recent values look fairly steady in this window.');
  }
  if (fasting && afterMeal) {
    bullets.push(
      `Fasting average ${fasting.avg} mg/dL (n=${fasting.count}) vs after-meal ${afterMeal.avg} mg/dL (n=${afterMeal.count}).`
    );
  }
  if (readings.length < 5) {
    bullets.push('A few more logs at consistent times will make the pattern clearer.');
  }

  const title =
    trend === 'rising'
      ? 'Glucose trending higher'
      : trend === 'improving'
        ? 'Glucose trending lower'
        : inTarget
          ? 'Latest is below your target'
          : 'Latest vs your target';

  return {
    title,
    bullets: bullets.slice(0, 5),
    disclaimer: GLUCOSE_DISCLAIMER,
  };
}
