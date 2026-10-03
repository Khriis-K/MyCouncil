import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { datasetSchema, type Probe, type Scenario, type TimelineEvent } from './schema';

export interface SupersededItem {
  scenario: Scenario;
  probe: Probe;
  fact: TimelineEvent;
  update: TimelineEvent;
}

/** Non-update probes whose required gold is a fact that a later update replaced. */
export function findSupersededGold(scenarios: Scenario[]): SupersededItem[] {
  const items: SupersededItem[] = [];
  for (const scenario of scenarios) {
    const byId = new Map(scenario.timeline.map(e => [e.id, e]));
    const updateOf = new Map(scenario.timeline.filter(e => e.kind === 'update').map(e => [e.supersedes!, e]));
    for (const probe of scenario.probes) {
      if (probe.category === 'update') continue;
      for (const g of probe.gold) {
        const update = updateOf.get(g.sourceId);
        if (g.grade === 2 && update) items.push({ scenario, probe, fact: byId.get(g.sourceId)!, update });
      }
    }
  }
  return items;
}

export function renderSupersededReview(items: SupersededItem[]): string {
  const lines = [
    '# Superseded-gold review',
    '',
    `${items.length} gold references where a non-update probe needs a fact that a later update changed. Tick **stale** if a good answer needs the updated information (the gold is out of date); tick **fine** if the part of the fact the probe uses did not change.`,
    '',
  ];
  items.forEach(({ scenario, probe, fact, update }, i) => {
    const otherGold = probe.gold.filter(g => g.sourceId !== fact.id).map(g => scenario.timeline.find(e => e.id === g.sourceId)!);
    lines.push(
      `## ${i + 1}. ${probe.id} (${probe.category})`,
      '',
      `**Probe:** ${probe.text}`,
      '',
      `**Gold fact ${fact.id}:** ${fact.text}`,
      '',
      `**Later update ${update.id}:** ${update.text}`,
      '',
      ...(otherGold.length ? [`**Other gold:** ${otherGold.map(e => `${e.id}: ${e.text}`).join(' / ')}`, ''] : []),
      '- [ ] stale',
      '- [ ] fine',
      '',
    );
  });
  return lines.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = path.join(import.meta.dirname, 'data');
  const dataset = datasetSchema.parse(JSON.parse(readFileSync(path.join(dir, 'scenarios.v1.json'), 'utf8')));
  const items = findSupersededGold(dataset.scenarios);
  writeFileSync(path.join(dir, 'SUPERSEDED_REVIEW.md'), renderSupersededReview(items));
  console.log(`wrote ${items.length} items to SUPERSEDED_REVIEW.md`);
}
