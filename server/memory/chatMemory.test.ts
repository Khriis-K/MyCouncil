import { describe, expect, test, vi } from 'vitest';
import { recallForChat } from './chatMemory';
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
