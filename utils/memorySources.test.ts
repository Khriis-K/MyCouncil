import { describe, expect, test } from 'vitest';
import { buildMemoryUnits } from '../server/memory/chunker';
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

describe('buildMemorySources debate entries', () => {
  const interjection = {
    pairId: 'Architect-Advocate',
    userText: 'my sister would have to move in with us',
    precedingCounselorText: 'Stay where your roots are.',
    timestamp: 100,
  };

  test('maps an interjection to a user source plus the counselor turn before it', () => {
    const sources = buildMemorySources({ chatHistory: {}, refinements: [], debateLog: [interjection] });
    expect(sources).toEqual([
      { id: 'debate:0:counselor', channel: 'debate', speaker: 'counselor', debatePairId: 'Architect-Advocate', text: 'Stay where your roots are.', timestamp: 99 },
      { id: 'debate:0', channel: 'debate', speaker: 'user', debatePairId: 'Architect-Advocate', text: 'my sister would have to move in with us', timestamp: 100 },
    ]);
  });

  test('without a preceding counselor turn only the user source is emitted', () => {
    const { precedingCounselorText: _p, ...bare } = interjection;
    expect(buildMemorySources({ chatHistory: {}, refinements: [], debateLog: [bare] })).toEqual([
      { id: 'debate:0', channel: 'debate', speaker: 'user', debatePairId: 'Architect-Advocate', text: 'my sister would have to move in with us', timestamp: 100 },
    ]);
  });

  test('the counselor turn gives a short reply its context in the chunker', () => {
    const short = { ...interjection, userText: 'In March', precedingCounselorText: 'When does your lease end?' };
    const units = buildMemoryUnits(buildMemorySources({ chatHistory: {}, refinements: [], debateLog: [short] }));
    expect(units).toHaveLength(1);
    expect(units[0].embedText).toBe('Counselor asked: "When does your lease end?"\nUser: "In March"');
  });

  test('keeps ids stable when more interjections are appended', () => {
    const before = buildMemorySources({ chatHistory: {}, refinements: [], debateLog: [interjection] });
    const after = buildMemorySources({
      chatHistory: {},
      refinements: [],
      debateLog: [interjection, { ...interjection, pairId: 'Sage-Rebel', userText: 'later', timestamp: 200 }],
    });
    expect(after.slice(0, 2).map(s => s.id)).toEqual(before.map(s => s.id));
    expect(after.map(s => s.id)).toEqual(['debate:0:counselor', 'debate:0', 'debate:1:counselor', 'debate:1']);
  });

  test('truncates debate text to the 2000-char server limit', () => {
    const long = { ...interjection, userText: 'a'.repeat(3000), precedingCounselorText: 'b'.repeat(3000) };
    const sources = buildMemorySources({ chatHistory: {}, refinements: [], debateLog: [long] });
    expect(sources.map(s => s.text.length)).toEqual([2000, 2000]);
  });

  test('interleaves debate entries with chat and refinements by time', () => {
    const sources = buildMemorySources({
      chatHistory: { Architect: [{ id: '1', sender: 'user', text: 'chat', timestamp: 50 }] },
      refinements: [{ text: 'ref', timestamp: 150 }],
      debateLog: [interjection],
    });
    expect(sources.map(s => s.id)).toEqual(['chat:Architect:1', 'debate:0:counselor', 'debate:0', 'refinement:0']);
  });
});
