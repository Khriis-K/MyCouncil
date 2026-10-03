import { config } from '../config';
import { generateText } from '../llm';
import { LlmSelector } from './llmSelector';

/** Dense candidates always kept ahead of the selector's picks; frozen with the test-split run. */
export const SELECTOR_KEEP_TOP = 2;

/** The selector production runs and dense-top2+llm-select benchmarks. A timeout rejects, so the pipeline falls back to dense order. */
export function createProductionSelector(k: number, timeoutMs?: number): LlmSelector {
  return new LlmSelector(
    messages => generateText(messages, config.model, { temperature: 0, ...(timeoutMs && { signal: AbortSignal.timeout(timeoutMs) }) }),
    config.model,
    k,
    SELECTOR_KEEP_TOP,
  );
}
