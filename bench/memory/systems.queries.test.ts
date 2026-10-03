import { describe, expect, test } from 'vitest';
import { buildChatQuery, buildDebateQuery, buildRefinementQuery } from '../../server/memory/queries';
import type { Probe, Scenario, TimelineEvent } from './schema';
import { probeQuery } from './systems';

const event = (id: string, e: Partial<TimelineEvent>): TimelineEvent =>
  ({ id, speaker: 'counselor', text: 'When does your lease end?', timestamp: 1, kind: 'counselor', ...e }) as TimelineEvent;

// Every thread ends on a counselor question, so a short probe would get expanded if its builder did that.
const scenario = {
  timeline: [
    event('c', { channel: 'chat', counselorId: 'Architect' }),
    event('d', { channel: 'debate', debatePairId: 'Architect-Advocate' }),
  ],
} as unknown as Scenario;

const probe = (p: Partial<Probe>): Probe => ({ id: 'p', text: 'In March', gold: [], category: 'explicit', ...p }) as Probe;

describe('probeQuery uses the product query builder for the probe channel', () => {
  test('chat', () => {
    const q = probeQuery({ scenario, probe: probe({ channel: 'chat', counselorId: 'Architect' }) });
    expect(q).toBe(buildChatQuery('In March', 'When does your lease end?'));
    expect(q).toBe('Counselor asked: "When does your lease end?"\nUser: "In March"');
  });

  test('refinement', () => {
    const q = probeQuery({ scenario, probe: probe({ channel: 'refinement' }) });
    expect(q).toBe(buildRefinementQuery('In March'));
    expect(q).toBe('In March');
  });

  test('debate', () => {
    const q = probeQuery({ scenario, probe: probe({ channel: 'debate', debatePairId: 'Architect-Advocate' }) });
    expect(q).toBe(buildDebateQuery('In March'));
    expect(q).toBe('In March');
  });
});
