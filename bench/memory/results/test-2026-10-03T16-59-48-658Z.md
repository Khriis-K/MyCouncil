# Memory benchmark: test

- generated: 2026-10-03T16:59:48.658Z
- dataset version: v1
- embedder: Xenova/bge-small-en-v1.5@ea104dacec62c0de699686887e3f920caeb4f3e3:q8
- memory-production reranker: none
- dense+llm-select selector: llm-select:amazon/nova-lite-v1 (temperature 0, live API calls: rerank latency includes the network); dense-top2+llm-select keeps the dense top 2 and lets the selector fill the rest
- settings: k=5, window=6, candidatePool=30
- probes per system: 160
- token counts are approximate (context chars / 4)
- existing-context is an upper bound on today's prompts: debate resets when the overlay closes, and refinement really carries only a <=50-char label, not the full previous text
- the embedding cache is shared across probes, so timings reflect a warm cache
- poolRecall@30: required gold in the stage-1 candidate pool or the prompt; the ceiling any reordering of the pool could reach

## Ranking quality (mean over probes)

| system | recall@1 | recall@3 | recall@5 | recall@10 | MRR | nDCG@1 | nDCG@3 | nDCG@5 | nDCG@10 |
|---|---|---|---|---|---|---|---|---|---|
| existing-context | 0.025 | 0.087 | 0.191 | 0.316 | 0.097 | 0.025 | 0.053 | 0.097 | 0.139 |
| recency | 0.009 | 0.016 | 0.031 | 0.116 | 0.062 | 0.013 | 0.012 | 0.018 | 0.040 |
| dense | 0.447 | 0.606 | 0.713 | 0.800 | 0.602 | 0.500 | 0.554 | 0.603 | 0.635 |
| dense+rerank | 0.481 | 0.584 | 0.628 | 0.697 | 0.611 | 0.550 | 0.560 | 0.581 | 0.606 |
| dense+rerank-bge | 0.244 | 0.425 | 0.472 | 0.591 | 0.400 | 0.275 | 0.344 | 0.369 | 0.417 |
| dense+llm-select | 0.491 | 0.703 | 0.825 | 0.922 | 0.682 | 0.560 | 0.635 | 0.687 | 0.727 |
| dense-top2+llm-select | 0.447 | 0.719 | 0.859 | 0.919 | 0.636 | 0.500 | 0.614 | 0.675 | 0.698 |
| memory-production | 0.025 | 0.116 | 0.550 | 0.778 | 0.219 | 0.025 | 0.069 | 0.260 | 0.349 |

## All required gold found, and what lands in the prompt

| system | allGold@1 | allGold@3 | allGold@5 | allGold@10 | contextRecall | context tokens (approx) |
|---|---|---|---|---|---|---|
| existing-context | 0.025 | 0.081 | 0.175 | 0.294 | 0.316 | 217.350 |
| recency | 0.006 | 0.013 | 0.025 | 0.100 | 0.031 | 101.789 |
| dense | 0.406 | 0.563 | 0.669 | 0.769 | 0.713 | 131.164 |
| dense+rerank | 0.425 | 0.531 | 0.581 | 0.662 | 0.628 | 119.838 |
| dense+rerank-bge | 0.219 | 0.388 | 0.431 | 0.550 | 0.472 | 110.208 |
| dense+llm-select | 0.431 | 0.650 | 0.781 | 0.894 | 0.825 | 147.617 |
| dense-top2+llm-select | 0.406 | 0.675 | 0.825 | 0.887 | 0.859 | 143.675 |
| memory-production | 0.025 | 0.106 | 0.506 | 0.744 | 0.753 | 236.770 |

## Category: explicit (n=32)

