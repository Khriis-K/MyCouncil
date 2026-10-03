import type { ChatMessage, MemorySource } from '../types';

const MAX_SOURCES = 500;
const MAX_TEXT_CHARS = 2000;

export function buildMemorySources(params: {
  chatHistory: Record<string, ChatMessage[]>;
  refinements: { text: string; timestamp: number }[];
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

  return [...chat, ...refinements].sort((a, b) => a.timestamp - b.timestamp).slice(-MAX_SOURCES);
}
