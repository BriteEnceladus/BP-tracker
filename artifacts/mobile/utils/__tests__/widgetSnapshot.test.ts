import { describe, expect, it } from 'vitest';
import { buildWidgetSnapshot, snapshotContainsForbiddenFields } from '../widgetSnapshot';

const sample = [
  {
    systolic: 118,
    diastolic: 76,
    heartRate: 70,
    timestamp: '2026-08-18T12:00:00.000Z',
    notes: 'secret note',
    id: 9,
    name: 'should never appear',
  },
  {
    systolic: 132,
    diastolic: 84,
    timestamp: '2026-08-19T08:00:00.000Z',
  },
];

describe('buildWidgetSnapshot', () => {
  it('hides numbers when locked or disabled', () => {
    expect(buildWidgetSnapshot({ enabled: false, locked: false, readings: sample }).showNumbers).toBe(
      false
    );
    expect(buildWidgetSnapshot({ enabled: true, locked: true, readings: sample }).reason).toBe(
      'locked'
    );
  });

  it('uses the latest SYS/DIA and a short sparkline', () => {
    const snap = buildWidgetSnapshot({ enabled: true, locked: false, readings: sample });
    expect(snap.showNumbers).toBe(true);
    expect(snap.systolic).toBe(132);
    expect(snap.diastolic).toBe(84);
    expect(snap.sparkline).toEqual([118, 132]);
    expect(snapshotContainsForbiddenFields(snap)).toBe(false);
  });

  it('never copies notes, ids, names, or reading timestamps onto the snapshot', () => {
    const snap = buildWidgetSnapshot({ enabled: true, locked: false, readings: sample });
    const json = JSON.stringify(snap);
    expect(json).not.toMatch(/secret note/);
    expect(json).not.toMatch(/should never appear/);
    expect(json).not.toMatch(/2026-08-19T08:00:00/);
    expect(snap).not.toHaveProperty('notes');
    expect(snap).not.toHaveProperty('id');
    expect(snap).not.toHaveProperty('timestamp');
  });

  it('adds a redacted glucose value without notes or timestamps', () => {
    const snap = buildWidgetSnapshot({
      enabled: true,
      locked: false,
      readings: sample,
      glucose: [{ valueMgdl: 99, timestamp: '2026-08-19T09:00:00.000Z', notes: 'secret glu' } as never],
    });
    expect(snap.glucoseMgdl).toBe(99);
    expect(snap.glucoseBand).toBe('inRange');
    const json = JSON.stringify(snap);
    expect(json).not.toMatch(/secret glu/);
    expect(json).not.toMatch(/2026-08-19T09:00:00/);
  });
});
