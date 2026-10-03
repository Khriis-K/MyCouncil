import { describe, expect, test } from 'vitest';
import { buildChatPrompt } from './promptBuilder';

const counselor = { title: 'The Architect', role: 'Strategist', description: 'Plans carefully.', mbtiCode: 'INTJ' };
const history = [
  { sender: 'user' as const, text: 'Hello' },
  { sender: 'counselor' as const, text: 'Hi there' },
];

// Verbatim copy of the prompt as it was before memory was added.
const ORIGINAL = `
You are roleplaying as "Architect", a counselor with the personality type INTJ (Strategist).
Your Goal: Engage in a one-on-one deep dive session with the user about their dilemma.

YOUR PERSONA:
Plans carefully.

USER CONTEXT:
User MBTI: ENFP
Dilemma: "Should I move?"

CONVERSATION SO FAR:
User: "Hello"
Architect: "Hi there"
User: "What now?"

INSTRUCTIONS:
1. Respond directly to the user's latest message.
2. Stay strictly in character.
   - If you are a Thinker (T), focus on logic, strategy, and objective analysis.
   - If you are a Feeler (F), focus on values, emotions, and interpersonal dynamics.
   - If you are a Sensor (S), be practical, grounded, and detail-oriented.
   - If you are an Intuitive (N), be abstract, future-oriented, and look for patterns.
3. Be concise (max 2-3 sentences). This is a chat interface, not a letter.
4. You may include a short follow-up question if it helps deepen the reflection, but it is not required. Statements, insights, or empathetic acknowledgments are also excellent ways to conclude.
5. Do NOT use markdown or JSON. Just return the raw text response.
`;

describe('buildChatPrompt', () => {
  test('is byte-identical to the pre-memory prompt without a memories section', () => {
    expect(buildChatPrompt('Should I move?', history, 'What now?', counselor, 'ENFP')).toBe(ORIGINAL);
  });

  test('an empty memories section changes nothing', () => {
    expect(buildChatPrompt('Should I move?', history, 'What now?', counselor, 'ENFP', '')).toBe(ORIGINAL);
  });

  test('inserts the memories section right after USER CONTEXT', () => {
    const section = 'THINGS THE USER SHARED EARLIER\n- [x] "lease"';
    const prompt = buildChatPrompt('Should I move?', history, 'What now?', counselor, 'ENFP', section);
    expect(prompt).toContain(`Dilemma: "Should I move?"\n\n${section}\n\nCONVERSATION SO FAR:`);
  });
});
