import { rngFor, shuffle } from './rng';

export const DOMAINS = [
  'career',
  'relocation',
  'romantic relationship',
  'family and caregiving',
  'finances',
  'education',
  'health and wellbeing',
  'friendship and social life',
] as const;

export const SCENARIOS_PER_DOMAIN = 6;
export const DEV_PER_DOMAIN = 2;

/** Scenario-level split, stratified by domain: DEV_PER_DOMAIN go to dev, the rest to test. */
export function assignSplits(scenarios: { id: string; domain: string }[], seed: string): Map<string, 'dev' | 'test'> {
  const result = new Map<string, 'dev' | 'test'>();
  const domains = [...new Set(scenarios.map(s => s.domain))].sort();
  for (const domain of domains) {
    const ids = scenarios.filter(s => s.domain === domain).map(s => s.id).sort();
    shuffle(ids, rngFor(`${seed}:split:${domain}`)).forEach((id, i) => result.set(id, i < DEV_PER_DOMAIN ? 'dev' : 'test'));
  }
  return result;
}
