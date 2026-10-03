import { isShortReply, withCounselorContext } from './chunker';

export function buildChatQuery(message: string, lastCounselorTurn?: string): string {
  return lastCounselorTurn && isShortReply(message) ? withCounselorContext(message, lastCounselorTurn) : message;
}