| system | recall@5 | nDCG@5 | allGold@5 | contextRecall | poolRecall@30 |
|---|---|---|---|---|---|
| existing-context | 0.188 | 0.087 | 0.188 | 0.375 | - |
| recency | 0.000 | 0.000 | 0.000 | 0.000 | - |
| dense | 0.969 | 0.939 | 0.969 | 0.969 | 1.000 |
| dense+rerank | 1.000 | 0.963 | 1.000 | 1.000 | 1.000 |
| dense+rerank-bge | 0.938 | 0.800 | 0.938 | 0.938 | 1.000 |
| dense+llm-select | 0.906 | 0.879 | 0.906 | 0.906 | 1.000 |
| dense-top2+llm-select | 1.000 | 0.957 | 1.000 | 1.000 | 1.000 |
| memory-production | 0.844 | 0.377 | 0.844 | 0.969 | 1.000 |

## Category: implicit (n=64)

| system | recall@5 | nDCG@5 | allGold@5 | contextRecall | poolRecall@30 |
|---|---|---|---|---|---|
| existing-context | 0.156 | 0.067 | 0.156 | 0.328 | - |
| recency | 0.000 | 0.000 | 0.000 | 0.000 | - |
| dense | 0.516 | 0.352 | 0.516 | 0.516 | 0.969 |
| dense+rerank | 0.313 | 0.265 | 0.313 | 0.313 | 0.969 |
| dense+rerank-bge | 0.141 | 0.078 | 0.141 | 0.141 | 0.969 |
| dense+llm-select | 0.859 | 0.613 | 0.859 | 0.859 | 0.969 |
| dense-top2+llm-select | 0.797 | 0.491 | 0.797 | 0.797 | 0.969 |
| memory-production | 0.313 | 0.136 | 0.313 | 0.594 | 1.000 |

## Category: multi (n=32)

| system | recall@5 | nDCG@5 | allGold@5 | contextRecall | poolRecall@30 |
|---|---|---|---|---|---|
| existing-context | 0.078 | 0.041 | 0.000 | 0.172 | - |
| recency | 0.031 | 0.024 | 0.000 | 0.031 | - |
| dense | 0.625 | 0.537 | 0.406 | 0.625 | 0.922 |
| dense+rerank | 0.641 | 0.584 | 0.406 | 0.641 | 0.922 |
| dense+rerank-bge | 0.391 | 0.335 | 0.188 | 0.391 | 0.922 |
| dense+llm-select | 0.750 | 0.673 | 0.531 | 0.750 | 0.922 |
| dense-top2+llm-select | 0.766 | 0.618 | 0.594 | 0.766 | 0.922 |
| memory-production | 0.406 | 0.213 | 0.188 | 0.641 | 0.922 |

## Category: update (n=32)

| system | recall@5 | nDCG@5 | allGold@5 | contextRecall | poolRecall@30 |
|---|---|---|---|---|---|
| existing-context | 0.375 | 0.221 | 0.375 | 0.375 | - |
| recency | 0.125 | 0.064 | 0.125 | 0.125 | - |
| dense | 0.938 | 0.833 | 0.938 | 0.938 | 1.000 |
| dense+rerank | 0.875 | 0.829 | 0.875 | 0.875 | 1.000 |
| dense+rerank-bge | 0.750 | 0.554 | 0.750 | 0.750 | 1.000 |
| dense+llm-select | 0.750 | 0.659 | 0.750 | 0.750 | 1.000 |
| dense-top2+llm-select | 0.938 | 0.820 | 0.938 | 0.938 | 1.000 |
| memory-production | 0.875 | 0.439 | 0.875 | 0.969 | 1.000 |

## Per-probe changes vs dense (contextRecall)

