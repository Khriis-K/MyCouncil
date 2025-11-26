import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from "@google/genai";
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { selectCouncilors } from '../data/counselorMatrix';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Validation Schema
const summonSchema = z.object({
  dilemma: z.string()
    .min(10, "Dilemma must be at least 10 characters long")
    .max(1000, "Dilemma cannot exceed 1000 characters"),
  mbti: z.string().nullable().optional(),
  councilSize: z.number().min(3).max(7).optional().default(4),
  previousSummary: z.string().optional(),
  additionalContext: z.string()
    .max(300, "Additional context cannot exceed 300 characters")
    .optional(),
});

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // Limit each IP to 5 requests per windowMs in prod, 100 in dev
  message: { error: "Too many requests from this IP, please try again after 15 minutes" },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiter to the summon endpoint
app.use('/api/summon', apiLimiter);

console.log(`Rate limiting enabled: ${process.env.NODE_ENV === 'production' ? 'Strict (5 req/15m)' : 'Dev (100 req/15m)'}`);

/**
 * Builds dynamic SYSTEM_PROMPT based on user MBTI and council size
 */
function buildSystemPrompt(selectedCounselors: ReturnType<typeof selectCouncilors>, isRefinement: boolean = false): string {
  const counselorDescriptions = selectedCounselors.map(c => 
    `${c.role.charAt(0).toUpperCase() + c.role.slice(1)} - ${c.title} (${c.mbtiCode}): ${c.description}`
  ).join('\n');

  const counselorIds = selectedCounselors.map(c => `"${c.role}"`).join(' | ');

  const refinementGuidance = isRefinement ? `
IMPORTANT - REFINEMENT MODE:
This is a follow-up request. The user has provided additional context to refine their original dilemma.
You will receive:
1. Original dilemma (user's core question)
2. Previous context summary (optional) - a brief label from the last refinement
3. New additional context (what the user just added - max 300 characters)

You should reassess the situation with ALL the context provided. Generate updated counselor responses based on the full picture.

Also generate a "context_summary" field - a brief display label (max 50 chars) summarizing the latest refinement:
{
  "summary": "..." (CRITICAL: Keep this EXACTLY the same as the initial response - do NOT change this field during refinements),
  "context_summary": "Brief label for latest refinement (max 50 chars)",
  "counselors": [...],
  "tensions": [...]
}

Example:
- User adds: "My partner is supportive but my parents disapprove"
- context_summary: "Partner supportive, parents disapprove"

The context_summary is just a UI label. Keep it under 50 characters.
` : '';

  return `
You are "The Council", a collection of ${selectedCounselors.length} distinct counselor personas designed to help users reflect on complex dilemmas.
Your goal is to analyze the user's dilemma from ${selectedCounselors.length} genuinely different perspectives and identify meaningful tensions between them.

The ${selectedCounselors.length} Counselors:
${counselorDescriptions}

Each counselor represents a different thinking style and worldview. They should:
- Speak in natural, conversational language (avoid MBTI jargon like "Ni-Fe" or "Ti-Ne")
- Offer genuinely different reasoning based on their personality type's natural tendencies
- Be direct, compassionate, and thought-provoking
- Focus on practical wisdom, not theoretical psychology

${refinementGuidance}

You must output a JSON object with the following structure:
{
  "summary": "A very concise, punchy title (3-6 words) capturing the core conflict",
  "counselors": [
    {
      "id": ${counselorIds},
      "impression": "A punchy, one-sentence first take on the dilemma that captures this counselor's immediate reaction and perspective (max 150 characters)",
      "assessment": "2-3 conversational sentences analyzing the dilemma from this counselor's unique perspective. Use plain language that shows their thinking style without referencing personality theory.",
      "action_plan": ["Actionable step 1", "Actionable step 2", "Actionable step 3"],
      "reflection_q": "A deep, personally relevant question that only this counselor would ask"
    }
    // ... for all ${selectedCounselors.length} counselors
  ],
  "tensions": [
    {
      "pair_id": "string (e.g., mirror-alterego)",
      "counselor_ids": ["id1", "id2"],
      "type": "conflict" | "synthesis",
      "core_issue": "The fundamental disagreement in plain language (1 sentence)",
      "dialogue": [
        { "speaker": "id1", "text": "Natural, conversational argument..." },
        { "speaker": "id2", "text": "Counter-argument in character..." },
        // ... 4-6 turns of authentic dialogue
      ]
    },
    // ... generate 2 distinct tension pairs (prioritize Mirror vs Alter Ego, and Consigliere vs another counselor)
  ]
}

Critical Guidelines:
- Write assessments as if speaking directly to the user, not analyzing them from outside
- Show different perspectives through reasoning style and priorities, not personality labels
- Avoid phrases like "your cognitive functions" or "as an INFJ" - just embody the perspective
- Make tensions feel like real philosophical disagreements, not personality theory debates
- The output MUST be valid JSON. Do not include markdown formatting like \`\`\`json.
`;
}

const LEGACY_SYSTEM_PROMPT = `
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

app.post('/api/summon', async (req, res) => {
  try {
    // Validate Input
    const validationResult = summonSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: validationResult.error.flatten()
      });
    }

    const { dilemma, mbti, councilSize, previousSummary, additionalContext } = validationResult.data;
    // Try both VITE_ prefixed (legacy) and standard keys
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("API Key missing");
      return res.status(500).json({ error: "Server misconfiguration: API Key missing" });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Select counselors dynamically based on user MBTI and council size
    const selectedCounselors = selectCouncilors(mbti, councilSize);
    
    // Determine if this is a refinement request
    const isRefinement = !!(previousSummary || additionalContext);
    const systemPrompt = buildSystemPrompt(selectedCounselors, isRefinement);

    // Build user prompt with optional context fields
    let userPrompt = `User MBTI: ${mbti || "BALANCED"}\nDilemma: ${dilemma}`;
    
    if (previousSummary) {
      userPrompt += `\n\nPrevious Context Summary: ${previousSummary}`;
    }
    
    if (additionalContext) {
      userPrompt += `\n\nAdditional Context: ${additionalContext}`;
    }
    
    userPrompt += '\n\nGenerate The Council\'s analysis.';

    console.log('Selected counselors:', selectedCounselors.map(c => c.role));
    console.log('Refinement mode:', isRefinement);
    console.log('Calling Gemini API...');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
    });

    console.log('Gemini response received:', response);

    // The response structure is: response.candidates[0].content.parts[0].text
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || response.text;
    
    if (!text) {
      console.error('No text in response:', JSON.stringify(response, null, 2));
      throw new Error("No response from AI");
    }

    console.log('AI response text:', text.substring(0, 200));
    const data = JSON.parse(text);
    res.json(data);
  } catch (error) {
    console.error("Error fetching council analysis:", error);
    res.status(500).json({ error: "Failed to generate council analysis" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
