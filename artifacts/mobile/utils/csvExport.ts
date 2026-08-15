import { BPReading } from '../src/schemas';

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
