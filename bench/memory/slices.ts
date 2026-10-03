import { METRIC_KS } from './metrics';
import type { Probe, Scenario, TimelineEvent } from './schema';

export const DISTANCE_BUCKETS = ['0-10', '11-20', '21-30', '31+'] as const;
export type DistanceBucket = (typeof DISTANCE_BUCKETS)[number];

export interface GoldAttributes {
  sourceId: string;
  /** the gold turn's channel and counselor (chat) or pair (debate) match the probe's */
  sameChannel: boolean;
  /** user turns after the gold turn, up to the end of the timeline */
  distance: number;
}

function isSameChannel(probe: Probe, event: TimelineEvent): boolean {
  if (event.channel !== probe.channel) return false;
  if (probe.channel === 'chat') return event.counselorId === probe.counselorId;
  if (probe.channel === 'debate') return event.debatePairId === probe.debatePairId;
  return true;
}

export function goldAttributes(scenario: Scenario, probe: Probe): GoldAttributes[] {
  return probe.gold.map(g => {
    const index = scenario.timeline.findIndex(e => e.id === g.sourceId);
    const event = scenario.timeline[index];
    // The v1 dataset records distance; the hand-written fixture does not, so derive it the same way.
    const distance = g.distance ?? scenario.timeline.slice(index + 1).filter(e => e.speaker === 'user').length;
    return { sourceId: g.sourceId, sameChannel: isSameChannel(probe, event), distance };
  });
}

export function distanceBucket(distance: number): DistanceBucket {
  if (distance <= 10) return '0-10';
  if (distance <= 20) return '11-20';
  if (distance <= 30) return '21-30';
  return '31+';
}

export interface Aggregate {
  n: number;
  metrics: Record<string, number>;
}

export interface SliceGold {
  grade: number;
  rank: number | null;
  inContext: boolean;
  sameChannel: boolean;
  distance: number;
}

export interface SliceRow {
  goldRanks: SliceGold[];
  metrics: Record<string, number>;
}

export interface Slices {
  /** gold: recall per required gold; probe: every metric, a probe being cross-channel if any required gold is */
  channel: Record<'same' | 'cross', { gold: Aggregate; probe: Aggregate }>;
  /** recall per required gold */
  distance: Record<DistanceBucket, Aggregate>;
}

/** Mean of every metric over the rows (the metrics of the first row define the keys). */
export function meanAggregate(rows: { metrics: Record<string, number> }[]): Aggregate {
  const keys = rows.length ? Object.keys(rows[0].metrics) : [];
  return {
    n: rows.length,
    metrics: Object.fromEntries(keys.map(key => [key, rows.reduce((sum, r) => sum + r.metrics[key], 0) / rows.length])),
  };
}

/** Recall@K and contextRecall with each required gold as one unit. */
function perGold(gold: SliceGold[]): Aggregate {
  return meanAggregate(gold.map(g => ({
    metrics: {
      ...Object.fromEntries(METRIC_KS.map(k => [`recall@${k}`, g.rank !== null && g.rank <= k ? 1 : 0])),
      contextRecall: g.inContext ? 1 : 0,
    },
  })));
}

/** Slices for one system's rows. Only required (grade 2) gold counts, as in the recall metrics. */
export function sliceAggregates(rows: SliceRow[]): Slices {
  const required = rows.flatMap(r => r.goldRanks.filter(g => g.grade === 2));
  const isCross = (r: SliceRow) => r.goldRanks.some(g => g.grade === 2 && !g.sameChannel);
  return {
    channel: {
      same: { gold: perGold(required.filter(g => g.sameChannel)), probe: meanAggregate(rows.filter(r => !isCross(r))) },
      cross: { gold: perGold(required.filter(g => !g.sameChannel)), probe: meanAggregate(rows.filter(isCross)) },
    },
    distance: Object.fromEntries(
      DISTANCE_BUCKETS.map(b => [b, perGold(required.filter(g => distanceBucket(g.distance) === b))]),
    ) as Record<DistanceBucket, Aggregate>,
  };
}
