import { describe, expect, test } from 'vitest';
import { HashingEmbedder } from './testHelpers';

describe('HashingEmbedder', () => {
  const embedder = new HashingEmbedder();

  test('is deterministic', async () => {
    const [a] = await embedder.embedPassages(['my lease ends in March']);
    const [b] = await embedder.embedPassages(['my lease ends in March']);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  test('outputs 256-d unit vectors', async () => {
    const [v] = await embedder.embedQueries(['some words here']);
    expect(v.length).toBe(256);
    expect(Math.hypot(...v)).toBeCloseTo(1, 5);
  });

  test('similar texts score higher than unrelated ones', async () => {
    const [q, near, far] = await embedder.embedPassages(['lease ends march', 'the lease ends in march', 'pizza tonight']);
    const dot = (x: Float32Array, y: Float32Array) => x.reduce((s, v, i) => s + v * y[i], 0);
    expect(dot(q, near)).toBeGreaterThan(dot(q, far));
  });
});
