import { config } from './config';

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

/**
 * Sends messages to OpenRouter's OpenAI-compatible chat endpoint and returns the reply text.
 */
export async function generateText(messages: Message[], model = config.model, options: { temperature?: number } = {}): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openRouterApiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'MyCouncil',
    },
    body: JSON.stringify({ model, messages, ...options }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const text: string | undefined = data.choices?.[0]?.message?.content;
  if (!text) {
    console.error('No text in response:', JSON.stringify(data, null, 2));
    throw new Error('No response from AI');
  }
  return text;
}
