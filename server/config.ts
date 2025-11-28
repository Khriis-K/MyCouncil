import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

export const config = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY,
  geminiModel: 'gemini-2.5-flash',
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 5 : 100,
  }
};

if (!config.geminiApiKey) {
  console.warn("Warning: GEMINI_API_KEY is missing in environment variables.");
}
