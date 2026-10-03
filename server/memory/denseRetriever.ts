import type { MemoryUnit } from './types';

export interface DenseHit {
  unitId: string;
  sourceId: string;
  score: number;
  rank: number;
}

// Vectors are L2-normalized, so the dot product is the cosine similarity.
export function denseSearch(queryVec: Float32Array, unitVecs: Float32Array[], units: MemoryUnit[], n: number): DenseHit[] {
  return units
    .map((unit, i) => {
      let score = 0;
      for (let d = 0; d < queryVec.length; d++) score += queryVec[d] * unitVecs[i][d];
      return { unit, score };
    })
    .sort((a, b) => b.score - a.score || b.unit.timestamp - a.unit.timestamp || a.unit.id.localeCompare(b.unit.id))
    .slice(0, n)
    .map(({ unit, score }, i) => ({ unitId: unit.id, sourceId: unit.sourceId, score, rank: i + 1 }));
}
