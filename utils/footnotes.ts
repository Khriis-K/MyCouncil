import type { RecalledMemory } from '../types';

export interface Footnote {
  number: number;
  source: string; // Where the memory came from, e.g. "Recalled from a debate in the chamber"
  text: string;
}

// The API names the counselor of a chat memory but not the pair of a debate one, so a debate stays unnamed.
function source(memory: RecalledMemory): string {
  switch (memory.channel) {
    case 'chat':
      return memory.counselorId
        ? `Recalled from your correspondence with the ${memory.counselorId}`
        : 'Recalled from an earlier correspondence';
    case 'debate':
      return 'Recalled from a debate in the chamber';
    case 'refinement':
      return 'Recalled from context you added';
  }
}

// The memories a reply recalled, as the numbered footnotes printed beneath it.
export function recallFootnotes(recalled: RecalledMemory[] | undefined): Footnote[] {
  return (recalled ?? []).map((memory, i) => ({ number: i + 1, source: source(memory), text: memory.text }));
}
