import path from 'node:path';

// Keep the cache dir short: a revision SHA lands in the cache path and deep dirs exceed Windows MAX_PATH.
export const MODEL_CACHE_DIR = path.resolve('.cache/models');

export const EMBEDDER_MODEL = {
  id: 'Xenova/bge-small-en-v1.5',
  revision: 'ea104dacec62c0de699686887e3f920caeb4f3e3',
  dtype: 'q8' as const,
  pooling: 'cls' as const,
  // bge instruction prefix: queries only, never passages.
  queryPrefix: 'Represent this sentence for searching relevant passages: ',
};

export const OFFLINE = process.env.MEMORY_OFFLINE === '1';

// Optional cross-encoders for stage 2 (not the default, see config.ts); bge-reranker-base (283 MB) is for the ablation.
export const RERANKER_MODELS = {
  minilm: { id: 'Xenova/ms-marco-MiniLM-L-6-v2', revision: 'a09144355adeed5f58c8ed011d209bf8ee5a1fec', dtype: 'q8' as const },
  'bge-base': { id: 'Xenova/bge-reranker-base', revision: '280bcc27a84e0b898c251e06fddb25171bd9b101', dtype: 'q8' as const },
};

export type CrossEncoderName = keyof typeof RERANKER_MODELS;
// 'llm-select': the chat model picks from the dense candidates, behind the dense top 2 (see productionSelector.ts).
// 'ltr': learned score fusion over the dense + BM25 union, MiniLM and context (see ltr.ts).
export type RerankerName = 'none' | 'llm-select' | 'ltr' | CrossEncoderName;
