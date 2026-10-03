import type { MemorySource, MemoryUnit } from './types';

const SHORT_REPLY_WORDS = 8;
const CONTEXT_MAX_CHARS = 200;
const SPLIT_ABOVE_CHARS = 600;
const CHUNK_MAX_CHARS = 400;

export function isShortReply(text: string): boolean {
  return text.trim().split(/\s+/).length < SHORT_REPLY_WORDS;
}

export function withCounselorContext(text: string, counselorText: string): string {
  return `Counselor asked: "${counselorText.slice(0, CONTEXT_MAX_CHARS)}"\nUser: "${text}"`;
}

const sameThread = (a: MemorySource, b: MemorySource) =>
  a.channel === b.channel && a.counselorId === b.counselorId && a.debatePairId === b.debatePairId;

function splitSentences(text: string): string[] {
  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
  return Array.from(segmenter.segment(text), s => s.segment.trim()).filter(Boolean);
}

function splitOversized(sentence: string): string[] {
  const parts: string[] = [];
  let current = '';
  for (const word of sentence.split(/\s+/)) {
    if (current && current.length + 1 + word.length > CHUNK_MAX_CHARS) {
      parts.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) parts.push(current);
  return parts;
}

function packSentences(text: string): string[] {
  const chunks: string[] = [];
  let current = '';
  for (const sentence of splitSentences(text).flatMap(s => (s.length > CHUNK_MAX_CHARS ? splitOversized(s) : [s]))) {
    if (current && current.length + 1 + sentence.length > CHUNK_MAX_CHARS) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function buildMemoryUnits(sources: MemorySource[]): MemoryUnit[] {
  const sorted = [...sources].sort((a, b) => a.timestamp - b.timestamp);
  const units: MemoryUnit[] = [];

  sorted.forEach((source, index) => {
    if (source.speaker !== 'user') return;

    const base = {
      sourceId: source.id,
      channel: source.channel,
      counselorId: source.counselorId,
      debatePairId: source.debatePairId,
      timestamp: source.timestamp,
    };

    if (source.text.length > SPLIT_ABOVE_CHARS) {
      packSentences(source.text).forEach((chunk, n) => {
        units.push({ ...base, id: `${source.id}#${n}`, text: chunk, embedText: chunk });
      });
      return;
    }

    let embedText = source.text;
    if (isShortReply(source.text)) {
      const previous = sorted.slice(0, index).reverse().find(s => sameThread(s, source));
      if (previous?.speaker === 'counselor') embedText = withCounselorContext(source.text, previous.text);
    }
    units.push({ ...base, id: source.id, text: source.text, embedText });
  });

  return units;
}
