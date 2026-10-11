import { describe, expect, test } from 'vitest';
import { recallFootnotes } from './footnotes';

describe('recallFootnotes', () => {
  test('a reply that recalled nothing has no footnotes', () => {
    expect(recallFootnotes(undefined)).toEqual([]);
    expect(recallFootnotes([])).toEqual([]);
  });

  test('one memory becomes footnote 1, quoting its text', () => {
    expect(recallFootnotes([{ channel: 'refinement', text: 'I have a dog' }])).toEqual([
      { number: 1, source: 'Recalled from context you added', text: 'I have a dog' },
    ]);
  });

  test('several memories are numbered in the order they were recalled', () => {
    const notes = recallFootnotes([
      { channel: 'debate', text: 'first' },
      { channel: 'refinement', text: 'second' },
      { channel: 'chat', counselorId: 'Advocate', text: 'third' },
    ]);
    expect(notes.map(n => [n.number, n.text])).toEqual([[1, 'first'], [2, 'second'], [3, 'third']]);
  });

  test('a chat memory names the counselor it was written to', () => {
    const [note] = recallFootnotes([{ channel: 'chat', counselorId: 'Commander', text: 'my lease ends in March' }]);
    expect(note.source).toBe('Recalled from your correspondence with the Commander');
  });

  test('a chat memory without a counselor still says it came from correspondence', () => {
    const [note] = recallFootnotes([{ channel: 'chat', text: 'x' }]);
    expect(note.source).toBe('Recalled from an earlier correspondence');
  });

  test('a debate memory says it came from a debate', () => {
    const [note] = recallFootnotes([{ channel: 'debate', text: 'What if I started remote?' }]);
    expect(note.source).toBe('Recalled from a debate in the chamber');
  });

  test('a refinement memory says it came from context the user added', () => {
    const [note] = recallFootnotes([{ channel: 'refinement', text: 'x' }]);
    expect(note.source).toBe('Recalled from context you added');
  });
});
