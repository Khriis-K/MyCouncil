import { describe, expect, test } from 'vitest';
import { buildMemoryUnits } from './chunker';
import type { MemorySource } from './types';

const src = (over: Partial<MemorySource> & { id: string }): MemorySource => ({
  channel: 'chat', speaker: 'user', counselorId: 'Architect', text: 'x', timestamp: 0, ...over,
});

describe('buildMemoryUnits', () => {
  test('only user turns become units, sorted by timestamp', () => {
    const units = buildMemoryUnits([
      src({ id: 'b', text: 'second thing I said here today ok', timestamp: 2 }),
      src({ id: 'c', speaker: 'counselor', text: 'counselor reply', timestamp: 3 }),
      src({ id: 'a', text: 'first thing I said here today ok', timestamp: 1 }),
    ]);
    expect(units.map(u => u.sourceId)).toEqual(['a', 'b']);
    expect(units[0]).toMatchObject({ id: 'a', channel: 'chat', counselorId: 'Architect', timestamp: 1 });
  });

  test('short reply after a counselor turn in the same chat embeds with context', () => {
    const [unit] = buildMemoryUnits([
      src({ id: 'c1', speaker: 'counselor', text: 'When does your lease end?', timestamp: 1 }),
      src({ id: 'u1', text: 'In March', timestamp: 2 }),
    ]);
    expect(unit.text).toBe('In March');
    expect(unit.embedText).toBe('Counselor asked: "When does your lease end?"\nUser: "In March"');
  });

  test('truncates the counselor context to 200 chars', () => {
    const [unit] = buildMemoryUnits([
      src({ id: 'c1', speaker: 'counselor', text: 'q'.repeat(300), timestamp: 1 }),
      src({ id: 'u1', text: 'yes', timestamp: 2 }),
    ]);
    expect(unit.embedText).toBe(`Counselor asked: "${'q'.repeat(200)}"\nUser: "yes"`);
  });

  test('short reply gets no context when the previous turn is another counselor chat', () => {
    const [unit] = buildMemoryUnits([
      src({ id: 'c1', speaker: 'counselor', counselorId: 'Advocate', text: 'Question?', timestamp: 1 }),
      src({ id: 'u1', counselorId: 'Architect', text: 'In March', timestamp: 2 }),
    ]);
    expect(unit.embedText).toBe('In March');
  });

  test('short reply gets no context when the previous same-chat turn is from the user', () => {
    const units = buildMemoryUnits([
      src({ id: 'u0', text: 'I have a long first message of many words ok', timestamp: 1 }),
      src({ id: 'u1', text: 'In March', timestamp: 2 }),
    ]);
    expect(units[1].embedText).toBe('In March');
  });

  test('a reply of 8+ words never gets context', () => {
    const text = 'one two three four five six seven eight';
    const [unit] = buildMemoryUnits([
      src({ id: 'c1', speaker: 'counselor', text: 'Q?', timestamp: 1 }),
      src({ id: 'u1', text, timestamp: 2 }),
    ]);
    expect(unit.embedText).toBe(text);
  });

  test('debate turns are matched by pair id', () => {
    const [unit] = buildMemoryUnits([
      src({ id: 'c1', channel: 'debate', speaker: 'counselor', counselorId: undefined, debatePairId: 'a-b', text: 'Claim', timestamp: 1 }),
      src({ id: 'u1', channel: 'debate', counselorId: undefined, debatePairId: 'a-b', text: 'No way', timestamp: 2 }),
    ]);
    expect(unit.embedText).toContain('Counselor asked: "Claim"');
    expect(unit.debatePairId).toBe('a-b');
  });

  test('splits turns over 600 chars into <=400 char sentence chunks that keep the sourceId', () => {
    const sentence = 'This is a reasonably long sentence about my lease and the move. ';
    const text = sentence.repeat(14).trim();
    expect(text.length).toBeGreaterThan(600);
    const units = buildMemoryUnits([src({ id: 'u1', text, timestamp: 1 })]);
    expect(units.length).toBeGreaterThan(1);
    expect(units.map(u => u.id)).toEqual(units.map((_, i) => `u1#${i}`));
    for (const u of units) {
      expect(u.sourceId).toBe('u1');
      expect(u.text.length).toBeLessThanOrEqual(400);
      expect(u.embedText).toBe(u.text);
    }
    expect(units.map(u => u.text).join(' ')).toBe(text);
  });

  test('a turn of exactly 600 chars is not split', () => {
    const units = buildMemoryUnits([src({ id: 'u1', text: 'a '.repeat(300).trim(), timestamp: 1 })]);
    expect(units).toHaveLength(1);
    expect(units[0].id).toBe('u1');
  });
});
