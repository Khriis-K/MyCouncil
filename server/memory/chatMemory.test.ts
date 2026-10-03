import { describe, expect, test, vi } from 'vitest';
import { debateTranscriptSourceIds, recallForChat, recallForDebate, recallForRefinement } from './chatMemory';
import { HashingEmbedder } from './testHelpers';
import type { Embedder } from './embedder';
import type { MemorySource } from './types';

const chat = (id: string, counselorId: string, speaker: 'user' | 'counselor', text: string, timestamp: number): MemorySource => ({
  id, channel: 'chat', speaker, counselorId, text, timestamp,
});

const settings = { enabled: true, k: 5, candidatePool: 30, recentWindow: 2 };

const sources: MemorySource[] = [
  chat('a1', 'Architect', 'user', 'my lease ends in March and I must decide', 1),
  chat('a2', 'Architect', 'counselor', 'That is soon.', 2),
  chat('v1', 'Advocate', 'user', 'my sister lives in the other city', 3),
  chat('v2', 'Advocate', 'counselor', 'Tell me more.', 4),
];

describe('recallForChat', () => {
  test('recalls what the user told another counselor', async () => {
    const result = await recallForChat({
      counselorId: 'Advocate', message: 'should I wait before my lease decision', sources, settings, embedder: new HashingEmbedder(),
    });
    expect(result.used.map(u => u.sourceId)).toContain('a1');
    expect(result.fallback).toBeUndefined();
  });

  test('excludes the last recentWindow turns of the current chat, keeping older ones retrievable', async () => {
    const own: MemorySource[] = [
      chat('o1', 'Advocate', 'user', 'my lease ends in March for sure', 1),
      chat('o2', 'Advocate', 'counselor', 'ok', 2),
      chat('o3', 'Advocate', 'user', 'my lease ends in March really', 3),
      chat('o4', 'Advocate', 'counselor', 'ok', 4),
    ];
    const result = await recallForChat({
      counselorId: 'Advocate', message: 'my lease in March', sources: own, settings, embedder: new HashingEmbedder(),
    });
    const ids = result.used.map(u => u.sourceId);
    expect(ids).toContain('o1');
    expect(ids).not.toContain('o3');
  });

  test('returns a disabled fallback without touching the embedder', async () => {
    const embedder = { id: 'x', embedQueries: vi.fn(), embedPassages: vi.fn() } as unknown as Embedder;
    const result = await recallForChat({ counselorId: 'Advocate', message: 'hi', sources, settings: { ...settings, enabled: false }, embedder });
    expect(result).toMatchObject({ used: [], fallback: 'disabled' });
    expect(embedder.embedQueries).not.toHaveBeenCalled();
  });

  test('falls back with the error message instead of throwing', async () => {
    const broken: Embedder = {
      id: 'broken',
      embedQueries: async () => { throw new Error('model missing'); },
      embedPassages: async () => { throw new Error('model missing'); },
    };
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await recallForChat({ counselorId: 'Advocate', message: 'hi there friend', sources, settings, embedder: broken });
    log.mockRestore();
    expect(result).toMatchObject({ used: [], fallback: 'error: model missing' });
  });

  test('works with no sources', async () => {
    const result = await recallForChat({ counselorId: 'Advocate', message: 'hi', sources: undefined, settings, embedder: new HashingEmbedder() });
    expect(result.used).toEqual([]);
  });
});

const refinement = (id: string, text: string, timestamp: number): MemorySource => ({ id, channel: 'refinement', speaker: 'user', text, timestamp });
const debate = (id: string, speaker: 'user' | 'counselor', text: string, timestamp: number): MemorySource => ({
  id, channel: 'debate', speaker, debatePairId: 'Architect-Advocate', text, timestamp,
});

