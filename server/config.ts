import dotenv from 'dotenv';
import type { RerankerName } from './memory/models';
import type { Stage1Mode } from './memory/types';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

export const config = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  model: process.env.OPENROUTER_MODEL || 'amazon/nova-lite-v1',
  // Placeholder defaults, to be tuned on the dev split in a later ticket.
  memory: {
    enabled: process.env.MEMORY_ENABLED !== '0',
    k: 5,
    candidatePool: 30,
    // Dense beat bm25 and matched hybrid on the dev split (bench/memory/results/dev-2026-10-03T18-04-43-537Z.md).
    stage1: 'dense' as Stage1Mode,
    recentWindow: 6,
    // 'llm-select' won on the held-out test split; both cross-encoders lowered recall (bench/memory/results/latest-test.md).
    // It sends the top dense candidates to the chat model on every message.
    reranker: 'llm-select' as RerankerName,
    selectorTimeoutMs: 5000,
    // MEMORY_DEBUG=1: trace in the chat response, candidate table in the console, JSONL in logs/.
    debug: process.env.MEMORY_DEBUG === '1',
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 5 : 100,
  }
};

if (!config.openRouterApiKey) {
  console.warn("Warning: OPENROUTER_API_KEY is missing in environment variables.");
}
