import { describe, expect, it } from 'vitest';
import {
  FREE_HISTORY_DAYS,
  canViewHistoryRange,
  countWithinFreeWindow,
  freeImportSummary,
} from '../../context/PremiumContext';

describe('canViewHistoryRange', () => {
  it('lets Pro see any range including All (0)', () => {
    expect(canViewHistoryRange(true, 0)).toBe(true);
    expect(canViewHistoryRange(true, 90)).toBe(true);
  });

  it('lets free users see only up to FREE_HISTORY_DAYS', () => {
    expect(canViewHistoryRange(false, 7)).toBe(true);
    expect(canViewHistoryRange(false, FREE_HISTORY_DAYS)).toBe(true);
    expect(canViewHistoryRange(false, 30)).toBe(false);
    expect(canViewHistoryRange(false, 0)).toBe(false);
  });
});

describe('countWithinFreeWindow', () => {
  const now = Date.parse('2026-08-26T12:00:00.000Z');

  it('counts recent vs older timestamps without dropping any', () => {
    const stamps = [
      '2026-08-25T12:00:00.000Z',
      '2026-08-20T12:00:00.000Z',
      '2026-07-01T12:00:00.000Z',
      '2025-01-01T12:00:00.000Z',
    ];
    expect(countWithinFreeWindow(stamps, now)).toEqual({ visible: 2, hidden: 2 });
  });

  it('treats an empty list as zero visible and hidden', () => {
    expect(countWithinFreeWindow([], now)).toEqual({ visible: 0, hidden: 0 });
  });
});

describe('freeImportSummary', () => {
  it('is short when every imported row is inside the view window', () => {
    expect(freeImportSummary(3, 3)).toBe('Added 3 readings.');
  });

  it('explains that older imported rows stay on device', () => {
    expect(freeImportSummary(5, 2)).toContain('2 are in your last 14 days');
    expect(freeImportSummary(5, 2)).toContain('3 older readings stay encrypted');
    expect(freeImportSummary(5, 2)).toContain('Nothing was deleted');
  });
});
