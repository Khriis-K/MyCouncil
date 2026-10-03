import type { DebateInterjection, TensionPair } from '../types';

// What the user sends into a debate: their own words, or a criterion that becomes an instruction.
export type DebateRequest = { kind: 'interjection'; text: string } | { kind: 'criterion'; label: string };

export const debatePairId = (pair: TensionPair) => `${pair.counselor1}-${pair.counselor2}`;

export function debateInjectionText(request: DebateRequest): string {
  return request.kind === 'interjection'
    ? request.text
    : `Please add the criterion "${request.label}" to the decision matrix and score it for both counselors (1-10) with reasoning.`;
}

// Only the user's own words become memories; a criterion instruction is synthetic text.
export function interjectionFrom(
  request: DebateRequest,
  pair: TensionPair,
  dialogueBefore: { speaker: string; text: string }[],
  timestamp: number
): DebateInterjection | null {
  if (request.kind !== 'interjection') return null;
  const precedingCounselorText = [...dialogueBefore].reverse().find(turn => turn.speaker !== 'user')?.text;
  return {
    pairId: debatePairId(pair),
    userText: request.text,
    ...(precedingCounselorText !== undefined && { precedingCounselorText }),
    timestamp,
  };
}
