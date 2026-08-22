import type { BPReading, GlucoseDisplayUnit, GlucoseReading } from '../src/schemas';
import { formatGlucoseValue, getGlucoseContextLabel } from './glucoseUtils';

export function readingsToCsv(readings: BPReading[]): string {
  const header = 'Timestamp,Systolic (mmHg),Diastolic (mmHg),Heart Rate (bpm),Notes,Medication Taken';
  const rows = readings.map((r) => {
    const ts = new Date(r.timestamp).toISOString();
    const hr = r.heartRate ?? '';
    const notes = r.notes ? `"${r.notes.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"` : '';
    const med = r.medicationTaken ? 'Yes' : 'No';
    return `${ts},${r.systolic},${r.diastolic},${hr},${notes},${med}`;
  });
  return [header, ...rows].join('\n');
}

export function glucoseToCsv(readings: GlucoseReading[], unit: GlucoseDisplayUnit = 'mg/dL'): string {
  const header = 'Timestamp,Value,Unit,Context,Notes,Medication Taken';
  const rows = readings.map((r) => {
    const ts = new Date(r.timestamp).toISOString();
    const value = formatGlucoseValue(r.valueMgdl, unit);
    const notes = r.notes ? `"${r.notes.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"` : '';
    const med = r.medicationTaken ? 'Yes' : 'No';
    return `${ts},${value},${unit},${getGlucoseContextLabel(r.context)},${notes},${med}`;
  });
  return [header, ...rows].join('\n');
}
