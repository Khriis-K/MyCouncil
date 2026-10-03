# Dataset report (bias audit)

Report only: nothing here filters the dataset. Overlap is content-word Jaccard between a probe and its best-matching required gold turn (a high value means a keyword matcher has an easy time).

- scenarios: 46
- dropped: family-and-caregiving-4 (probe p4 (multi) gold u1 is not a fact id; probe p4 (multi) gold u2 is not a fact id); finances-1 (probe p4 (multi) gold u1 is not a fact id)

## Probe vs gold overlap by category

| category | probes | mean Jaccard | median Jaccard | zero-overlap share |
|---|---|---|---|---|
| explicit | 46 | 0.215 | 0.209 | 2.2% |
| implicit | 92 | 0.036 | 0.033 | 47.8% |
| multi | 46 | 0.107 | 0.085 | 4.3% |
| update | 46 | 0.131 | 0.120 | 2.2% |

## Channel

- same-channel probes: 38.7%; cross-channel: 61.3% (a probe is same-channel when it sits in the thread of one of its required gold turns)

## Gold distance (user turns between the gold turn and the end of the timeline)

- required gold turns: 276; min 0, median 32, mean 30.6, max 48
- 0-9: 20
- 10-19: 17
- 20-29: 79
- 30+: 160
