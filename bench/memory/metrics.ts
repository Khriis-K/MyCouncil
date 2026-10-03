export interface Gold {
  sourceId: string;
  grade: number;
}

export const METRIC_KS = [1, 3, 5, 10] as const;

const required = (gold: Gold[]) => gold.filter(g => g.grade === 2);

export function recallAtK(ranked: string[], gold: Gold[], k: number): number {
  const need = required(gold);
  if (need.length === 0) return 0;
  const top = new Set(ranked.slice(0, k));
  return need.filter(g => top.has(g.sourceId)).length / need.length;
}

export function allGoldAtK(ranked: string[], gold: Gold[], k: number): number {
  return recallAtK(ranked, gold, k) === 1 ? 1 : 0;
}

export function mrr(ranked: string[], gold: Gold[]): number {
  const need = new Set(required(gold).map(g => g.sourceId));
  const index = ranked.findIndex(id => need.has(id));
  return index === -1 ? 0 : 1 / (index + 1);
}

const gain = (grade: number) => 2 ** grade - 1;
const discount = (rank: number) => Math.log2(rank + 1);

export function ndcgAtK(ranked: string[], gold: Gold[], k: number): number {
  const gradeById = new Map(gold.map(g => [g.sourceId, g.grade]));
  const dcg = ranked.slice(0, k).reduce((sum, id, i) => sum + gain(gradeById.get(id) ?? 0) / discount(i + 1), 0);
  const ideal = gold
    .map(g => g.grade)
    .sort((a, b) => b - a)
    .slice(0, k)
    .reduce((sum, grade, i) => sum + gain(grade) / discount(i + 1), 0);
  return ideal === 0 ? 0 : dcg / ideal;
}

export function contextRecall(context: Set<string>, gold: Gold[]): number {
  const need = required(gold);
  return need.length === 0 ? 0 : need.filter(g => context.has(g.sourceId)).length / need.length;
}

// Approximate: ~4 chars per token. Label as approximate wherever it is shown.
export const contextTokens = (contextChars: number) => contextChars / 4;
