export const MIN_MEDS_COMPARE_COUNT = 3;

export type MedsGroupStats = {
  count: number;
  avgSystolic: number | null;
  avgDiastolic: number | null;
};

export type MedsVsBpSummary = {
  taken: MedsGroupStats;
  notTaken: MedsGroupStats;
  enough: boolean;
};

export type MedsVsBpReading = {
  systolic: number;
  diastolic: number;
  medicationTaken?: boolean;
};

function stats(readings: MedsVsBpReading[]): MedsGroupStats {
  if (readings.length === 0) {
    return { count: 0, avgSystolic: null, avgDiastolic: null };
  }
  const sys = readings.reduce((sum, r) => sum + r.systolic, 0);
  const dia = readings.reduce((sum, r) => sum + r.diastolic, 0);
  return {
    count: readings.length,
    avgSystolic: Math.round(sys / readings.length),
    avgDiastolic: Math.round(dia / readings.length),
  };
}

export function summarizeMedsVsBp(readings: MedsVsBpReading[]): MedsVsBpSummary {
  const taken = stats(readings.filter((r) => r.medicationTaken === true));
  const notTaken = stats(readings.filter((r) => r.medicationTaken !== true));
  return {
    taken,
    notTaken,
    enough:
      taken.count >= MIN_MEDS_COMPARE_COUNT && notTaken.count >= MIN_MEDS_COMPARE_COUNT,
  };
}

export function formatMedsVsBpLine(summary: MedsVsBpSummary): string | null {
  if (!summary.enough || summary.taken.avgSystolic == null || summary.notTaken.avgSystolic == null) {
    return null;
  }
  return `Taken: ${summary.taken.avgSystolic}/${summary.taken.avgDiastolic} (n=${summary.taken.count}). Not taken: ${summary.notTaken.avgSystolic}/${summary.notTaken.avgDiastolic} (n=${summary.notTaken.count}).`;
}

export function medsVsBpInsightBullet(summary: MedsVsBpSummary): string | null {
  const line = formatMedsVsBpLine(summary);
  if (!line) return null;
  const sysDelta =
    (summary.taken.avgSystolic ?? 0) - (summary.notTaken.avgSystolic ?? 0);
  const direction =
    Math.abs(sysDelta) < 3
      ? 'Similar systolic averages on taken vs not-taken days.'
      : sysDelta < 0
        ? 'Average systolic is lower on days marked taken.'
        : 'Average systolic is higher on days marked taken.';
  return `${line} ${direction} Local comparison only — not medical advice.`;
}
