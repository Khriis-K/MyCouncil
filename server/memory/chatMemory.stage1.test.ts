import { describe, expect, test } from 'vitest';
import { recallForChat } from './chatMemory';
import { HashingEmbedder } from './testHelpers';
import type { MemorySource } from './types';

const sources: MemorySource[] = [{ id: 'a1', channel: 'chat', speaker: 'user', counselorId: 'Architect', text: 'my lease ends in March', timestamp: 1 }];
const settings = { enabled: true, k: 5, candidatePool: 30, recentWindow: 0, reranker: 'none' as const };

describe('recallForChat stage 1', () => {
  test('uses settings.stage1', async () => {
    const result = await recallForChat({ counselorId: 'Advocate', message: 'lease', sources, settings: { ...settings, stage1: 'hybrid' }, embedder: new HashingEmbedder() });
    expect(result.trace!.config.stage1).toBe('hybrid');
  });

  test('defaults to dense', async () => {
    const result = await recallForChat({ counselorId: 'Advocate', message: 'lease', sources, settings, embedder: new HashingEmbedder() });
    expect(result.trace!.config.stage1).toBe('dense');
  });
});
