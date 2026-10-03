import { describe, expect, test } from 'vitest';
import { formatMemoriesForPrompt } from './format';
import type { MemoryUnit } from './types';

const unit = (over: Partial<MemoryUnit>): MemoryUnit => ({
  id: 'u', sourceId: 'u', channel: 'chat', text: 't', embedText: 't', timestamp: 0, ...over,
});

describe('formatMemoriesForPrompt', () => {
  test('returns an empty string without units', () => {
    expect(formatMemoriesForPrompt([], {})).toBe('');
  });

  test('labels chat and refinement memories', () => {
    const out = formatMemoriesForPrompt([
      unit({ channel: 'chat', counselorId: 'Architect', text: 'My lease ends in March' }),
      unit({ channel: 'refinement', text: 'I also have a dog' }),
    ], { Architect: 'Architect' });
    expect(out).toBe([
      "THINGS THE USER SHARED EARLIER IN THIS SESSION (may or may not be relevant; use one only if it genuinely helps, and don't list them back):",
      '- [told the Architect in a 1-on-1 chat] "My lease ends in March"',
      '- [added as context to their dilemma] "I also have a dog"',
    ].join('\n'));
  });

  test('falls back to the raw counselor id when the name is unknown', () => {
    const out = formatMemoriesForPrompt([unit({ counselorId: 'Zed', text: 'hi' })], {});
    expect(out).toContain('[told the Zed in a 1-on-1 chat]');
  });
});
