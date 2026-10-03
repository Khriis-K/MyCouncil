import { describe, expect, test } from 'vitest';
import { recallForChat } from './chatMemory';
import type { Reranker } from './reranker';
import { HashingEmbedder } from './testHelpers';
import type { MemorySource } from './types';

const chat = (id: string, counselorId: string, text: string, timestamp: number): MemorySource => ({
  id, channel: 'chat', speaker: 'user', counselorId, text, timestamp,
});

const sources = [chat('a1', 'Architect', 'my lease ends in March', 1), chat('a2', 'Architect', 'I like pizza', 2)];
const settings = { enabled: true, k: 5, candidatePool: 30, recentWindow: 0 };

describe('recallForChat with a reranker', () => {
  test('passes the reranker to the pipeline and tags the trace as chat', async () => {
    const reranker: Reranker = { id: 'fake', score: async (_q, passages) => passages.map(() => 1) };
    const result = await recallForChat({ counselorId: 'Advocate', message: 'lease', sources, settings, embedder: new HashingEmbedder(), reranker });
    expect(result.trace!.config.rerankerId).toBe('fake');
    expect(result.trace!.endpoint).toBe('chat');
  });

  test("settings.reranker 'none' runs stage 1 only", async () => {
    const result = await recallForChat({
      counselorId: 'Advocate', message: 'lease', sources, settings: { ...settings, reranker: 'none' }, embedder: new HashingEmbedder(),
    });
    expect(result.trace!.config.rerankerId).toBeNull();
  });

  test('a reranker failure keeps the memories and is not a recall fallback', async () => {
    const reranker: Reranker = { id: 'broken', score: async () => { throw new Error('boom'); } };
    const result = await recallForChat({ counselorId: 'Advocate', message: 'lease', sources, settings, embedder: new HashingEmbedder(), reranker });
    expect(result.fallback).toBeUndefined();
    expect(result.used).toHaveLength(2);
    expect(result.trace!.fallback).toBe('rerank_failed: boom');
  });
});
