import { describe, expect, test } from 'vitest';
import { buildChatQuery, buildDebateQuery, buildRefinementQuery } from './queries';

describe('buildChatQuery', () => {
  test('a long message is the query as-is', () => {
    const msg = 'should I wait before deciding about the move at all';
    expect(buildChatQuery(msg, 'Some counselor line')).toBe(msg);
  });

  test('a short message is prefixed with the last counselor turn', () => {
    expect(buildChatQuery('In March', 'When does it end?')).toBe('Counselor asked: "When does it end?"\nUser: "In March"');
  });

  test('a short message without a counselor turn is as-is', () => {
    expect(buildChatQuery('In March')).toBe('In March');
  });
});

describe('buildRefinementQuery', () => {
  test('is the new context text', () => {
    expect(buildRefinementQuery('my sister would move in with us')).toBe('my sister would move in with us');
  });

  test('a short context is not expanded', () => {
    expect(buildRefinementQuery('In March')).toBe('In March');
  });
});

describe('buildDebateQuery', () => {
  test('is the user input', () => {
    expect(buildDebateQuery('what about the cost of the new place')).toBe('what about the cost of the new place');
  });

  test('a short input is not expanded', () => {
    expect(buildDebateQuery('I disagree')).toBe('I disagree');
  });
});
