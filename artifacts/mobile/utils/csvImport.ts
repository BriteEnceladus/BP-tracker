import { BPReadingInputSchema, parseWithSchema, type BPReadingInput } from '../src/schemas';

export interface CsvImportResult {
  readings: BPReadingInput[];
  errors: string[];
}

export function parseCsvRows(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || (char === '\r' && next === '\n') || char === '\r') {
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      if (char === '\r' && next === '\n') i += 1;
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  return rows;
}

function findColumn(header: string[], aliases: string[]): number {
  return header.findIndex((cell) => aliases.some((alias) => cell.includes(alias)));
}

function toIsoTimestamp(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!Number.isNaN(Date.parse(trimmed))) {
    return new Date(trimmed).toISOString();
  }
  return null;
}

function parseMedication(value: string): boolean | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (['yes', 'true', '1', 'y'].includes(normalized)) return true;
  if (['no', 'false', '0', 'n'].includes(normalized)) return false;
  return undefined;
}

export function parseCsvReadings(csv: string): CsvImportResult {
  const rows = parseCsvRows(csv);
  if (rows.length < 2) {
    return { readings: [], errors: ['CSV must include a header row and at least one reading.'] };
  }

  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const tsIdx = findColumn(header, ['timestamp', 'date', 'time']);
  const sysIdx = findColumn(header, ['systolic']);
  const diaIdx = findColumn(header, ['diastolic']);
  const hrIdx = findColumn(header, ['heart rate', 'heartrate', 'pulse', 'bpm']);
  const notesIdx = findColumn(header, ['notes', 'note', 'comment']);
  const medIdx = findColumn(header, ['medication', 'meds']);

  if (tsIdx < 0 || sysIdx < 0 || diaIdx < 0) {
    return {
      readings: [],
      errors: ['CSV header must include Timestamp, Systolic, and Diastolic columns.'],
    };
  }

  const readings: BPReadingInput[] = [];
  const errors: string[] = [];

  rows.slice(1).forEach((row, index) => {
    const line = index + 2;
    const iso = toIsoTimestamp(row[tsIdx] ?? '');
    if (!iso) {
      errors.push(`Row ${line}: invalid date/time`);
      return;
    }

    const input = {
      timestamp: iso,
      systolic: Number(row[sysIdx]),
      diastolic: Number(row[diaIdx]),
      heartRate: hrIdx >= 0 && row[hrIdx]?.trim() ? Number(row[hrIdx]) : undefined,
      notes: notesIdx >= 0 ? row[notesIdx]?.trim() || undefined : undefined,
      medicationTaken: medIdx >= 0 ? parseMedication(row[medIdx] ?? '') : undefined,
    };

    const parsed = parseWithSchema(BPReadingInputSchema, input);
    if (!parsed.success) {
      errors.push(`Row ${line}: ${parsed.errors[0]}`);
      return;
    }
    readings.push(parsed.data);
  });

  return { readings, errors };
}

export function isDuplicateReading(
  existing: Array<Pick<BPReadingInput, 'timestamp' | 'systolic' | 'diastolic'>>,
  incoming: BPReadingInput
): boolean {
  return existing.some(
    (reading) =>
      reading.timestamp === incoming.timestamp &&
      reading.systolic === incoming.systolic &&
      reading.diastolic === incoming.diastolic
  );
}
