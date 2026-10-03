import type { DenseHit } from './denseRetriever';
import { STOPWORDS } from './stopwords';
import type { MemoryUnit } from './types';

export type Bm25Hit = DenseHit;

const K1 = 1.2;
const B = 0.75;

/** Lowercased tokens in order, stopwords dropped, a trailing plural "s" stripped from tokens longer than 3 chars. */
export function tokenize(text: string): string[] {
  // Apostrophes go first so "don't" becomes "dont", which the stopword list knows.
  const tokens = text.toLowerCase().replace(/['’]/g, '').split(/[^a-z0-9]+/);
  return tokens
    .filter(t => t && !STOPWORDS.has(t))
    .map(t => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t));
}

// Okapi BM25 over unit.embedText, index built per call. Units with no query term score 0 and are
// left out: ranking them would only replay the recency tie-break under BM25's name.
export function bm25Search(query: string, units: MemoryUnit[], n: number): Bm25Hit[] {
  const docs = units.map(unit => {
    const tf = new Map<string, number>();
    const tokens = tokenize(unit.embedText);
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { unit, tf, length: tokens.length };
  });
  if (docs.length === 0) return [];
  const avgLength = docs.reduce((sum, d) => sum + d.length, 0) / docs.length;

  // Distinct query terms: repeating a word in the query shouldn't double its weight.
  const terms = [...new Set(tokenize(query))];
  const idf = new Map(terms.map(term => {
    const df = docs.filter(d => d.tf.has(term)).length;
    return [term, Math.log(1 + (docs.length - df + 0.5) / (df + 0.5))];
  }));

  return docs
    .map(({ unit, tf, length }) => {
      const norm = K1 * (1 - B + (B * length) / (avgLength || 1));
      let score = 0;
      for (const term of terms) {
        const f = tf.get(term) ?? 0;
        if (f) score += (idf.get(term)! * f * (K1 + 1)) / (f + norm);
      }
      return { unit, score };
    })
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score || b.unit.timestamp - a.unit.timestamp || a.unit.id.localeCompare(b.unit.id))
    .slice(0, n)
    .map(({ unit, score }, i) => ({ unitId: unit.id, sourceId: unit.sourceId, score, rank: i + 1 }));
}
