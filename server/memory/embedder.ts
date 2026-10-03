import { createHash } from 'node:crypto';

export interface Embedder {
  readonly id: string;
  embedQueries(texts: string[]): Promise<Float32Array[]>;
  embedPassages(texts: string[]): Promise<Float32Array[]>;
}

export class CachedEmbedder implements Embedder {
  private cache = new Map<string, Float32Array>();
  private hits = 0;
  private misses = 0;

  constructor(private inner: Embedder, private capacity = 5000) {}

  get id() { return this.inner.id; }

  stats() { return { hits: this.hits, misses: this.misses }; }

  embedQueries(texts: string[]) { return this.embed('q', texts, t => this.inner.embedQueries(t)); }

  embedPassages(texts: string[]) { return this.embed('p', texts, t => this.inner.embedPassages(t)); }

  private async embed(kind: 'q' | 'p', texts: string[], run: (texts: string[]) => Promise<Float32Array[]>) {
    const keys = texts.map(t => `${this.inner.id}:${kind}:${createHash('sha1').update(t).digest('hex')}`);
    const result: (Float32Array | undefined)[] = keys.map(k => this.touch(k));
    const missing = result.flatMap((v, i) => (v ? [] : [i]));

    this.hits += texts.length - missing.length;
    this.misses += missing.length;

    if (missing.length) {
      const fresh = await run(missing.map(i => texts[i]));
      missing.forEach((i, j) => {
        result[i] = fresh[j];
        this.store(keys[i], fresh[j]);
      });
    }
    return result as Float32Array[];
  }

  // Delete + re-set moves the key to the end of the Map's insertion order (most recent).
  private touch(key: string) {
    const v = this.cache.get(key);
    if (v) {
      this.cache.delete(key);
      this.cache.set(key, v);
    }
    return v;
  }

  private store(key: string, vec: Float32Array) {
    this.cache.set(key, vec);
    if (this.cache.size > this.capacity) this.cache.delete(this.cache.keys().next().value!);
  }
}
