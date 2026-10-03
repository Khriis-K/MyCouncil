import { describe, expect, test } from 'vitest';
import { buildChatQuery } from './queries';

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
