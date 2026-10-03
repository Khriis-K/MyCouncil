# Dataset report (bias audit)

Report only: nothing here filters the dataset. Overlap is content-word Jaccard between a probe and its best-matching required gold turn (a high value means a keyword matcher has an easy time).

- scenarios: 48
- dropped: none

## Probe vs gold overlap by category

| category | probes | mean Jaccard | median Jaccard | zero-overlap share |
|---|---|---|---|---|
| explicit | 48 | 0.203 | 0.207 | 2.1% |
| implicit | 96 | 0.035 | 0.032 | 47.9% |
| multi | 48 | 0.106 | 0.085 | 2.1% |
| update | 48 | 0.128 | 0.115 | 2.1% |

## Channel

- same-channel probes: 38.3%; cross-channel: 61.7% (a probe is same-channel when it sits in the thread of one of its required gold turns)

## Gold distance (user turns between the gold turn and the end of the timeline)

- required gold turns: 288; min 0, median 30, mean 28.8, max 49
- 0-9: 30
- 10-19: 25
- 20-29: 85
- 30+: 148

## Human review

Seeded sample from REVIEW.md, checked by a person: is the gold sufficient, is the probe realistic, and does no other turn also answer it.

- 6 of 20 failed (30.0%; 95% Wilson interval 14.5%-51.9%)
- gold not sufficient: 3 (finances-1-p1, family-and-caregiving-1-p2, finances-4-p4)
- another turn also answers: 3 (family-and-caregiving-6-p3, career-2-p3, friendship-and-social-life-1-p4)
- fixed by hand (data/hand-edits.json): finances-1-p1, family-and-caregiving-1-p2, finances-4-p4, family-and-caregiving-6-p3, career-2-p3, friendship-and-social-life-1-p4
- superseded gold: 19 gold references pointed at a fact a later update superseded and were marked stale by a person in SUPERSEDED_REVIEW.md (which lists every such reference on non-update probes); they were regraded so the update is required gold and the old fact grade 1

The other 220 probes were not reviewed, and nothing automated checks these two failure kinds: the validator checks structure and word overlap, not whether the gold turn semantically suffices or a distractor also answers. Expect a similar share of the unreviewed probes to have the same defects. An LLM judge (bench/memory/judge.ts) was tried as an automatic check and did not agree with these labels well enough to gate regeneration.
