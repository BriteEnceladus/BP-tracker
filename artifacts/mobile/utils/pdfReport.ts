import { BPReading } from '../src/schemas';
import { getAverages, getBPCategory, getCategoryLabel, getReadingsForDays } from './bpUtils';

export function buildPdfHtml(readings: BPReading[]): string {
  const last30 = getReadingsForDays(readings, 30).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const averages = getAverages(last30);
  const rows = last30
    .slice(0, 40)
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

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>BP Tracker Report</title>
  <style>
    body { font-family: -apple-system, Segoe UI, sans-serif; color: #0F172A; padding: 24px; }
    h1 { margin: 0 0 4px; }
    .muted { color: #64748B; font-size: 12px; }
    .cards { display: flex; gap: 12px; margin: 20px 0; }
    .card { flex: 1; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px; }
    .value { font-size: 24px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
    th, td { border-bottom: 1px solid #E2E8F0; text-align: left; padding: 8px 6px; }
    th { color: #64748B; font-weight: 600; }
    .disclaimer { margin-top: 24px; font-size: 11px; color: #64748B; line-height: 1.5; }
  </style>
</head>
<body>
  <h1>BP Tracker Report</h1>
  <p class="muted">Last 30 days · generated ${new Date().toLocaleString()} · data stays on this device</p>
  <div class="cards">
    <div class="card"><div class="muted">Avg systolic</div><div class="value">${averages.avgSystolic || '—'}</div></div>
    <div class="card"><div class="muted">Avg diastolic</div><div class="value">${averages.avgDiastolic || '—'}</div></div>
    <div class="card"><div class="muted">Readings</div><div class="value">${last30.length}</div></div>
  </div>
  <table>
    <thead><tr><th>When</th><th>SYS</th><th>DIA</th><th>BPM</th><th>Category</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5">No readings in this period.</td></tr>'}</tbody>
  </table>
  <p class="disclaimer">
    BP Tracker is a personal wellness log, not a medical device. This report does not diagnose
    or treat any condition. Share it with a qualified clinician. Notes are omitted to reduce
    accidental disclosure of extra personal detail.
  </p>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
