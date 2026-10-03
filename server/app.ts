import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { selectCouncilors, COUNSELOR_MATRIX } from '../data/counselorMatrix';
import { buildSystemPrompt, buildDebateInjectionPrompt, buildChatPrompt, buildSummonUserPrompt } from './promptBuilder';
// Import Zod schema for request validation
import { summonSchema, debateInjectionSchema, chatSchema } from './schemas';
import { config } from './config';
import { generateText } from './llm';
import { recallForChat, recallForDebate, recallForRefinement, type MemoryRecall, type RecallEndpoint } from './memory/chatMemory';
import { formatMemoriesForPrompt } from './memory/format';
import { reportRetrieval, TRACE_FILE } from './memory/observability';

const app = express();

// Add error handlers early
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Logs the retrieval and shapes it for the response; the same for every generation path.
function reportRecall(recall: MemoryRecall, endpoint: RecallEndpoint) {
  if (recall.trace) {
    reportRetrieval(recall.trace, { debug: config.memory.debug, traceFile: TRACE_FILE });
  } else {
    console.log(`[memory] ${endpoint} skipped (${recall.fallback})`);
  }
  return {
    used: recall.used.map(u => ({ id: u.id, sourceId: u.sourceId, text: u.text, channel: u.channel, counselorId: u.counselorId })),
    fallback: recall.fallback,
    ...(config.memory.debug && recall.trace && { trace: recall.trace }),
  };
}

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

    const { dilemma, mbti, councilSize, previousSummary, additionalContext, reflectionFocus, memorySources } = validationResult.data;
    
    if (!config.openRouterApiKey) {
      console.error("API Key missing");
      return res.status(500).json({ error: "Server misconfiguration: API Key missing" });
    }

    // Select counselors dynamically based on user MBTI and council size
    const selectedCounselors = selectCouncilors(mbti ?? null, councilSize);
    
    // Determine if this is a refinement request
    const isRefinement = !!(previousSummary || additionalContext);
    const systemPrompt = buildSystemPrompt(selectedCounselors, isRefinement, reflectionFocus);

    // Only a refinement recalls: an initial summon has nothing earlier to remember.
    const recall = additionalContext
      ? await recallForRefinement({ additionalContext, sources: memorySources, settings: config.memory })
      : undefined;
    const memory = recall && reportRecall(recall, 'refinement');

    const userPrompt = buildSummonUserPrompt({
      mbti, dilemma, previousSummary, additionalContext,
      memoriesSection: recall && formatMemoriesForPrompt(recall.used, {}),
    });

    console.log('Selected counselors:', selectedCounselors.map(c => c.role));
    console.log('Refinement mode:', isRefinement);
    console.log(`Calling ${config.model}...`);

    const text = await generateText([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    console.log('AI response text:', text.substring(0, 200));
    
    // Clean the response text (remove markdown code blocks if present)
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      console.log('Cleaned AI Response Text:', cleanedText);
      const data = JSON.parse(cleanedText);
      res.json(memory ? { ...data, memory } : data);
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

    const { dilemma, tension, history, user_input, counselors, memorySources } = validationResult.data;

    if (!config.openRouterApiKey) {
      return res.status(500).json({ error: "Server misconfiguration: API Key missing" });
    }

    const recall = await recallForDebate({ userInput: user_input, history, counselorIds: tension.counselor_ids, sources: memorySources, settings: config.memory });
    const memory = reportRecall(recall, 'debate');

    // Pass the full tension object (which now includes map fields) to the prompt builder
    const prompt = buildDebateInjectionPrompt(dilemma, tension, history, user_input, counselors, formatMemoriesForPrompt(recall.used, {}));

    console.log('Generating debate injection response...');
    console.log('Prompt preview:', prompt.substring(0, 200) + '...');
    
    const text = await generateText([{ role: 'user', content: prompt }]);

    console.log('Raw AI Response for Injection:', text);

    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const responseData = JSON.parse(cleanedText);

    // Validate response structure
    if (!responseData.dialogue || !Array.isArray(responseData.dialogue)) {
       console.warn('Invalid AI response structure:', responseData);
       throw new Error("AI returned invalid structure (missing dialogue array)");
    }

    res.json({ ...responseData, memory });

  } catch (error) {
    console.error("Error processing debate injection:", error);
    res.status(500).json({ error: "Failed to process debate injection" });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const validationResult = chatSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: validationResult.error.flatten()
      });
    }

    const { counselorId, dilemma, mbti, history, message, memorySources } = validationResult.data;

    if (!config.openRouterApiKey) {
      return res.status(500).json({ error: "Server misconfiguration: API Key missing" });
    }

    // Look up the specific counselor based on User MBTI
    const mbtiKey = mbti && mbti !== 'BALANCED' && COUNSELOR_MATRIX[mbti] ? mbti : 'BALANCED';
    const potentialCounselors = COUNSELOR_MATRIX[mbtiKey];
    
    // Find the counselor by ID (which is the title without "The ")
    const counselor = potentialCounselors.find(c => c.title.replace(/^The /, '') === counselorId);

    if (!counselor) {
      return res.status(404).json({ error: "Counselor not found for this MBTI type" });
    }

    const recall = await recallForChat({ counselorId, message, sources: memorySources, settings: config.memory });
    // Older turns are reachable through retrieval, so only trim when retrieval actually ran.
    const promptHistory = recall.fallback ? history : history.slice(-config.memory.recentWindow);
    const prompt = buildChatPrompt(dilemma, promptHistory, message, counselor, mbtiKey, formatMemoriesForPrompt(recall.used, {}));

    const memory = reportRecall(recall, 'chat');

    console.log(`Generating chat response for ${counselor.title}...`);
    
    const text = await generateText([{ role: 'user', content: prompt }]);

    console.log('AI Chat Response:', text.substring(0, 100) + '...');

    res.json({
      response: text.trim(),
      memory,
    });

  } catch (error) {
    console.error("Error processing chat:", error);
    res.status(500).json({ error: "Failed to generate chat response" });
  }
});

export default app;
