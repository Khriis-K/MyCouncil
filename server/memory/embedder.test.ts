import { describe, expect, test } from 'vitest';
import { CachedEmbedder, type Embedder } from './embedder';

class CountingEmbedder implements Embedder {
  readonly id = 'counting';
  calls: { kind: string; texts: string[] }[] = [];
  async embedQueries(texts: string[]) { this.calls.push({ kind: 'q', texts }); return texts.map(t => new Float32Array([t.length])); }
  async embedPassages(texts: string[]) { this.calls.push({ kind: 'p', texts }); return texts.map(t => new Float32Array([t.length])); }
}

describe('CachedEmbedder', () => {
  test('counts misses then hits, and skips the inner embedder on a hit', async () => {
    const inner = new CountingEmbedder();
    const cached = new CachedEmbedder(inner);
    await cached.embedPassages(['aa', 'bbb']);
    expect(cached.stats()).toEqual({ hits: 0, misses: 2 });
    const out = await cached.embedPassages(['bbb', 'aa']);
    expect(cached.stats()).toEqual({ hits: 2, misses: 2 });
    expect(inner.calls).toHaveLength(1);
    expect(Array.from(out[0])).toEqual([3]);
    expect(Array.from(out[1])).toEqual([2]);
  });

  test('only sends uncached texts to the inner embedder, preserving order', async () => {
    const inner = new CountingEmbedder();
    const cached = new CachedEmbedder(inner);
    await cached.embedPassages(['aa']);
    const out = await cached.embedPassages(['aa', 'cccc']);
    expect(inner.calls[1].texts).toEqual(['cccc']);
    expect(out.map(v => v[0])).toEqual([2, 4]);
  });

  test('queries and passages are cached separately', async () => {
    const inner = new CountingEmbedder();
    const cached = new CachedEmbedder(inner);
    await cached.embedPassages(['aa']);
    await cached.embedQueries(['aa']);
    expect(inner.calls).toHaveLength(2);
  });

  test('evicts the least recently used entry beyond capacity', async () => {
    const inner = new CountingEmbedder();
    const cached = new CachedEmbedder(inner, 2);
    await cached.embedPassages(['a']);
    await cached.embedPassages(['bb']);
    await cached.embedPassages(['a']);
    await cached.embedPassages(['ccc']);
    await cached.embedPassages(['bb']);
    expect(inner.calls.map(c => c.texts[0])).toEqual(['a', 'bb', 'ccc', 'bb']);
  });
});
