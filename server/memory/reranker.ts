import { MODEL_CACHE_DIR, OFFLINE, RERANKER_MODELS, type CrossEncoderName } from './models';

export interface Reranker {
  readonly id: string;
  /** One relevance score per passage, same order; higher is more relevant. */
  score(query: string, passages: string[]): Promise<number[]>;
}

type Model = typeof RERANKER_MODELS[keyof typeof RERANKER_MODELS];
type Tokenizer = (queries: string[], opts: { text_pair: string[]; padding: boolean; truncation: boolean }) => unknown;
type Classifier = (inputs: unknown) => Promise<{ logits: { data: ArrayLike<number> } }>;

export class CrossEncoderReranker implements Reranker {
  readonly id: string;
  private loaded?: Promise<{ tokenizer: Tokenizer; model: Classifier }>;

  constructor(private spec: Model) {
    this.id = `${spec.id}@${spec.revision}:${spec.dtype}`;
  }

  // Dynamic import keeps onnxruntime out of any process (e.g. unit tests) that never reranks.
  private load() {
    this.loaded ??= (async () => {
      const { AutoTokenizer, AutoModelForSequenceClassification, env } = await import('@huggingface/transformers');
      env.cacheDir = MODEL_CACHE_DIR;
      if (OFFLINE) env.allowRemoteModels = false;
      const { id, revision, dtype } = this.spec;
      const [tokenizer, model] = await Promise.all([
        AutoTokenizer.from_pretrained(id, { revision }),
        AutoModelForSequenceClassification.from_pretrained(id, { dtype, revision }),
      ]);
      return { tokenizer: tokenizer as unknown as Tokenizer, model: model as unknown as Classifier };
    })();
    this.loaded.catch(() => { this.loaded = undefined; });
    return this.loaded;
  }

  async score(query: string, passages: string[]): Promise<number[]> {
    if (passages.length === 0) return [];
    const { tokenizer, model } = await this.load();
    // One batch for all candidates; logits are [n, 1].
    const inputs = tokenizer(new Array(passages.length).fill(query), { text_pair: passages, padding: true, truncation: true });
    const { logits } = await model(inputs);
    return Array.from(logits.data);
  }
}

export function createReranker(name: 'none' | CrossEncoderName): Reranker | null {
  return name === 'none' ? null : new CrossEncoderReranker(RERANKER_MODELS[name]);
}