| system | better | worse | probes better | probes worse |
|---|---|---|---|---|
| existing-context | 14 | 83 | career-1-p2, career-4-p2, career-6-p2, relocation-3-p2, relocation-3-p5, relocation-4-p3, romantic-relationship-6-p1, romantic-relationship-6-p2, family-and-caregiving-3-p3, family-and-caregiving-4-p2, finances-1-p2, finances-1-p3, education-6-p3, friendship-and-social-life-5-p2 | career-1-p1, career-1-p3, career-1-p4, career-4-p1, career-4-p4, career-5-p1, career-5-p2, career-5-p3, career-5-p4, career-6-p3, career-6-p4, career-6-p5, relocation-1-p1, relocation-1-p4, relocation-1-p5, relocation-3-p1, relocation-3-p4, relocation-4-p1, relocation-4-p4, relocation-4-p5, relocation-5-p2, relocation-5-p3, relocation-5-p4, relocation-5-p5, romantic-relationship-1-p1, romantic-relationship-1-p3, romantic-relationship-1-p5, romantic-relationship-4-p1, romantic-relationship-4-p2, romantic-relationship-5-p5, romantic-relationship-6-p4, romantic-relationship-6-p5, family-and-caregiving-1-p1, family-and-caregiving-1-p3, family-and-caregiving-1-p4, family-and-caregiving-3-p2, family-and-caregiving-3-p4, family-and-caregiving-3-p5, family-and-caregiving-4-p1, family-and-caregiving-4-p4, family-and-caregiving-4-p5, family-and-caregiving-5-p2, family-and-caregiving-5-p5, finances-1-p1, finances-1-p4, finances-2-p1, finances-2-p3, finances-2-p4, finances-2-p5, finances-3-p4, finances-3-p5, finances-4-p1, finances-4-p3, finances-4-p4, education-1-p1, education-1-p3, education-1-p4, education-1-p5, education-2-p2, education-2-p3, education-2-p5, education-4-p5, education-6-p1, education-6-p4, education-6-p5, health-and-wellbeing-1-p2, health-and-wellbeing-1-p3, health-and-wellbeing-1-p4, health-and-wellbeing-1-p5, health-and-wellbeing-3-p1, health-and-wellbeing-3-p4, health-and-wellbeing-5-p1, health-and-wellbeing-5-p2, health-and-wellbeing-5-p5, health-and-wellbeing-6-p1, health-and-wellbeing-6-p5, friendship-and-social-life-2-p1, friendship-and-social-life-2-p2, friendship-and-social-life-5-p1, friendship-and-social-life-5-p4, friendship-and-social-life-5-p5, friendship-and-social-life-6-p2, friendship-and-social-life-6-p4 |
| recency | 1 | 116 | romantic-relationship-5-p4 | career-1-p1, career-1-p3, career-1-p4, career-4-p1, career-4-p4, career-4-p5, career-5-p1, career-5-p2, career-5-p3, career-6-p1, career-6-p3, career-6-p4, career-6-p5, relocation-1-p1, relocation-1-p3, relocation-1-p4, relocation-1-p5, relocation-3-p1, relocation-3-p4, relocation-4-p1, relocation-4-p4, relocation-4-p5, relocation-5-p1, relocation-5-p2, relocation-5-p3, relocation-5-p4, relocation-5-p5, romantic-relationship-1-p1, romantic-relationship-1-p3, romantic-relationship-1-p4, romantic-relationship-1-p5, romantic-relationship-4-p1, romantic-relationship-4-p2, romantic-relationship-4-p3, romantic-relationship-4-p5, romantic-relationship-5-p1, romantic-relationship-5-p5, romantic-relationship-6-p3, romantic-relationship-6-p4, romantic-relationship-6-p5, family-and-caregiving-1-p1, family-and-caregiving-1-p2, family-and-caregiving-1-p3, family-and-caregiving-1-p4, family-and-caregiving-1-p5, family-and-caregiving-3-p1, family-and-caregiving-3-p2, family-and-caregiving-3-p4, family-and-caregiving-4-p1, family-and-caregiving-4-p3, family-and-caregiving-4-p4, family-and-caregiving-4-p5, family-and-caregiving-5-p1, family-and-caregiving-5-p2, family-and-caregiving-5-p4, family-and-caregiving-5-p5, finances-1-p1, finances-1-p4, finances-1-p5, finances-2-p1, finances-2-p3, finances-2-p4, finances-2-p5, finances-3-p1, finances-3-p4, finances-3-p5, finances-4-p1, finances-4-p3, finances-4-p4, finances-4-p5, education-1-p1, education-1-p2, education-1-p3, education-1-p4, education-1-p5, education-2-p1, education-2-p2, education-2-p3, education-2-p4, education-2-p5, education-4-p1, education-4-p2, education-4-p3, education-4-p5, education-6-p1, education-6-p2, education-6-p4, education-6-p5, health-and-wellbeing-1-p1, health-and-wellbeing-1-p2, health-and-wellbeing-1-p3, health-and-wellbeing-1-p4, health-and-wellbeing-1-p5, health-and-wellbeing-3-p1, health-and-wellbeing-3-p3, health-and-wellbeing-3-p4, health-and-wellbeing-3-p5, health-and-wellbeing-5-p1, health-and-wellbeing-5-p2, health-and-wellbeing-5-p3, health-and-wellbeing-5-p4, health-and-wellbeing-5-p5, health-and-wellbeing-6-p1, health-and-wellbeing-6-p5, friendship-and-social-life-2-p1, friendship-and-social-life-2-p2, friendship-and-social-life-2-p4, friendship-and-social-life-2-p5, friendship-and-social-life-4-p1, friendship-and-social-life-4-p4, friendship-and-social-life-4-p5, friendship-and-social-life-5-p1, friendship-and-social-life-5-p4, friendship-and-social-life-6-p1, friendship-and-social-life-6-p2, friendship-and-social-life-6-p4 |
| dense+rerank | 15 | 30 | career-1-p4, career-5-p5, relocation-4-p2, relocation-4-p3, romantic-relationship-4-p4, romantic-relationship-5-p4, romantic-relationship-6-p1, family-and-caregiving-5-p3, family-and-caregiving-5-p4, finances-2-p2, health-and-wellbeing-3-p2, health-and-wellbeing-6-p4, friendship-and-social-life-4-p4, friendship-and-social-life-5-p3, friendship-and-social-life-5-p4 | career-5-p2, career-6-p4, relocation-1-p5, relocation-3-p4, relocation-5-p3, relocation-5-p4, relocation-5-p5, romantic-relationship-6-p3, romantic-relationship-6-p4, family-and-caregiving-1-p2, family-and-caregiving-1-p3, family-and-caregiving-3-p2, family-and-caregiving-4-p3, family-and-caregiving-4-p4, family-and-caregiving-5-p2, finances-2-p3, finances-3-p4, finances-4-p4, education-1-p2, education-1-p3, education-2-p2, education-2-p3, education-4-p2, education-4-p3, education-4-p5, education-6-p2, health-and-wellbeing-3-p4, health-and-wellbeing-6-p5, friendship-and-social-life-2-p2, friendship-and-social-life-6-p2 |
| dense+rerank-bge | 2 | 44 | education-6-p3, health-and-wellbeing-6-p3 | career-1-p5, career-4-p4, career-5-p2, career-5-p3, career-6-p4, relocation-1-p1, relocation-1-p3, relocation-1-p5, relocation-3-p4, relocation-5-p2, relocation-5-p3, relocation-5-p4, relocation-5-p5, romantic-relationship-1-p4, romantic-relationship-4-p2, romantic-relationship-4-p3, romantic-relationship-6-p3, romantic-relationship-6-p5, family-and-caregiving-1-p2, family-and-caregiving-1-p3, family-and-caregiving-1-p4, family-and-caregiving-3-p2, family-and-caregiving-4-p3, family-and-caregiving-4-p4, family-and-caregiving-5-p2, finances-2-p3, finances-2-p4, education-1-p2, education-1-p3, education-1-p4, education-2-p2, education-2-p3, education-4-p2, education-4-p3, education-4-p5, education-6-p2, health-and-wellbeing-1-p3, health-and-wellbeing-3-p3, health-and-wellbeing-3-p4, health-and-wellbeing-5-p2, health-and-wellbeing-6-p5, friendship-and-social-life-2-p2, friendship-and-social-life-6-p2, friendship-and-social-life-6-p5 |
| dense+llm-select | 36 | 14 | career-1-p2, career-4-p2, career-4-p3, career-4-p4, career-6-p2, relocation-1-p2, relocation-3-p3, relocation-3-p5, relocation-4-p2, relocation-4-p3, romantic-relationship-1-p2, romantic-relationship-4-p4, romantic-relationship-5-p3, romantic-relationship-5-p4, romantic-relationship-6-p1, family-and-caregiving-3-p3, family-and-caregiving-5-p3, family-and-caregiving-5-p4, finances-1-p2, finances-1-p3, finances-3-p2, finances-3-p3, finances-4-p2, education-4-p4, education-6-p3, education-6-p4, health-and-wellbeing-3-p2, health-and-wellbeing-6-p2, health-and-wellbeing-6-p4, friendship-and-social-life-2-p3, friendship-and-social-life-2-p4, friendship-and-social-life-4-p2, friendship-and-social-life-4-p3, friendship-and-social-life-4-p4, friendship-and-social-life-5-p3, friendship-and-social-life-5-p4 | career-1-p1, career-1-p3, relocation-1-p4, relocation-4-p4, romantic-relationship-1-p4, romantic-relationship-1-p5, romantic-relationship-5-p1, finances-3-p4, finances-3-p5, education-2-p4, education-2-p5, education-4-p1, health-and-wellbeing-5-p5, health-and-wellbeing-6-p5 |
| dense-top2+llm-select | 31 | 4 | career-1-p2, career-4-p2, career-4-p3, career-4-p4, career-6-p2, relocation-3-p3, relocation-3-p5, relocation-4-p2, relocation-4-p3, romantic-relationship-1-p2, romantic-relationship-4-p4, romantic-relationship-5-p4, romantic-relationship-6-p1, family-and-caregiving-3-p3, family-and-caregiving-5-p3, family-and-caregiving-5-p4, finances-1-p2, finances-1-p3, finances-3-p2, finances-3-p3, education-4-p4, education-6-p4, health-and-wellbeing-3-p2, health-and-wellbeing-6-p2, health-and-wellbeing-6-p4, friendship-and-social-life-2-p3, friendship-and-social-life-4-p2, friendship-and-social-life-4-p3, friendship-and-social-life-4-p4, friendship-and-social-life-5-p3, friendship-and-social-life-5-p4 | career-1-p3, career-1-p4, romantic-relationship-6-p5, education-1-p4 |
| memory-production | 7 | 0 | relocation-3-p5, relocation-4-p2, romantic-relationship-5-p2, family-and-caregiving-5-p4, education-6-p3, friendship-and-social-life-2-p3, friendship-and-social-life-5-p2 | - |

