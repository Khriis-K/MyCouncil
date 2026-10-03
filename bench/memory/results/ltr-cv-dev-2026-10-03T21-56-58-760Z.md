# LTR: grouped cross-validation on dev

- generated: 2026-10-03T21:56:58.760Z
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
| ltr λ=0 | 0.746 | 0.850 | 0.732 | 0.745, 0.903, 0.559, 0.778 |
| ltr λ=0.01 (chosen) | 0.755 | 0.850 | 0.751 | 0.728, 0.903, 0.600, 0.789 |
| ltr λ=0.1 | 0.724 | 0.813 | 0.724 | 0.682, 0.842, 0.610, 0.760 |
| ltr λ=1 | 0.705 | 0.781 | 0.718 | 0.662, 0.784, 0.611, 0.762 |
| dense+rerank | 0.630 | 0.688 | 0.664 | 0.670, 0.729, 0.486, 0.634 |

## Chosen ltr (λ=0.01) − dense+rerank, per fold

| fold | ndcg@5 | recall@5 | mrr |
|---|---|---|---|
| 1 | +0.057 | +0.125 | +0.041 |
| 2 | +0.174 | +0.200 | +0.125 |
| 3 | +0.114 | +0.100 | +0.097 |
| 4 | +0.155 | +0.225 | +0.085 |

## Final model: trained on all of dev

- weights act on z-scored features, so their sizes are comparable; the sign is the direction of the effect

| feature | weight | train mean | train std |
|---|---|---|---|
| denseScore | +0.602 | 0.534 | 0.065 |
| denseRecipRank | +0.368 | 0.123 | 0.186 |
| bm25Norm | +0.383 | 0.170 | 0.278 |
| bm25RecipRank | +0.117 | 0.092 | 0.198 |
| ceScore | +0.234 | -8.627 | 2.160 |
| logUserTurnsSince | +0.691 | 2.929 | 0.852 |
| sameChannel | -0.025 | 0.487 | 0.500 |
| sameCounselorOrPair | +0.231 | 0.136 | 0.343 |
| isShortReply | -0.103 | 0.024 | 0.152 |
| logTextLength | +1.112 | 4.444 | 0.348 |

- bias: -1.941

## Provenance

- dataset: bench/memory/data/scenarios.v1.json (sha256 763fce85c912762f30d86d89b1c2de4a4e683cf47146417221dbc7b7f62df59d)
- git: db586b681c2e5f2f3aab728d411f19f9178182b0
- embedder: Xenova/bge-small-en-v1.5@ea104dacec62c0de699686887e3f920caeb4f3e3:q8; cross-encoder: Xenova/ms-marco-MiniLM-L-6-v2@a09144355adeed5f58c8ed011d209bf8ee5a1fec:q8
- gradient descent: learning rate 0.1, 2000 epochs, zero init, positive weight neg/pos
