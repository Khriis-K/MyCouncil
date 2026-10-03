import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { loadDataset } from './run';
import type { Scenario, TimelineEvent } from './schema';
import { distanceBucket, goldAttributes, sliceAggregates, type SliceRow } from './slices';

const fixture = loadDataset(path.join(import.meta.dirname, 'data', 'fixture.json'), 'fixture');

function fixtureGold(probeId: string) {
  const scenario = fixture.scenarios.find(s => s.probes.some(p => p.id === probeId))!;
  return goldAttributes(scenario, scenario.probes.find(p => p.id === probeId)!);
}
const sameChannel = (probeId: string, sourceId: string) => fixtureGold(probeId).find(g => g.sourceId === sourceId)!.sameChannel;

describe('same-channel vs cross-channel on fixture probes', () => {
  test('chat gold from another counselor is cross-channel', () => {
    expect(sameChannel('job-p1', 'job-c1')).toBe(false); // probe: Advocate, gold: chat with Architect
  });

  test('chat gold from the same counselor is same-channel', () => {
    expect(sameChannel('job-p2', 'job-v5')).toBe(true);
    expect(sameChannel('bake-p3', 'bake-c1')).toBe(true);
  });

  test('refinement gold is cross-channel for a chat probe and same-channel for a refinement probe', () => {
    expect(sameChannel('job-p3', 'job-r2')).toBe(false);
    expect(sameChannel('grad-p3', 'grad-r2')).toBe(true);
  });

  test('debate gold from the same pair is same-channel', () => {
    expect(sameChannel('grad-p2', 'grad-d1')).toBe(true);
  });

  test('chat gold for a refinement probe is cross-channel', () => {
    expect(sameChannel('grad-p3', 'grad-c3')).toBe(false);
  });
});

describe('distance', () => {
  const event = (id: string, speaker: 'user' | 'counselor'): TimelineEvent => ({ id, channel: 'chat', speaker, counselorId: 'A', text: id, timestamp: 0, kind: 'filler' });
  const scenario = (gold: { sourceId: string; grade: number; distance?: number }[]): Scenario => ({
    id: 's', split: 'fixture', domain: 'd', dilemma: 'd', counselors: ['A'],
    timeline: [event('u1', 'user'), event('c1', 'counselor'), event('u2', 'user'), event('u3', 'user')],
    probes: [{ id: 'p', text: 'q', channel: 'chat', counselorId: 'A', category: 'explicit', gold }],
  });

  test('without a recorded distance, counts the user turns after the gold turn', () => {
    const s = scenario([{ sourceId: 'u1', grade: 2 }]);
    expect(goldAttributes(s, s.probes[0])[0].distance).toBe(2);
  });

  test('a recorded distance wins', () => {
    const s = scenario([{ sourceId: 'u1', grade: 2, distance: 17 }]);
    expect(goldAttributes(s, s.probes[0])[0].distance).toBe(17);
  });

  test('buckets by user turns', () => {
    expect([0, 10, 11, 20, 21, 30, 31, 99].map(distanceBucket)).toEqual(['0-10', '0-10', '11-20', '11-20', '21-30', '21-30', '31+', '31+']);
  });
});

describe('sliceAggregates', () => {
  const gold = (rank: number | null, sameChannel: boolean, distance: number, grade = 2) => ({ sourceId: `g${rank}`, grade, rank, inContext: rank !== null, sameChannel, distance });
  const rows: SliceRow[] = [
    // a cross-channel probe: one same-channel gold found at rank 1, one cross-channel gold missed
    { goldRanks: [gold(1, true, 3), gold(null, false, 25), gold(2, false, 40, 1)], metrics: { mrr: 1 } },
    { goldRanks: [gold(4, true, 12)], metrics: { mrr: 0.25 } },
  ];
  const slices = sliceAggregates(rows);

  test('recall and contextRecall are per required gold', () => {
    expect(slices.channel.same.gold.n).toBe(2);
    expect(slices.channel.same.gold.metrics['recall@1']).toBe(0.5);
    expect(slices.channel.same.gold.metrics['recall@5']).toBe(1);
    expect(slices.channel.same.gold.metrics.contextRecall).toBe(1);
    expect(slices.channel.cross.gold).toEqual({ n: 1, metrics: { 'recall@1': 0, 'recall@3': 0, 'recall@5': 0, 'recall@10': 0, contextRecall: 0 } });
  });

  test('a probe is cross-channel if any required gold is', () => {
    expect(slices.channel.cross.probe).toEqual({ n: 1, metrics: { mrr: 1 } });
    expect(slices.channel.same.probe).toEqual({ n: 1, metrics: { mrr: 0.25 } });
  });

  test('distance buckets are per required gold, and an empty bucket has n=0', () => {
    expect(slices.distance['0-10'].metrics['recall@1']).toBe(1);
    expect(slices.distance['11-20'].metrics['recall@3']).toBe(0);
    expect(slices.distance['11-20'].metrics['recall@5']).toBe(1);
    expect(slices.distance['21-30'].n).toBe(1);
    expect(slices.distance['31+']).toEqual({ n: 0, metrics: {} });
  });
});
