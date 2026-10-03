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
