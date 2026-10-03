import { describe, expect, test } from 'vitest';
import { chatSchema } from './schemas';

const base = { counselorId: 'Architect', dilemma: 'd', history: [], message: 'hi' };
const source = { id: 'chat:Architect:1', channel: 'chat', speaker: 'user', counselorId: 'Architect', text: 'my lease ends in March', timestamp: 1 };

describe('chatSchema memorySources', () => {
  test('is optional', () => {
    expect(chatSchema.safeParse(base).success).toBe(true);
  });

  test('accepts a valid source', () => {
    expect(chatSchema.safeParse({ ...base, memorySources: [source] }).success).toBe(true);
  });

  test('rejects an unknown channel or speaker', () => {
    expect(chatSchema.safeParse({ ...base, memorySources: [{ ...source, channel: 'email' }] }).success).toBe(false);
    expect(chatSchema.safeParse({ ...base, memorySources: [{ ...source, speaker: 'bot' }] }).success).toBe(false);
  });

  test('rejects text over 2000 chars', () => {
    expect(chatSchema.safeParse({ ...base, memorySources: [{ ...source, text: 'a'.repeat(2001) }] }).success).toBe(false);
    expect(chatSchema.safeParse({ ...base, memorySources: [{ ...source, text: 'a'.repeat(2000) }] }).success).toBe(true);
  });

  test('rejects more than 500 sources', () => {
    const many = Array.from({ length: 501 }, (_, i) => ({ ...source, id: `s${i}` }));
    expect(chatSchema.safeParse({ ...base, memorySources: many }).success).toBe(false);
    expect(chatSchema.safeParse({ ...base, memorySources: many.slice(0, 500) }).success).toBe(true);
  });

  test('rejects a source missing required fields', () => {
    const { timestamp: _t, ...noTimestamp } = source;
    expect(chatSchema.safeParse({ ...base, memorySources: [noTimestamp] }).success).toBe(false);
  });
});
