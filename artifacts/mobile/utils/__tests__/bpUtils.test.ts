import { describe, expect, it } from 'vitest';
import { getBPCategory, getCategoryColor, getCategoryLabel } from '../bpUtils';

const palette = {
  normal: '#16A34A',
  elevated: '#D97706',
  stage1: '#EA580C',
  stage2: '#DC2626',
  crisis: '#7F1D1D',
};

describe('getBPCategory', () => {
  it('classifies AHA-style categories', () => {
    expect(getBPCategory(110, 70)).toBe('normal');
    expect(getBPCategory(124, 70)).toBe('elevated');
    expect(getBPCategory(132, 82)).toBe('stage1');
    expect(getBPCategory(150, 95)).toBe('stage2');
    expect(getBPCategory(185, 110)).toBe('crisis');
    expect(getBPCategory(120, 121)).toBe('crisis');
  });

  it('uses the higher-severity rule when sys and dia disagree', () => {
    expect(getBPCategory(145, 70)).toBe('stage2');
    expect(getBPCategory(118, 85)).toBe('stage1');
  });
});

describe('category presentation', () => {
  it('maps each category to the shared palette', () => {
    expect(getCategoryColor('normal', palette)).toBe(palette.normal);
    expect(getCategoryColor('crisis', palette)).toBe(palette.crisis);
    expect(getCategoryLabel('stage1')).toBe('High BP Stage 1');
  });
});
