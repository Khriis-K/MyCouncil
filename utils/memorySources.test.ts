import { describe, expect, test } from 'vitest';
import { buildMemorySources } from './memorySources';

describe('buildMemorySources', () => {
  test('returns nothing for empty input', () => {
    expect(buildMemorySources({ chatHistory: {}, refinements: [] })).toEqual([]);
  });

  test('maps chat messages per counselor with stable ids', () => {
    const sources = buildMemorySources({
      chatHistory: {
        Architect: [
          { id: '10', sender: 'user', text: 'my lease ends in March', timestamp: 10 },
          { id: '11', sender: 'counselor', text: 'Noted.', timestamp: 11 },
        ],
        Advocate: [{ id: '20', sender: 'user', text: 'hello', timestamp: 20 }],
      },
      refinements: [],
    });
    expect(sources).toEqual([
      { id: 'chat:Architect:10', channel: 'chat', speaker: 'user', counselorId: 'Architect', text: 'my lease ends in March', timestamp: 10 },
      { id: 'chat:Architect:11', channel: 'chat', speaker: 'counselor', counselorId: 'Architect', text: 'Noted.', timestamp: 11 },
      { id: 'chat:Advocate:20', channel: 'chat', speaker: 'user', counselorId: 'Advocate', text: 'hello', timestamp: 20 },
    ]);
  });

  test('maps refinements as user sources indexed by position', () => {
    const sources = buildMemorySources({
      chatHistory: {},
      refinements: [{ text: 'I have a dog', timestamp: 5 }, { text: 'and a cat', timestamp: 6 }],
    });
    expect(sources).toEqual([
      { id: 'refinement:0', channel: 'refinement', speaker: 'user', text: 'I have a dog', timestamp: 5 },
      { id: 'refinement:1', channel: 'refinement', speaker: 'user', text: 'and a cat', timestamp: 6 },
    ]);
  });

  test('keeps ids stable when more messages are appended', () => {
    const msg = { id: '10', sender: 'user' as const, text: 'a', timestamp: 10 };
    const before = buildMemorySources({ chatHistory: { Architect: [msg] }, refinements: [] });
    const after = buildMemorySources({
      chatHistory: { Architect: [msg, { id: '11', sender: 'counselor', text: 'b', timestamp: 11 }] },
      refinements: [],
    });
    expect(after[0].id).toBe(before[0].id);
  });

  test('truncates text to the 2000-char server limit', () => {
    const [s] = buildMemorySources({ chatHistory: {}, refinements: [{ text: 'a'.repeat(3000), timestamp: 1 }] });
    expect(s.text).toHaveLength(2000);
  });

  test('caps at the most recent 500 sources', () => {
    const refinements = Array.from({ length: 600 }, (_, i) => ({ text: `r${i}`, timestamp: i }));
    const sources = buildMemorySources({ chatHistory: {}, refinements });
    expect(sources).toHaveLength(500);
    expect(sources.at(-1)!.id).toBe('refinement:599');
    expect(sources[0].id).toBe('refinement:100');
  });
});
