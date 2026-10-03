import { selectCouncilors } from '../../data/counselorMatrix';
import type { ScenarioContent } from './content';
import { pick, rngFor, shuffle, type Rng } from './rng';
import type { Probe, Scenario, TimelineEvent } from './schema';

const FACT_WINDOW = 0.5;
const MIN_UPDATE_GAP = 5;
const REFINEMENT_SHARE = 0.15;
const DEBATE_SHARE = 0.2;
const SAME_CHANNEL_SHARE = 0.4;
const START = Date.UTC(2026, 0, 1);
const STEP_MS = 1000;

type Kind = 'fact' | 'update' | 'distractor' | 'filler';
interface UserTurn {
  id: string;
  kind: Kind;
  text: string;
  counselorQuestion: string;
  contentId?: string;
  supersedes?: string;
}
interface Thread {
  channel: TimelineEvent['channel'];
  counselorId?: string;
  debatePairId?: string;
}

export function councilTitles(): string[] {
  return selectCouncilors('BALANCED', 4).map(c => c.title.replace(/^The /, ''));
}

export function debatePairs(titles: string[]): string[] {
  return [`${titles[0]}|${titles[1]}`, `${titles[2]}|${titles[3]}`];
}

export const threadKey = (t: Thread) =>
  t.channel === 'chat' ? `chat:${t.counselorId}` : t.channel === 'debate' ? `debate:${t.debatePairId}` : 'refinement';

// Facts land in the first half, updates at least MIN_UPDATE_GAP turns after the fact they supersede.
function placeTurns(turns: UserTurn[], rng: Rng): UserTurn[] {
  const total = turns.length;
  const slots: (UserTurn | undefined)[] = new Array(total).fill(undefined);
  const free = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => from + i).filter(i => !slots[i]);

  for (const fact of turns.filter(t => t.kind === 'fact')) {
    slots[pick(free(0, Math.floor(total * FACT_WINDOW)), rng)] = fact;
  }
  for (const update of turns.filter(t => t.kind === 'update')) {
    const factSlot = slots.findIndex(s => s?.kind === 'fact' && s.contentId === update.supersedes);
    slots[pick(free(factSlot + MIN_UPDATE_GAP, total), rng)] = update;
  }
  const rest = shuffle(
    turns.filter(t => t.kind === 'distractor' || t.kind === 'filler'),
    rng,
  );
  return slots.map(s => s ?? rest.pop()!);
}

// Turn text is capped at 280 chars by the content schema, so every turn fits the 300-char refinement limit.
function drawThread(titles: string[], pairs: string[], rng: Rng): Thread {
  const r = rng();
  if (r < REFINEMENT_SHARE) return { channel: 'refinement' };
  if (r < REFINEMENT_SHARE + DEBATE_SHARE) return { channel: 'debate', debatePairId: pick(pairs, rng) };
  return { channel: 'chat', counselorId: pick(titles, rng) };
}

function crossThread(avoid: Set<string>, titles: string[], pairs: string[], rng: Rng): Thread {
  const options: Thread[] = [
    { channel: 'refinement' as const },
    ...titles.map(counselorId => ({ channel: 'chat' as const, counselorId })),
    ...pairs.map(debatePairId => ({ channel: 'debate' as const, debatePairId })),
  ].filter(t => !avoid.has(threadKey(t)));
  return pick(options, rng);
}

export function assemble(content: ScenarioContent, meta: { id: string; domain: string; split: 'dev' | 'test' }): Scenario {
  const rng = rngFor(`assemble:${meta.id}`);
  const titles = councilTitles();
  const pairs = debatePairs(titles);
  const sid = (id: string) => `${meta.id}-${id}`;

  const turns: UserTurn[] = [
    ...content.facts.map(f => ({ id: sid(f.id), kind: 'fact' as const, contentId: f.id, text: f.text, counselorQuestion: f.counselorQuestion })),
    ...content.updates.map(u => ({ id: sid(u.id), kind: 'update' as const, contentId: u.id, supersedes: u.supersedes, text: u.text, counselorQuestion: u.counselorQuestion })),
    ...content.distractors.map(d => ({ id: sid(d.id), kind: 'distractor' as const, text: d.text, counselorQuestion: d.counselorQuestion })),
    ...content.filler.map((f, i) => ({ id: sid(`filler-${i + 1}`), kind: 'filler' as const, text: f.text, counselorQuestion: f.counselorQuestion })),
  ];
  const ordered = placeTurns(shuffle(turns, rng), rng);

  const timeline: TimelineEvent[] = [];
  const threadOfSource = new Map<string, Thread>();
  const userIndexOfSource = new Map<string, number>();
  let clock = START;
  ordered.forEach((turn, userIndex) => {
    const thread = drawThread(titles, pairs, rng);
    const { channel, counselorId, debatePairId } = thread;
    if (channel !== 'refinement') {
      timeline.push({
        id: sid(`q-${userIndex + 1}`), channel, counselorId, debatePairId, speaker: 'counselor', kind: 'counselor',
        text: turn.counselorQuestion, timestamp: (clock += STEP_MS),
      });
    }
    timeline.push({
      id: turn.id, channel, counselorId, debatePairId, speaker: 'user', kind: turn.kind,
      text: turn.text, timestamp: (clock += STEP_MS), factId: turn.contentId, supersedes: turn.supersedes && sid(turn.supersedes),
    });
    threadOfSource.set(turn.id, thread);
    userIndexOfSource.set(turn.id, userIndex);
  });

  const gold = (id: string, grade: number) => {
    const sourceId = sid(id);
    return { sourceId, grade, distance: ordered.length - 1 - userIndexOfSource.get(sourceId)! };
  };

  const probes: Probe[] = content.probes.map(p => {
    const required = p.goldFactIds.map(id => gold(id, 2));
    const superseded =
      p.category === 'update' ? p.goldFactIds.map(id => gold(content.updates.find(u => u.id === id)!.supersedes, 1)) : [];
    const goldTurns = [...required, ...superseded];
    const thread =
      rng() < SAME_CHANNEL_SHARE
        ? pick(required.map(g => threadOfSource.get(g.sourceId)!), rng)
        : crossThread(new Set(goldTurns.map(g => threadKey(threadOfSource.get(g.sourceId)!))), titles, pairs, rng);
    return {
      id: sid(p.id), text: p.text, channel: thread.channel, counselorId: thread.counselorId, debatePairId: thread.debatePairId,
      gold: goldTurns, category: p.category,
    };
  });

  return { id: meta.id, split: meta.split, domain: meta.domain, dilemma: content.dilemma, counselors: titles, timeline, probes };
}
