import { BPReading } from '../src/db';

export function getBPCategory(systolic: number, diastolic: number): string {
  if (systolic >= 180 || diastolic >= 120) return 'crisis';
  if (systolic >= 140 || diastolic >= 90) return 'stage2';
  if (systolic >= 130 || diastolic >= 80) return 'stage1';
  if (systolic >= 120 && diastolic < 80) return 'elevated';
  return 'normal';
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    normal: 'Normal',
    elevated: 'Elevated',
    stage1: 'High BP Stage 1',
    stage2: 'High BP Stage 2',
    crisis: 'Hypertensive Crisis',
  };
  return labels[category] || 'Unknown';
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

  return readings.filter(r => new Date(r.timestamp) >= cutoff);
}