describe('recallForRefinement', () => {
  test('recalls an older refinement, a chat and a debate interjection', async () => {
    const all = [
      ...sources,
      refinement('refinement:0', 'my sister lives in the other city and needs help', 5),
      debate('debate:0', 'user', 'my lease would have to be broken early', 6),
    ];
    const result = await recallForRefinement({
      additionalContext: 'my sister and my lease', sources: all, settings, embedder: new HashingEmbedder(),
    });
    const ids = result.used.map(u => u.sourceId);
    expect(ids).toEqual(expect.arrayContaining(['refinement:0', 'debate:0', 'a1', 'v1']));
    expect(result.trace?.endpoint).toBe('refinement');
    expect(result.trace?.query).toBe('my sister and my lease');
  });

  test('excludes nothing: the open chat windows belong to other paths', async () => {
    const result = await recallForRefinement({ additionalContext: 'my lease ends in March', sources, settings, embedder: new HashingEmbedder() });
    expect(result.trace?.excludedCount).toBe(0);
  });

  test('returns a disabled fallback without touching the embedder', async () => {
    const embedder = { id: 'x', embedQueries: vi.fn(), embedPassages: vi.fn() } as unknown as Embedder;
    const result = await recallForRefinement({ additionalContext: 'hi', sources, settings: { ...settings, enabled: false }, embedder });
    expect(result).toMatchObject({ used: [], fallback: 'disabled' });
    expect(embedder.embedQueries).not.toHaveBeenCalled();
  });

  test('falls back with the error message instead of throwing', async () => {
    const broken: Embedder = {
      id: 'broken',
      embedQueries: async () => { throw new Error('model missing'); },
      embedPassages: async () => { throw new Error('model missing'); },
    };
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await recallForRefinement({ additionalContext: 'hi there', sources, settings, embedder: broken });
    log.mockRestore();
    expect(result).toMatchObject({ used: [], fallback: 'error: model missing' });
  });
});

describe('debateTranscriptSourceIds', () => {
  test('matches debate sources whose text is a transcript turn', () => {
    const all = [
      debate('debate:0:counselor', 'counselor', 'Stay.', 1),
      debate('debate:0', 'user', 'my sister would move in', 2),
      debate('debate:1', 'user', 'from an earlier visit', 0),
    ];
    const transcript = [{ speaker: 'Advocate', text: 'Stay.' }, { speaker: 'user', text: 'my sister would move in' }];
    expect(debateTranscriptSourceIds(all, transcript, ['Architect', 'Advocate'])).toEqual(['debate:0:counselor', 'debate:0']);
  });

  test('never excludes other channels, even with the same text', () => {
    const all = [chat('c1', 'Architect', 'user', 'my sister would move in', 1)];
    expect(debateTranscriptSourceIds(all, [{ speaker: 'user', text: 'my sister would move in' }], ['Architect', 'Advocate'])).toEqual([]);
  });

  test('matches the pair in either order', () => {
    const all = [debate('debate:0', 'user', 'yes', 1)];
    expect(debateTranscriptSourceIds(all, [{ speaker: 'user', text: 'yes' }], ['Advocate', 'Architect'])).toEqual(['debate:0']);
  });

  test('keeps the same words said in a different debate pair', () => {
    const other: MemorySource = { ...debate('debate:0', 'user', 'yes', 1), debatePairId: 'Sage-Rebel' };
    expect(debateTranscriptSourceIds([other], [{ speaker: 'user', text: 'yes' }], ['Architect', 'Advocate'])).toEqual([]);
  });
});

describe('recallForDebate', () => {
  test('recalls a chat memory and excludes interjections already in the transcript', async () => {
    const all = [
      ...sources,
      debate('debate:0', 'user', 'my sister in the other city is the real issue', 5),
      debate('debate:1', 'user', 'my sister also has a new job in the other city', 6),
    ];
    const history = [{ speaker: 'Architect', text: 'Move.' }, { speaker: 'user', text: 'my sister also has a new job in the other city' }];
    const result = await recallForDebate({
      userInput: 'what about my sister in the other city', history, counselorIds: ['Architect', 'Advocate'], sources: all, settings,
      embedder: new HashingEmbedder(),
    });
    const ids = result.used.map(u => u.sourceId);
    expect(ids).toEqual(expect.arrayContaining(['v1', 'debate:0']));
    expect(ids).not.toContain('debate:1');
    expect(result.trace?.endpoint).toBe('debate');
    expect(result.trace?.query).toBe('what about my sister in the other city');
  });

  test('returns a disabled fallback without touching the embedder', async () => {
    const embedder = { id: 'x', embedQueries: vi.fn(), embedPassages: vi.fn() } as unknown as Embedder;
    const result = await recallForDebate({ userInput: 'hi', history: [], counselorIds: ['Architect', 'Advocate'], sources, settings: { ...settings, enabled: false }, embedder });
    expect(result).toMatchObject({ used: [], fallback: 'disabled' });
    expect(embedder.embedQueries).not.toHaveBeenCalled();
  });

  test('works with no sources', async () => {
    const result = await recallForDebate({ userInput: 'hi', history: [], counselorIds: ['Architect', 'Advocate'], sources: undefined, settings, embedder: new HashingEmbedder() });
    expect(result.used).toEqual([]);
  });
});
