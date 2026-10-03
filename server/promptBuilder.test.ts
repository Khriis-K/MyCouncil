import { describe, expect, test } from 'vitest';
import { buildChatPrompt, buildDebateInjectionPrompt, buildSummonUserPrompt } from './promptBuilder';

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

// Verbatim copies of the debate prompt as it was before memory was added.
const ORIGINAL_DEBATE = `
You are simulating a philosophical debate between two distinct personas ("The Council") regarding a user's dilemma.
The user has just interjected into the debate with a comment or question.

TONE GUIDELINES:
1. **Coffee Shop Rule**: These are opinionated friends, not therapists. Be casual, direct, and empathetic.
2. **Anti-Jargon**: NO clinical/corporate words (e.g., "interventions", "mitigate", "variables", "symptoms"). Use plain English.
3. **No Forced Metaphors**: Do not force title-specific metaphors (e.g. Architect -> blueprints). Focus on priorities, not themes.
4. **Conversational**: Use contractions ("it's", "they're") and natural speech patterns.

CONTEXT:
Dilemma: "Should I move?"
Core Conflict: "Risk vs roots"

THE DEBATERS:
1. Architect: Plans carefully.
2. Advocate: Feels deeply.

TRANSCRIPT SO FAR:
Architect: "Move."
Advocate: "Stay."
User: "I have a dog"

TASK:
1. Generate the next 1-2 turns of dialogue in response to the user's input.
   - The counselors MUST acknowledge the user's point.
   - They should continue their debate, now incorporating the user's perspective as evidence for their own side (or refuting it).
   - Maintain the tension. Do not just agree with the user.
   - Keep responses conversational, punchy, and in-character.
   - You MUST return at least one response from each counselor.
   - In the dialogue, refer to the counselors by their titles: Architect and Advocate.
   - **PRONOUNS**: Now that the user has entered the conversation, you may address them directly as "you", OR continue to refer to them as "they/them" if speaking to the other counselor. Mix these naturally based on who the response is targeted at.

2. UPDATE THE DECISION MATRIX:
   - Based on the user's input and the new dialogue, update the "Core Conflict" and the "Criteria" scores/reasoning.
   - If the user introduced a new perspective, you may add a new criterion or adjust existing scores.
   - **IMPORTANT:** When adding a new criterion, *only* generate reasoning for the new criterion. The reasoning for pre-existing criteria *must not* be changed unless the user's input explicitly asks to update the reasoning for a specific existing criterion.
   - Scores are 1-10 (1 = low alignment, 10 = high alignment).

OUTPUT FORMAT:
Return ONLY a JSON object with this structure. No markdown. The 'speaker' MUST be the counselor's title.
{
  "dialogue": [
    { "speaker": "Architect", "text": "..." },
    { "speaker": "Advocate", "text": "..." }
  ],
  "mapState": {
    "core_issue": "Updated concise summary of the disagreement",
    "matrix": {
      "criteria": [
        {
          "id": "c1",
          "label": "Criterion Name",
          "c1_score": 8,
          "c2_score": 5,
          "reasoning": "Concise (max 20 words) explanation of why scores changed/remained"
        }
      ]
    }
  }
}
`;

const ORIGINAL_DEBATE_WITH_MATRIX = `
You are simulating a philosophical debate between two distinct personas ("The Council") regarding a user's dilemma.
The user has just interjected into the debate with a comment or question.

TONE GUIDELINES:
1. **Coffee Shop Rule**: These are opinionated friends, not therapists. Be casual, direct, and empathetic.
2. **Anti-Jargon**: NO clinical/corporate words (e.g., "interventions", "mitigate", "variables", "symptoms"). Use plain English.
3. **No Forced Metaphors**: Do not force title-specific metaphors (e.g. Architect -> blueprints). Focus on priorities, not themes.
4. **Conversational**: Use contractions ("it's", "they're") and natural speech patterns.

CONTEXT:
Dilemma: "Should I move?"

CURRENT DECISION MATRIX:
Core Conflict: "Risk vs roots"
Criteria:
- Cost: Architect=8/10, Advocate=3/10 (cheap)


THE DEBATERS:
1. Architect: Plans carefully.
2. Advocate: Feels deeply.

TRANSCRIPT SO FAR:
Architect: "Move."
Advocate: "Stay."
User: "I have a dog"

TASK:
1. Generate the next 1-2 turns of dialogue in response to the user's input.
   - The counselors MUST acknowledge the user's point.
   - They should continue their debate, now incorporating the user's perspective as evidence for their own side (or refuting it).
   - Maintain the tension. Do not just agree with the user.
   - Keep responses conversational, punchy, and in-character.
   - You MUST return at least one response from each counselor.
   - In the dialogue, refer to the counselors by their titles: Architect and Advocate.
   - **PRONOUNS**: Now that the user has entered the conversation, you may address them directly as "you", OR continue to refer to them as "they/them" if speaking to the other counselor. Mix these naturally based on who the response is targeted at.

2. UPDATE THE DECISION MATRIX:
   - Based on the user's input and the new dialogue, update the "Core Conflict" and the "Criteria" scores/reasoning.
   - If the user introduced a new perspective, you may add a new criterion or adjust existing scores.
   - **IMPORTANT:** When adding a new criterion, *only* generate reasoning for the new criterion. The reasoning for pre-existing criteria *must not* be changed unless the user's input explicitly asks to update the reasoning for a specific existing criterion.
   - Scores are 1-10 (1 = low alignment, 10 = high alignment).

OUTPUT FORMAT:
Return ONLY a JSON object with this structure. No markdown. The 'speaker' MUST be the counselor's title.
{
  "dialogue": [
    { "speaker": "Architect", "text": "..." },
    { "speaker": "Advocate", "text": "..." }
  ],
  "mapState": {
    "core_issue": "Updated concise summary of the disagreement",
    "matrix": {
      "criteria": [
        {
          "id": "c1",
          "label": "Criterion Name",
          "c1_score": 8,
          "c2_score": 5,
          "reasoning": "Concise (max 20 words) explanation of why scores changed/remained"
        }
      ]
    }
  }
}
`;

