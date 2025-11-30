import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from "@google/genai";
import rateLimit from 'express-rate-limit';
import { selectCouncilors } from '../data/counselorMatrix';
import { buildSystemPrompt, buildDebateInjectionPrompt } from './promptBuilder';
// Import Zod schema for request validation
import { summonSchema, debateInjectionSchema } from './schemas';
import { config } from './config';

const app = express();

// Add error handlers early
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.use(cors());
app.use(express.json());

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { error: "Too many requests from this IP, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to the summon endpoint
app.use('/api/summon', apiLimiter);

console.log(`Rate limiting enabled: ${config.env === 'production' ? 'Strict (5 req/15m)' : 'Dev (100 req/15m)'}`);

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

    const { dilemma, mbti, councilSize, previousSummary, additionalContext, reflectionFocus } = validationResult.data;
    
    if (!config.geminiApiKey) {
      console.error("API Key missing");
      return res.status(500).json({ error: "Server misconfiguration: API Key missing" });
    }

    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    // Select counselors dynamically based on user MBTI and council size
    const selectedCounselors = selectCouncilors(mbti ?? null, councilSize);
    
    // Determine if this is a refinement request
    const isRefinement = !!(previousSummary || additionalContext);
    const systemPrompt = buildSystemPrompt(selectedCounselors, isRefinement, reflectionFocus);

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
      model: config.geminiModel,
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
    
    // Clean the response text (remove markdown code blocks if present)
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      console.log('Cleaned AI Response Text:', cleanedText);
      const data = JSON.parse(cleanedText);
      res.json(data);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Problematic AI response text:", cleanedText);
      // It's often helpful to see the original raw text too
      console.error("Original raw AI text before cleaning:", text);
      res.status(500).json({ 
        error: "Failed to parse council analysis from AI response",
        details: typeof parseError === 'object' && parseError !== null && 'message' in parseError ? (parseError as Error).message : String(parseError),
        bad_response: cleanedText 
      });
    }
  } catch (error) {
    console.error("Error fetching council analysis (full error):", error);
    res.status(500).json({ error: "Failed to generate council analysis" });
  }
});

app.post('/api/debate/inject', async (req, res) => {
  try {
    const validationResult = debateInjectionSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: validationResult.error.flatten()
      });
    }

    const { dilemma, tension, history, user_input, counselors } = validationResult.data;

    if (!config.geminiApiKey) {
      return res.status(500).json({ error: "Server misconfiguration: API Key missing" });
    }

    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
    // Pass the full tension object (which now includes map fields) to the prompt builder
    const prompt = buildDebateInjectionPrompt(dilemma, tension, history, user_input, counselors);

    console.log('Generating debate injection response...');
    console.log('Prompt preview:', prompt.substring(0, 200) + '...');
    
    const response = await ai.models.generateContent({
      model: config.geminiModel,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || response.text;
    if (!text) throw new Error("No response from AI");

    console.log('Raw AI Response for Injection:', text);

    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const responseData = JSON.parse(cleanedText);

    // Validate response structure
    if (!responseData.dialogue || !Array.isArray(responseData.dialogue)) {
       console.warn('Invalid AI response structure:', responseData);
       throw new Error("AI returned invalid structure (missing dialogue array)");
    }

    res.json(responseData);

  } catch (error) {
    console.error("Error processing debate injection:", error);
    res.status(500).json({ error: "Failed to process debate injection" });
  }
});

export default app;
