import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from "@google/genai";
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

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

    const { dilemma, mbti } = validationResult.data;
    // Try both VITE_ prefixed (legacy) and standard keys
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("API Key missing");
      return res.status(500).json({ error: "Server misconfiguration: API Key missing" });
    }

    const ai = new GoogleGenAI({ apiKey });

    const userPrompt = `
      User MBTI: ${mbti || "Unknown"}
      Dilemma: ${dilemma}
      
      Generate The Council's analysis.
    `;

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
