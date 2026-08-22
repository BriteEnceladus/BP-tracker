import type { BPReading, GlucoseReading } from '../src/schemas';
import {
  getAverages,
  getBPCategory,
  getCategoryLabel,
  getReadingsForDays,
  type BPCategory,
} from './bpUtils';

export const PDF_DISCLAIMER =
  'BP Tracker is a personal wellness log, not a medical device. This report does not diagnose or treat any condition. Share it with a qualified clinician. Notes are omitted to reduce accidental disclosure of extra personal detail.';

export type PdfMed = {
  name: string;
  dosage: string;
  frequency: string;
  active?: boolean;
};

export type PdfReportOptions = {
  medications?: PdfMed[];
  glucose?: GlucoseReading[];
  target?: { systolic: number; diastolic: number; hitPercent: number | null } | null;
  streak?: { current: number; best: number } | null;
  now?: Date;
};

export type MonthAverage = {
  key: string;
  label: string;
  count: number;
  avgSystolic: number;
  avgDiastolic: number;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function lastTwelveMonthKeys(now: Date = new Date()): string[] {
  const keys: string[] = [];
  const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

export function monthAverages(readings: BPReading[], now: Date = new Date()): MonthAverage[] {
  const keys = lastTwelveMonthKeys(now);
  const grouped = new Map<string, BPReading[]>();
  for (const key of keys) grouped.set(key, []);
  for (const reading of readings) {
    const date = new Date(reading.timestamp);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const bucket = grouped.get(key);
    if (bucket) bucket.push(reading);
  }
  return keys.map((key) => {
    const rows = grouped.get(key) ?? [];
    const averages = getAverages(rows);
    const [year, month] = key.split('-');
    const label = new Date(Number(year), Number(month) - 1, 1).toLocaleString(undefined, {
      month: 'short',
      year: 'numeric',
    });
    return {
      key,
      label,
      count: rows.length,
      avgSystolic: averages.avgSystolic,
      avgDiastolic: averages.avgDiastolic,
    };
  });
}

export function categoryCounts(readings: BPReading[]): Record<BPCategory, number> {
  const counts: Record<BPCategory, number> = {
    normal: 0,
    elevated: 0,
    stage1: 0,
    stage2: 0,
    crisis: 0,
  };
  for (const reading of readings) {
    counts[getBPCategory(reading.systolic, reading.diastolic)] += 1;
  }
  return counts;
}

function readingRows(readings: BPReading[], limit = 40): string {
  return readings
    .slice(0, limit)
    .map((r) => {
      const category = getCategoryLabel(getBPCategory(r.systolic, r.diastolic));
      return `<tr>
        <td>${escapeHtml(new Date(r.timestamp).toLocaleString())}</td>
        <td>${r.systolic}</td>
        <td>${r.diastolic}</td>
        <td>${r.heartRate ?? '—'}</td>
        <td>${escapeHtml(category)}</td>
      </tr>`;
    })
    .join('');
}

function sharedStyles(): string {
  return `
    body { font-family: -apple-system, Segoe UI, sans-serif; color: #0F172A; padding: 24px; }
    h1 { margin: 0 0 4px; }
    h2 { margin: 28px 0 8px; font-size: 16px; }
    .muted { color: #64748B; font-size: 12px; }
    .cards { display: flex; gap: 12px; margin: 20px 0; flex-wrap: wrap; }
    .card { flex: 1; min-width: 120px; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px; }
    .value { font-size: 24px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
    th, td { border-bottom: 1px solid #E2E8F0; text-align: left; padding: 8px 6px; }
    th { color: #64748B; font-weight: 600; }
    .disclaimer { margin-top: 24px; font-size: 11px; color: #64748B; line-height: 1.5; }
    .page-break { page-break-before: always; }
  `;
}

export function buildPdfHtml(readings: BPReading[], options: PdfReportOptions = {}): string {
  const now = options.now ?? new Date();
  const last30 = getReadingsForDays(readings, 30).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const yearReadings = getReadingsForDays(readings, 365);
  const yearAvg = getAverages(yearReadings);
  const months = monthAverages(readings, now);
  const counts = categoryCounts(yearReadings);
  const meds = (options.medications ?? []).filter((m) => m.active !== false);
  const monthRows = months
    .map(
      (m) => `<tr>
        <td>${escapeHtml(m.label)}</td>
        <td>${m.count ? m.avgSystolic : '—'}</td>
        <td>${m.count ? m.avgDiastolic : '—'}</td>
        <td>${m.count || '—'}</td>
      </tr>`
    )
    .join('');
  const categoryRows = (Object.keys(counts) as BPCategory[])
    .map(
      (key) => `<tr>
        <td>${escapeHtml(getCategoryLabel(key))}</td>
        <td>${counts[key]}</td>
      </tr>`
    )
    .join('');
  const medRows = meds
    .map(
      (m) => `<tr>
        <td>${escapeHtml(m.name)}</td>
        <td>${escapeHtml(m.dosage)}</td>
        <td>${escapeHtml(m.frequency)}</td>
      </tr>`
    )
    .join('');
  const glucoseRows = (options.glucose ?? [])
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 40)
    .map(
      (g) => `<tr>
        <td>${escapeHtml(new Date(g.timestamp).toLocaleString())}</td>
        <td>${Math.round(g.valueMgdl)}</td>
        <td>${escapeHtml(g.context)}</td>
      </tr>`
    )
    .join('');

  const targetBlock =
    options.target != null
      ? `<div class="card"><div class="muted">In personal target</div><div class="value">${
          options.target.hitPercent == null ? '—' : `${options.target.hitPercent}%`
        }</div><div class="muted">below ${options.target.systolic}/${options.target.diastolic}</div></div>`
      : '';
  const streakBlock =
    options.streak != null
      ? `<div class="card"><div class="muted">Logging streak</div><div class="value">${options.streak.current}</div><div class="muted">best ${options.streak.best}</div></div>`
      : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>BP Tracker Year in Review</title>
  <style>${sharedStyles()}</style>
</head>
<body>
  <h1>BP Tracker Year in Review</h1>
  <p class="muted">Last 12 months · generated ${escapeHtml(now.toLocaleString())} · built on this device · notes omitted</p>
  <div class="cards">
    <div class="card"><div class="muted">Avg systolic</div><div class="value">${yearAvg.avgSystolic || '—'}</div></div>
    <div class="card"><div class="muted">Avg diastolic</div><div class="value">${yearAvg.avgDiastolic || '—'}</div></div>
    <div class="card"><div class="muted">Readings</div><div class="value">${yearReadings.length}</div></div>
    ${targetBlock}
    ${streakBlock}
  </div>

  <h2>Monthly averages</h2>
  <table>
    <thead><tr><th>Month</th><th>Avg SYS</th><th>Avg DIA</th><th>Readings</th></tr></thead>
    <tbody>${monthRows}</tbody>
  </table>

  <h2>Category counts (12 months)</h2>
  <table>
    <thead><tr><th>Category</th><th>Count</th></tr></thead>
    <tbody>${categoryRows}</tbody>
  </table>

  <h2>Active medications</h2>
  <table>
    <thead><tr><th>Name</th><th>Dosage</th><th>Frequency</th></tr></thead>
    <tbody>${medRows || '<tr><td colspan="3">No active medications listed.</td></tr>'}</tbody>
  </table>

  <h2>Glucose (mg/dL, last entries)</h2>
  <p class="muted">Educational log only. Not diagnostic. Notes omitted.</p>
  <table>
    <thead><tr><th>When</th><th>mg/dL</th><th>Context</th></tr></thead>
    <tbody>${glucoseRows || '<tr><td colspan="3">No glucose readings.</td></tr>'}</tbody>
  </table>

  <div class="page-break"></div>
  <h1>Appendix · last 30 days</h1>
  <p class="muted">${last30.length} readings · timestamps shown in this device’s locale</p>
  <table>
    <thead><tr><th>When</th><th>SYS</th><th>DIA</th><th>BPM</th><th>Category</th></tr></thead>
    <tbody>${readingRows(last30) || '<tr><td colspan="5">No readings in this period.</td></tr>'}</tbody>
  </table>
  <p class="disclaimer">${PDF_DISCLAIMER}</p>
</body>
</html>`;
}
