import { EMBEDDER_MODEL, MODEL_CACHE_DIR, OFFLINE } from './models';
import type { Embedder } from './embedder';

type Extractor = (texts: string[], opts: { pooling: 'cls'; normalize: boolean }) => Promise<{ data: Float32Array; dims: number[] }>;

export class TransformersEmbedder implements Embedder {
  readonly id = `${EMBEDDER_MODEL.id}@${EMBEDDER_MODEL.revision}:${EMBEDDER_MODEL.dtype}`;
  private extractor?: Promise<Extractor>;

  // Dynamic import keeps onnxruntime out of any process (e.g. unit tests) that never embeds.
  private load(): Promise<Extractor> {
    this.extractor ??= (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.cacheDir = MODEL_CACHE_DIR;
      if (OFFLINE) env.allowRemoteModels = false;
      return (await pipeline('feature-extraction', EMBEDDER_MODEL.id, {
        dtype: EMBEDDER_MODEL.dtype,
        revision: EMBEDDER_MODEL.revision,
      })) as unknown as Extractor;
    })();
    this.extractor.catch(() => { this.extractor = undefined; });
    return this.extractor;
  }

  embedQueries(texts: string[]) {
    return this.embed(texts.map(t => EMBEDDER_MODEL.queryPrefix + t));
  }

  embedPassages(texts: string[]) {
    return this.embed(texts);
  }

  private async embed(texts: string[]): Promise<Float32Array[]> {
    if (texts.length === 0) return [];
    const extractor = await this.load();
    const out = await extractor(texts, { pooling: EMBEDDER_MODEL.pooling, normalize: true });
    const dim = out.dims[1];
    return texts.map((_, i) => out.data.slice(i * dim, (i + 1) * dim));
  }
}
