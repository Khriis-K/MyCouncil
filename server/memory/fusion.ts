export interface RankedItem {
  unitId: string;
  sourceId: string;
  score: number;
  /** 1-based */
  rank: number;
}

export interface FusedItem extends RankedItem {
  /** per input list, in the order given: the item's original rank and score, undefined if absent */
  inputs: ({ rank: number; score: number } | undefined)[];
}

/** Reciprocal Rank Fusion: score = Σ 1 / (kRrf + rank) over the lists containing the item. Ties keep first-appearance order. */
export function rrf(lists: RankedItem[][], kRrf = 60): FusedItem[] {
  const fused = new Map<string, FusedItem>();
  lists.forEach((list, li) => {
    for (const { unitId, sourceId, score, rank } of list) {
      let item = fused.get(unitId);
      if (!item) {
        item = { unitId, sourceId, score: 0, rank: 0, inputs: lists.map(() => undefined) };
        fused.set(unitId, item);
      }
      item.score += 1 / (kRrf + rank);
      item.inputs[li] = { rank, score };
    }
  });
  // Array.prototype.sort is stable, so equal scores stay in insertion order.
  return [...fused.values()].sort((a, b) => b.score - a.score).map((item, i) => ({ ...item, rank: i + 1 }));
}
