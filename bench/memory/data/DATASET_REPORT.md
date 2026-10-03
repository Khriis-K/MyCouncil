# Dataset report (bias audit)

Report only: nothing here filters the dataset. Overlap is content-word Jaccard between a probe and its best-matching required gold turn (a high value means a keyword matcher has an easy time).

- scenarios: 48
- dropped: none

## Probe vs gold overlap by category

| category | probes | mean Jaccard | median Jaccard | zero-overlap share |
|---|---|---|---|---|
| explicit | 48 | 0.211 | 0.208 | 2.1% |
| implicit | 96 | 0.035 | 0.033 | 47.9% |
| multi | 48 | 0.108 | 0.090 | 4.2% |
| update | 48 | 0.128 | 0.115 | 2.1% |

## Channel

- same-channel probes: 39.6%; cross-channel: 60.4% (a probe is same-channel when it sits in the thread of one of its required gold turns)

## Gold distance (user turns between the gold turn and the end of the timeline)

- required gold turns: 288; min 0, median 31, mean 30.3, max 49
- 0-9: 22
- 10-19: 19
- 20-29: 85
- 30+: 162
