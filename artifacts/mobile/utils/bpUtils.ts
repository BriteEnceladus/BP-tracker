import { BPReading } from '../src/db';

export type BPCategory =
  | 'crisis'
  | 'stage2'
  | 'stage1'
  | 'elevated'
  | 'normal'
  | 'low'
  | 'tooLow';

type AgeBand = {
  minAge: number;
  maxAge: number;
  minSys: number;
  minDia: number;
  maxSys: number;
  maxDia: number;
};

const AGE_BANDS: AgeBand[] = [
  { minAge: 20, maxAge: 24, minSys: 108, minDia: 75, maxSys: 132, maxDia: 83 },
  { minAge: 25, maxAge: 29, minSys: 109, minDia: 76, maxSys: 133, maxDia: 84 },
  { minAge: 30, maxAge: 34, minSys: 110, minDia: 77, maxSys: 134, maxDia: 85 },
  { minAge: 35, maxAge: 39, minSys: 111, minDia: 78, maxSys: 135, maxDia: 86 },
  { minAge: 40, maxAge: 44, minSys: 112, minDia: 79, maxSys: 137, maxDia: 87 },
  { minAge: 45, maxAge: 49, minSys: 115, minDia: 80, maxSys: 139, maxDia: 88 },
  { minAge: 50, maxAge: 54, minSys: 116, minDia: 81, maxSys: 142, maxDia: 89 },
  { minAge: 55, maxAge: 59, minSys: 118, minDia: 82, maxSys: 144, maxDia: 90 },
  { minAge: 60, maxAge: 120, minSys: 121, minDia: 83, maxSys: 147, maxDia: 91 },
];

function ageBandFor(age: number): AgeBand | null {
  if (!Number.isFinite(age) || age < 20) return null;
  return AGE_BANDS.find((b) => age >= b.minAge && age <= b.maxAge) ?? AGE_BANDS[AGE_BANDS.length - 1];
}

export function getBPCategory(
  systolic: number,
  diastolic: number,
  age?: number | null
): BPCategory {
  if (systolic >= 180 || diastolic >= 120) return 'crisis';
  if (systolic >= 140 || diastolic >= 90) return 'stage2';
  if (systolic >= 130 || diastolic >= 80) return 'stage1';
  if (systolic < 70 || diastolic < 40) return 'tooLow';
  if (systolic < 90 || diastolic < 60) return 'low';
  if (systolic >= 120 && diastolic < 80) return 'elevated';

  const band = age != null ? ageBandFor(age) : null;
  if (band && (systolic > band.maxSys || diastolic > band.maxDia)) return 'elevated';
  if (band && (systolic < band.minSys || diastolic < band.minDia)) return 'low';

  return 'normal';
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    normal: 'Normal',
    elevated: 'Elevated',
    stage1: 'Stage 1',
    stage2: 'Stage 2',
    crisis: 'Crisis',
    low: 'Low',
    tooLow: 'Too low',
  };
  return labels[category] || 'Unknown';
}

export type CategoryPalette = Record<BPCategory, string> & Record<string, string>;

export function getCategoryColor(category: BPCategory, colors: CategoryPalette): string {
  return colors[category] ?? colors.normal;
}

export function getAverages(readings: BPReading[]) {
  if (readings.length === 0) {
    return { avgSystolic: 0, avgDiastolic: 0, avgHeartRate: 0 };
  }
  const sumSys = readings.reduce((sum, r) => sum + r.systolic, 0);
  const sumDia = readings.reduce((sum, r) => sum + r.diastolic, 0);
  const sumHr = readings.reduce((sum, r) => sum + (r.heartRate || 0), 0);
  return {
    avgSystolic: Math.round(sumSys / readings.length),
    avgDiastolic: Math.round(sumDia / readings.length),
    avgHeartRate: Math.round(sumHr / readings.length),
  };
}

export function getReadingsForDays(readings: BPReading[], days: number) {
  if (days === 0) return readings;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return readings.filter((r) => new Date(r.timestamp) >= cutoff);
}
