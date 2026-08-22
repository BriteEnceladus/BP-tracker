import type { GlucoseContextTag, GlucoseDisplayUnit, GlucoseReading } from '../src/schemas';

/** ADA-style conversion: 1 mmol/L ≈ 18.0182 mg/dL. Display only — storage is always mg/dL. */
export const MGDL_PER_MMOL = 18.0182;

export const GLUCOSE_DISCLAIMER =
  'This is not medical advice. Discuss readings with a qualified clinician. BP Tracker is not a medical device and does not diagnose.';

export type GlucoseBand = 'low' | 'inRange' | 'elevated' | 'high';

export const GLUCOSE_CONTEXTS: { id: GlucoseContextTag; label: string }[] = [
  { id: 'fasting', label: 'Fasting' },
  { id: 'before_meal', label: 'Before meal' },
  { id: 'after_meal', label: 'After meal' },
  { id: 'bedtime', label: 'Bedtime' },
  { id: 'random', label: 'Random' },
  { id: 'other', label: 'Other' },
];

export function mgdlToMmol(mgdl: number): number {
  return Math.round((mgdl / MGDL_PER_MMOL) * 10) / 10;
}

export function mmolToMgdl(mmol: number): number {
  return Math.round(mmol * MGDL_PER_MMOL);
}

export function formatGlucoseValue(mgdl: number, unit: GlucoseDisplayUnit): string {
  if (unit === 'mmol/L') return mgdlToMmol(mgdl).toFixed(1);
  return String(Math.round(mgdl));
}

export function parseDisplayInput(raw: string, unit: GlucoseDisplayUnit): number | null {
  const n = Number.parseFloat(raw.trim());
  if (!Number.isFinite(n)) return null;
  return unit === 'mmol/L' ? mmolToMgdl(n) : Math.round(n);
}

/**
 * Generic reference bands in mg/dL for color only (not personal targets, not diagnosis).
 * Low < 70 · in-range 70–99 · elevated 100–125 · high ≥ 126
 */
export function getGlucoseBand(mgdl: number): GlucoseBand {
  if (mgdl < 70) return 'low';
  if (mgdl < 100) return 'inRange';
  if (mgdl < 126) return 'elevated';
  return 'high';
}

export function getGlucoseBandLabel(band: GlucoseBand): string {
  const labels: Record<GlucoseBand, string> = {
    low: 'Low',
    inRange: 'In range',
    elevated: 'Elevated',
    high: 'High',
  };
  return labels[band];
}

export type GlucosePalette = {
  glucoseLow: string;
  glucoseNormal: string;
  glucoseElevated: string;
  glucoseHigh: string;
};

export function getGlucoseBandColor(band: GlucoseBand, colors: GlucosePalette): string {
  if (band === 'low') return colors.glucoseLow;
  if (band === 'inRange') return colors.glucoseNormal;
  if (band === 'elevated') return colors.glucoseElevated;
  return colors.glucoseHigh;
}

export function getGlucoseContextLabel(context: GlucoseContextTag): string {
  return GLUCOSE_CONTEXTS.find((c) => c.id === context)?.label ?? context;
}

export function getGlucoseReadingsForDays(readings: GlucoseReading[], days: number): GlucoseReading[] {
  if (days === 0) return readings;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return readings.filter((r) => new Date(r.timestamp) >= cutoff);
}

export function getGlucoseAverage(readings: GlucoseReading[]): number | null {
  if (readings.length === 0) return null;
  const sum = readings.reduce((acc, r) => acc + r.valueMgdl, 0);
  return Math.round(sum / readings.length);
}

export function glucoseInsightLine(readings: GlucoseReading[]): string | null {
  if (readings.length < 3) return null;
  const avg = getGlucoseAverage(readings);
  if (avg == null) return null;
  const band = getGlucoseBand(avg);
  return `7-day average is ${Math.round(avg)} mg/dL (${getGlucoseBandLabel(band).toLowerCase()} on generic reference bands). ${GLUCOSE_DISCLAIMER}`;
}
