# LTR: grouped cross-validation on dev

- generated: 2026-10-03T22:09:59.296Z
- 4 folds grouped by scenario (seed `ltr-cv-v1`): [education-5, romantic-relationship-2, friendship-and-social-life-1, relocation-6] [family-and-caregiving-2, relocation-2, friendship-and-social-life-3, career-2] [romantic-relationship-3, family-and-caregiving-6, health-and-wellbeing-2, finances-5] [finances-6, health-and-wellbeing-4, education-3, career-3]
- 16 scenarios, 80 probes; training rows: 117 positive, 2476 negative (positive = gold with grade >= 1)
- candidates: the dense top 30 ∪ the BM25 top 30; dense+rerank ranks the dense top 30 with Xenova/ms-marco-MiniLM-L-6-v2@a09144355adeed5f58c8ed011d209bf8ee5a1fec:q8
- each cell is the mean over folds of the per-fold mean over probes
- lambda picked by mean CV nDCG@5. The chosen lambda's CV score is slightly optimistic: it was selected on these same folds
- 4 scenarios per validation fold: the per-fold numbers are noisy, read the spread before the mean
- every fold, and the test split, comes from the same generator: a feature that fingerprints how it plants gold (e.g. gold turns being longer or older than filler) scores well here and nowhere else. Check large context weights against the data before trusting them

## CV by lambda

| system | ndcg@5 | recall@5 | mrr | nDCG@5 per fold |
|---|---|---|---|---|
| ltr λ=0 | 0.672 | 0.781 | 0.667 | 0.646, 0.746, 0.570, 0.725 |
| ltr λ=0.01 | 0.676 | 0.781 | 0.673 | 0.646, 0.746, 0.589, 0.725 |
| ltr λ=0.1 (chosen) | 0.690 | 0.781 | 0.696 | 0.652, 0.763, 0.609, 0.736 |
| ltr λ=1 | 0.683 | 0.781 | 0.684 | 0.652, 0.752, 0.586, 0.740 |
| dense+rerank | 0.630 | 0.688 | 0.664 | 0.670, 0.729, 0.486, 0.634 |

## Chosen ltr (λ=0.1) − dense+rerank, per fold

| fold | ndcg@5 | recall@5 | mrr |
|---|---|---|---|
| 1 | -0.019 | +0.000 | -0.017 |
| 2 | +0.034 | +0.075 | -0.012 |
| 3 | +0.123 | +0.175 | +0.088 |
| 4 | +0.101 | +0.125 | +0.069 |

## Final model: trained on all of dev

- weights act on z-scored features, so their sizes are comparable; the sign is the direction of the effect

| feature | weight | train mean | train std |
|---|---|---|---|
| denseScore | +0.382 | 0.534 | 0.065 |
| denseRecipRank | +0.437 | 0.123 | 0.186 |
| bm25Norm | +0.304 | 0.170 | 0.278 |
| bm25RecipRank | +0.144 | 0.092 | 0.198 |
| ceScore | +0.214 | -8.627 | 2.160 |
| sameChannel | +0.024 | 0.487 | 0.500 |
| sameCounselorOrPair | +0.180 | 0.136 | 0.343 |
| isShortReply | -0.111 | 0.024 | 0.152 |

- bias: -1.039

## Provenance

- dataset: bench/memory/data/scenarios.v1.json (sha256 763fce85c912762f30d86d89b1c2de4a4e683cf47146417221dbc7b7f62df59d)
- git: 8aa2f743b8fcb3cf7232b4e2ba9fb9875f6ce3e1
- embedder: Xenova/bge-small-en-v1.5@ea104dacec62c0de699686887e3f920caeb4f3e3:q8; cross-encoder: Xenova/ms-marco-MiniLM-L-6-v2@a09144355adeed5f58c8ed011d209bf8ee5a1fec:q8
- gradient descent: learning rate 0.1, 2000 epochs, zero init, positive weight neg/pos
