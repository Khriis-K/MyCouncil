import { describe, expect, test } from 'vitest';
import { arcLabel, arcLabelWidth } from './arcLabel';

describe('arcLabel', () => {
  test('a short issue is kept whole', () => {
    expect(arcLabel('Career or family?')).toBe('Career or family?');
  });

  test('a long issue is cut at a word boundary and marked with an ellipsis', () => {
    expect(arcLabel('Is this a career decision or a family decision?')).toBe('Is this a career decision…');
  });

  test('punctuation left at the cut is dropped before the ellipsis', () => {
    expect(arcLabel('Weighing safety, security, and the chance of a lifetime')).toBe('Weighing safety, security…');
  });

  test('one very long word is cut mid-word rather than left too long', () => {
    expect(arcLabel('Antidisestablishmentarianismically speaking')).toBe('Antidisestablishmentariani…');
  });
});

describe('arcLabelWidth', () => {
  // Widths measured in Chrome with the app's 16px italic display face (getBBox), October 2026.
  test.each([
    ['Is this a career decision…', 143],
    ['Weighing emotional data…', 153],
    ['abcdefghijklmnopqrstuvwxyz', 166],
  ])('leaves room for "%s" (%ipx as drawn)', (label, measured) => {
    expect(arcLabelWidth(label)).toBeGreaterThanOrEqual(measured);
  });

  test('allows no more than a fifth extra, so labels do not bend arcs needlessly', () => {
    expect(arcLabelWidth('Weighing emotional data…')).toBeLessThanOrEqual(153 * 1.2);
  });
});
