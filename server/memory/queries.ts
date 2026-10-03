import { isShortReply, withCounselorContext } from './chunker';

// One builder per generation path, so tuning one path's query can't silently change the others.
// The benchmark calls these same functions (bench/memory/systems.ts), chosen by the probe's channel.

export function buildChatQuery(message: string, lastCounselorTurn?: string): string {
  return lastCounselorTurn && isShortReply(message) ? withCounselorContext(message, lastCounselorTurn) : message;
}

// Tuning candidate: append the dilemma or a tension's core_issue. Not measured yet.
export function buildRefinementQuery(additionalContext: string): string {
  return additionalContext;
}

// Tuning candidate: append the debate's core_issue, or the counselor turn a short input answers. Not measured yet.
export function buildDebateQuery(userInput: string): string {
  return userInput;
}