const debaters = [
  { id: 'Architect', name: 'The Architect', role: 'Strategist', description: 'Plans carefully.' },
  { id: 'Advocate', name: 'The Advocate', role: 'Idealist', description: 'Feels deeply.' },
];
const transcript = [{ speaker: 'Architect', text: 'Move.' }, { speaker: 'Advocate', text: 'Stay.' }];
const matrixTension = {
  core_issue: 'Risk vs roots',
  matrix: { criteria: [{ id: 'c1', label: 'Cost', c1_score: 8, c2_score: 3, reasoning: 'cheap' }] },
};

describe('buildDebateInjectionPrompt', () => {
  test('is byte-identical to the pre-memory prompt without a memories section', () => {
    expect(buildDebateInjectionPrompt('Should I move?', { core_issue: 'Risk vs roots' }, transcript, 'I have a dog', debaters))
      .toBe(ORIGINAL_DEBATE);
    expect(buildDebateInjectionPrompt('Should I move?', matrixTension, transcript, 'I have a dog', debaters))
      .toBe(ORIGINAL_DEBATE_WITH_MATRIX);
  });

  test('an empty memories section changes nothing', () => {
    expect(buildDebateInjectionPrompt('Should I move?', { core_issue: 'Risk vs roots' }, transcript, 'I have a dog', debaters, ''))
      .toBe(ORIGINAL_DEBATE);
  });

  test('inserts the memories section right after CONTEXT', () => {
    const section = 'THINGS THE USER SHARED EARLIER\n- [x] "lease"';
    const prompt = buildDebateInjectionPrompt('Should I move?', { core_issue: 'Risk vs roots' }, transcript, 'I have a dog', debaters, section);
    expect(prompt).toContain(`Core Conflict: "Risk vs roots"\n\n${section}\n\nTHE DEBATERS:`);
  });

  test('with a matrix, the section follows the criteria', () => {
    const section = 'THINGS THE USER SHARED EARLIER\n- [x] "lease"';
    const prompt = buildDebateInjectionPrompt('Should I move?', matrixTension, transcript, 'I have a dog', debaters, section);
    expect(prompt).toContain(`- Cost: Architect=8/10, Advocate=3/10 (cheap)\n\n\n${section}\n\nTHE DEBATERS:`);
  });
});

describe('buildSummonUserPrompt', () => {
  // What /api/summon built inline before memory was added.
  test('initial summon is unchanged', () => {
    expect(buildSummonUserPrompt({ mbti: 'ENFP', dilemma: 'Should I move?' }))
      .toBe("User MBTI: ENFP\nDilemma: Should I move?\n\nGenerate The Council's analysis.");
  });

  test('a missing MBTI is BALANCED', () => {
    expect(buildSummonUserPrompt({ mbti: null, dilemma: 'Should I move?' }))
      .toBe("User MBTI: BALANCED\nDilemma: Should I move?\n\nGenerate The Council's analysis.");
  });

  test('refinement is unchanged without memories', () => {
    const expected =
      "User MBTI: ENFP\nDilemma: Should I move?\n\nPrevious Context Summary: Has a dog\n\nAdditional Context: my lease ends in March\n\nGenerate The Council's analysis.";
    expect(buildSummonUserPrompt({ mbti: 'ENFP', dilemma: 'Should I move?', previousSummary: 'Has a dog', additionalContext: 'my lease ends in March' }))
      .toBe(expected);
    expect(buildSummonUserPrompt({
      mbti: 'ENFP', dilemma: 'Should I move?', previousSummary: 'Has a dog', additionalContext: 'my lease ends in March', memoriesSection: '',
    })).toBe(expected);
  });

  test('appends the memories section after Additional Context', () => {
    const section = 'THINGS THE USER SHARED EARLIER\n- [x] "I have a dog"';
    expect(buildSummonUserPrompt({
      mbti: 'ENFP', dilemma: 'Should I move?', previousSummary: 'Has a dog', additionalContext: 'my lease ends in March', memoriesSection: section,
    })).toBe(
      `User MBTI: ENFP\nDilemma: Should I move?\n\nPrevious Context Summary: Has a dog\n\nAdditional Context: my lease ends in March\n\n${section}\n\nGenerate The Council's analysis.`
    );
  });
});
