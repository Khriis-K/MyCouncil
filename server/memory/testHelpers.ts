import { createHash } from 'node:crypto';
import type { Embedder } from './embedder';

const DIMS = 256;

function hashWord(word: string): number {
  return createHash('sha1').update(word).digest().readUInt32BE(0) % DIMS;
}

function embedOne(text: string): Float32Array {
  const vec = new Float32Array(DIMS);
  for (const word of text.toLowerCase().match(/[a-z0-9']+/g) ?? []) vec[hashWord(word)] += 1;
  const norm = Math.hypot(...vec);
  if (norm > 0) for (let i = 0; i < DIMS; i++) vec[i] /= norm;
  return vec;
}

export class HashingEmbedder implements Embedder {
  readonly id = 'hashing-256';
  async embedQueries(texts: string[]) { return texts.map(embedOne); }
  async embedPassages(texts: string[]) { return texts.map(embedOne); }
}
