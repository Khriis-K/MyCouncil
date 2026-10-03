import { describe, expect, test } from 'vitest';
import { assemble } from './assemble';
import { syntheticContent } from './testContent';
import { auditBias, renderReport, wilsonInterval } from './validate';

describe('wilsonInterval', () => {
  test('matches the textbook 95% interval for 6 of 20', () => {
    const [lo, hi] = wilsonInterval(6, 20);
    expect(lo).toBeCloseTo(0.1455, 3);
    expect(hi).toBeCloseTo(0.519, 3);
  });

  test('stays inside [0, 1] at the extremes', () => {
    expect(wilsonInterval(0, 20)[0]).toBe(0);
    expect(wilsonInterval(20, 20)[1]).toBeCloseTo(1, 10);
  });
});

describe('renderReport human review section', () => {
  const audit = auditBias([assemble(syntheticContent(), { id: 'career-1', domain: 'career', split: 'dev' })]);
  const labels = { a: 'gold', b: 'unique', c: null, d: null } as const;

  test('reports failures by check, the rate with its interval, the hand fixes and the unreviewed caveat', () => {
    const md = renderReport(audit, { scenarios: 1, dropped: [], humanReview: { labels, fixedProbeIds: ['a', 'b'] } });
    expect(md).toContain('## Human review');
    expect(md).toMatch(/gold not sufficient: 1 \(a\)/);
    expect(md).toMatch(/another turn also answers: 1 \(b\)/);
    expect(md).toMatch(/2 of 4 failed \(50\.0%; 95% Wilson interval/);
    expect(md).toMatch(/fixed by hand.*a, b/);
    expect(md).toMatch(/not reviewed/);
  });

  test('reports the superseded-gold regrades when there are any', () => {
    const md = renderReport(audit, { scenarios: 1, dropped: [], humanReview: { labels, fixedProbeIds: [], regradedGold: 19 } });
    expect(md).toMatch(/19 gold references.*superseded.*SUPERSEDED_REVIEW\.md/);
    expect(renderReport(audit, { scenarios: 1, dropped: [], humanReview: { labels, fixedProbeIds: [] } })).not.toMatch(/SUPERSEDED_REVIEW/);
  });

  test('reports how many regraded probes also had their text rewritten', () => {
    const md = renderReport(audit, { scenarios: 1, dropped: [], humanReview: { labels, fixedProbeIds: [], regradedGold: 19, rewrittenStale: 5 } });
    expect(md).toMatch(/5 of those probes.*rewritten/);
  });

  test('warns that regraded probes put update recall into the other category slices', () => {
    const md = renderReport(audit, { scenarios: 1, dropped: [], humanReview: { labels, fixedProbeIds: [], regradedGold: 19 } });
    expect(md).toMatch(/explicit, implicit and multi slices also measure update recall/);
  });

  test('omits the section when there is no human review', () => {
    expect(renderReport(audit, { scenarios: 1, dropped: [] })).not.toContain('Human review');
  });
});
