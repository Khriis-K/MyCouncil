import { describe, expect, test } from 'vitest';
import { LlmSelector, buildSelectorMessages, parseSelection } from './llmSelector';

describe('buildSelectorMessages', () => {
  test('numbers every memory from 1 and includes the current message', () => {
    const [system, user] = buildSelectorMessages('Should I take the job in Denver?', ['My daughter has asthma.', 'I love hiking.'], 5);
    expect(system.role).toBe('system');
    expect(system.content).toContain('at most 5');
    expect(user.content).toContain('Should I take the job in Denver?');
    expect(user.content).toContain('[1] My daughter has asthma.');
    expect(user.content).toContain('[2] I love hiking.');
  });
});

describe('parseSelection', () => {
  test('reads selected memory numbers in order, as zero-based indices', () => {
    expect(parseSelection('{"selected": [3, 1]}', 4)).toEqual([2, 0]);
  });

  test('tolerates prose around the JSON', () => {
    expect(parseSelection('Here you go:\n{"selected":[2]}\nDone.', 2)).toEqual([1]);
  });

  test('drops out-of-range, duplicate and non-integer numbers', () => {
    expect(parseSelection('{"selected": [0, 2, 2, 9, 1.5, "1", 1]}', 3)).toEqual([1, 0]);
  });

  test('survives a malformed close around the array, as nova-lite sometimes writes', () => {
    expect(parseSelection('{"selected": [1, 9, 13]]', 13)).toEqual([0, 8, 12]);
  });

  test('an empty selection is valid', () => {
    expect(parseSelection('{"selected": []}', 3)).toEqual([]);
  });

  test('throws when there is no selected array, so the pipeline falls back to stage-1 order', () => {
    expect(() => parseSelection('I cannot help with that.', 3)).toThrow();
    expect(() => parseSelection('{"memories": [1]}', 3)).toThrow(/selected/);
  });
});

describe('LlmSelector', () => {
  test('scores every selected memory above the rest and ignores the pick order, which the model does not keep', async () => {
    const selector = new LlmSelector(async () => '{"selected": [3, 1]}', 'test-model', 5);
    expect(await selector.score('q', ['a', 'b', 'c', 'd'])).toEqual([1, 0, 1, 0]);
  });

  test('does not call the model when there is nothing to choose from', async () => {
    let calls = 0;
    const selector = new LlmSelector(async () => { calls++; return '{"selected": []}'; }, 'test-model', 5);
    expect(await selector.score('q', [])).toEqual([]);
    expect(calls).toBe(0);
  });

  test('propagates model errors', async () => {
    const selector = new LlmSelector(async () => { throw new Error('OpenRouter 503'); }, 'test-model', 5);
    await expect(selector.score('q', ['a'])).rejects.toThrow(/503/);
  });

  test('id names the model', () => {
    expect(new LlmSelector(async () => '', 'amazon/nova-lite-v1', 5).id).toContain('amazon/nova-lite-v1');
  });
});
