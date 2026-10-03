import { describe, expect, test } from 'vitest';
import { assignSplits, DOMAINS, SCENARIOS_PER_DOMAIN } from './split';

const scenarios = DOMAINS.flatMap(domain =>
  Array.from({ length: SCENARIOS_PER_DOMAIN }, (_, i) => ({ id: `${domain.replace(/\W+/g, '-')}-${i + 1}`, domain })),
);

describe('assignSplits', () => {
  const splits = assignSplits(scenarios, 'seed');

  test('gives every scenario exactly one split, 16 dev and 32 test overall', () => {
    expect(splits.size).toBe(48);
    expect([...splits.values()].filter(s => s === 'dev')).toHaveLength(16);
    expect([...splits.values()].filter(s => s === 'test')).toHaveLength(32);
  });

  test('is stratified: 2 dev and 4 test per domain', () => {
    for (const domain of DOMAINS) {
      const own = scenarios.filter(s => s.domain === domain).map(s => splits.get(s.id));
      expect(own.filter(s => s === 'dev')).toHaveLength(2);
      expect(own.filter(s => s === 'test')).toHaveLength(4);
    }
  });

  test('is deterministic for a seed and independent of input order', () => {
    expect([...assignSplits([...scenarios].reverse(), 'seed')].sort()).toEqual([...splits].sort());
  });

  test('a different seed changes the assignment', () => {
    expect([...assignSplits(scenarios, 'other')].sort()).not.toEqual([...splits].sort());
  });

  test('still stratifies when a dropped scenario leaves a domain short', () => {
    const fewer = scenarios.filter(s => s.id !== 'career-1');
    const result = assignSplits(fewer, 'seed');
    const career = fewer.filter(s => s.domain === 'career').map(s => result.get(s.id));
    expect(career.filter(s => s === 'dev')).toHaveLength(2);
  });
});
