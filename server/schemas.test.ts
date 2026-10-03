import { describe, expect, test } from 'vitest';
import { chatSchema, debateInjectionSchema, summonSchema } from './schemas';

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

const debateSource = { id: 'debate:0:user', channel: 'debate', speaker: 'user', debatePairId: 'Architect-Advocate', text: 'my sister would move in', timestamp: 2 };

describe('summonSchema memorySources', () => {
  const summon = { dilemma: 'Should I move to a new city?', additionalContext: 'my sister lives there' };

  test('is optional', () => {
    expect(summonSchema.safeParse(summon).success).toBe(true);
  });

  test('accepts valid sources from any channel', () => {
    expect(summonSchema.safeParse({ ...summon, memorySources: [source, debateSource] }).success).toBe(true);
  });

  test('rejects malformed sources and more than 500', () => {
    expect(summonSchema.safeParse({ ...summon, memorySources: [{ ...source, channel: 'email' }] }).success).toBe(false);
    const many = Array.from({ length: 501 }, (_, i) => ({ ...source, id: `s${i}` }));
    expect(summonSchema.safeParse({ ...summon, memorySources: many }).success).toBe(false);
  });
});

describe('debateInjectionSchema memorySources', () => {
  const counselor = { id: 'Architect', name: 'The Architect', role: 'r', description: 'd' };
  const debate = {
    dilemma: 'd',
    tension: { core_issue: 'x', counselor_ids: ['Architect', 'Advocate'] },
    history: [],
    user_input: 'hi',
    counselors: [counselor, { ...counselor, id: 'Advocate' }],
  };

  test('is optional', () => {
    expect(debateInjectionSchema.safeParse(debate).success).toBe(true);
  });

  test('accepts valid sources', () => {
    expect(debateInjectionSchema.safeParse({ ...debate, memorySources: [source, debateSource] }).success).toBe(true);
  });

  test('rejects malformed sources and more than 500', () => {
    expect(debateInjectionSchema.safeParse({ ...debate, memorySources: [{ ...debateSource, speaker: 'bot' }] }).success).toBe(false);
    expect(debateInjectionSchema.safeParse({ ...debate, memorySources: [{ ...debateSource, text: 'a'.repeat(2001) }] }).success).toBe(false);
    const many = Array.from({ length: 501 }, (_, i) => ({ ...source, id: `s${i}` }));
    expect(debateInjectionSchema.safeParse({ ...debate, memorySources: many }).success).toBe(false);
  });
});
