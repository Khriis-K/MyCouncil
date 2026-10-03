import type { ChatMessage, DebateInterjection, MemorySource } from '../types';

const MAX_SOURCES = 500;
const MAX_TEXT_CHARS = 2000;

export function buildMemorySources(params: {
  chatHistory: Record<string, ChatMessage[]>;
  refinements: { text: string; timestamp: number }[];
  debateLog?: DebateInterjection[];
}): MemorySource[] {
  const chat: MemorySource[] = Object.entries(params.chatHistory).flatMap(([counselorId, messages]) =>
    messages.map(m => ({
      id: `chat:${counselorId}:${m.id}`,
      channel: 'chat' as const,
      speaker: m.sender,
      counselorId,
      text: m.text.slice(0, MAX_TEXT_CHARS),
      timestamp: m.timestamp,
    }))
  );
  const refinements: MemorySource[] = params.refinements.map((r, i) => ({
    id: `refinement:${i}`,
    channel: 'refinement' as const,
    speaker: 'user' as const,
    text: r.text.slice(0, MAX_TEXT_CHARS),
    timestamp: r.timestamp,
  }));
  // The counselor turn goes in just before the user's, so the chunker can give a short reply its context.
  const debate: MemorySource[] = (params.debateLog ?? []).flatMap((d, i) => {
    const base = { channel: 'debate' as const, debatePairId: d.pairId };
    const user: MemorySource = { ...base, id: `debate:${i}`, speaker: 'user', text: d.userText.slice(0, MAX_TEXT_CHARS), timestamp: d.timestamp };
    if (!d.precedingCounselorText) return [user];
    const counselor: MemorySource = {
      ...base, id: `debate:${i}:counselor`, speaker: 'counselor', text: d.precedingCounselorText.slice(0, MAX_TEXT_CHARS), timestamp: d.timestamp - 1,
    };
    return [counselor, user];
  });

  return [...chat, ...refinements, ...debate].sort((a, b) => a.timestamp - b.timestamp).slice(-MAX_SOURCES);
}
