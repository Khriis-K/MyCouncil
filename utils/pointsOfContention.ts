import { TensionPair } from '../types';

// Which counselor's score is marked in a row of the points of contention. A tie marks neither.
export function higherScore(c1Score: number, c2Score: number): 'c1' | 'c2' | null {
  if (c1Score === c2Score) return null;
  return c1Score > c2Score ? 'c1' : 'c2';
}

// The transcript's heading: "The Commander v. the Advocate", or "&" for a pair that synthesises, as in the chamber's list.
export function debateTitle(name1: string, name2: string, type: TensionPair['type']) {
  return {
    first: name1,
    joiner: type === 'synthesis' ? '&' : 'v.',
    second: name2.replace(/^The /, 'the '),
  };
}

export const DEFAULT_WEIGHT = 50;

type ScoredRow = { id: string; c1_score: number; c2_score: number };

// Each counselor's alignment with the user's priorities: their scores averaged by the weight on each row, out of ten.
// Weights only matter relative to each other, so a lone row is scored as it stands, whatever weight it was left at.
// No rows, or every weight at zero, gives no verdict rather than a "balanced" 0% v. 0%.
export function weightedAlignment(rows: ScoredRow[], weights: Record<string, number>) {
  let c1Total = 0;
  let c2Total = 0;
  let maxPossible = 0;
  for (const row of rows) {
    const weight = rows.length > 1 ? weights[row.id] ?? DEFAULT_WEIGHT : DEFAULT_WEIGHT;
    c1Total += row.c1_score * weight;
    c2Total += row.c2_score * weight;
    maxPossible += 10 * weight;
  }
  if (maxPossible === 0) return null;
  return {
    c1Percent: Math.round((c1Total / maxPossible) * 100),
    c2Percent: Math.round((c2Total / maxPossible) * 100),
  };
}
