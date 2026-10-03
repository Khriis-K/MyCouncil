import type { ScenarioContent } from './content';

const pad = (text: string, n: number) => (text + ' ' + 'filler words keep this long enough '.repeat(40)).slice(0, n);

/** Valid synthetic content (no LLM). `variant` changes every id's text but not the structure. */
export function syntheticContent(variant = 0): ScenarioContent {
  const n = (count: number, make: (i: number) => object) => Array.from({ length: count }, (_, i) => make(i + 1));
  const turn = (label: string, i: number) => ({
    text: `${label} ${variant}-${i} zebra${label}${i}`,
    counselorQuestion: `Question about ${label} ${i}?`,
  });
  return {
    dilemma: pad('I am torn about a big decision.', 400),
    facts: n(8, i => ({ id: `f${i}`, ...turn('fact', i) })) as ScenarioContent['facts'],
    updates: [
      { id: 'u1', supersedes: 'f1', ...turn('update', 1) },
      { id: 'u2', supersedes: 'f2', ...turn('update', 2) },
    ],
    distractors: n(8, i => ({ id: `d${i}`, ...turn('distractor', i) })) as ScenarioContent['distractors'],
    filler: n(24, i => turn('filler', i)) as ScenarioContent['filler'],
    probes: [
      { id: 'p1', text: 'What was fact 3?', goldFactIds: ['f3'], category: 'explicit' },
      { id: 'p2', text: 'Should I worry given what I said?', goldFactIds: ['f4'], category: 'implicit' },
      { id: 'p3', text: 'Does my situation allow this?', goldFactIds: ['f5'], category: 'implicit' },
      { id: 'p4', text: 'How do both things fit together?', goldFactIds: ['f6', 'f7'], category: 'multi' },
      { id: 'p5', text: 'What is the current state of things?', goldFactIds: ['u1'], category: 'update' },
    ],
  };
}
