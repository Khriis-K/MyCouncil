import { GoogleGenAI } from "@google/genai";
import { CouncilResponse } from "../types";

const SYSTEM_PROMPT = `
You are "The Council", a collection of 4 archetypal AI personas (Strategist, Nurturer, Skeptic, Visionary) designed to help users reflect on dilemmas.
Your goal is to analyze the user's dilemma from these 4 distinct perspectives and identify tensions between them.

The 4 Archetypes:
1. Strategist (Blue): Logical, analytical, focuses on long-term consequences and optimal paths.
2. Nurturer (Green): Empathetic, caring, prioritizes emotional well-being and relationships.
3. Skeptic (Yellow): Critical, risk-averse, identifies flaws and worst-case scenarios.
4. Visionary (Purple): Future-oriented, sees possibilities and "big picture" potential.

You must output a JSON object with the following structure:
{
  "summary": "A very concise, punchy title (3-6 words) capturing the core conflict",
  "counselors": [
    {
      "id": "strategist" | "nurturer" | "skeptic" | "visionary",
      "assessment": "Unique analysis from this archetype's perspective (2-3 sentences)",
      "action_plan": ["Actionable step 1", "Actionable step 2", "Actionable step 3"],
      "reflection_q": "A deep probing question from this archetype"
    }
    // ... for all 4 counselors
  ],
  "tensions": [
    {
      "pair_id": "string (e.g., strategist-skeptic)",
      "counselor_ids": ["id1", "id2"],
      "type": "conflict" | "synthesis",
      "core_issue": "The fundamental disagreement (1 sentence)",
      "dialogue": [
        { "speaker": "id1", "text": "Argument..." },
        { "speaker": "id2", "text": "Counter-argument..." },
        // ... 4-6 turns of dialogue
      ]
    },
    // ... generate 2 distinct tension pairs
  ]
}

Important:
- Tailor the tone based on the user's MBTI type if provided.
- Ensure the "tensions" represent genuine philosophical or practical disagreements relevant to the dilemma.
- The output MUST be valid JSON. Do not include markdown formatting like \`\`\`json.
`;

export const fetchCouncilAnalysis = async (
  apiKey: string,
  dilemma: string,
  mbti: string | null
): Promise<CouncilResponse> => {
  const ai = new GoogleGenAI({ apiKey });

  const userPrompt = `
    User MBTI: ${mbti || "Unknown"}
    Dilemma: ${dilemma}
    
    Generate The Council's analysis.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        responseMimeType: 'application/json',
      },
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as CouncilResponse;
  } catch (error) {
    console.error("Error fetching council analysis:", error);
    throw error;
  }
};