## Latency per stage, ms (p50 / p95)

- machine: AMD Ryzen AI 7 350 w/ Radeon 860M
- warm-up excluded: each system runs one untimed probe first, so model loading is not counted
- the embedding cache is shared, so embedding cost lands on whichever system embeds a text first; compare systems on the rerank column, not total

| system | embedPassages | embedQuery | stage1 | rerank | total |
|---|---|---|---|---|---|
| dense | 0.2 / 231 | 11 / 15 | 0.1 / 0.3 | 0.0 / 0.0 | 13 / 240 |
| dense+rerank | 0.3 / 0.4 | 0.0 / 0.0 | 0.1 / 0.2 | 200 / 260 | 200 / 260 |
| dense+rerank-bge | 0.3 / 0.4 | 0.0 / 0.0 | 0.1 / 0.1 | 619 / 728 | 620 / 729 |
| dense+llm-select | 0.3 / 0.4 | 0.0 / 0.0 | 0.1 / 0.1 | 641 / 976 | 642 / 977 |
| dense-top2+llm-select | 0.3 / 0.5 | 0.0 / 0.0 | 0.1 / 0.2 | 630 / 990 | 631 / 990 |
| memory-production | 0.3 / 0.4 | 0.0 / 0.0 | 0.1 / 0.2 | 0.0 / 0.0 | 0.6 / 0.9 |
