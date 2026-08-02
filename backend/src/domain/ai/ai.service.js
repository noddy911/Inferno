/**
 * AI Estimation Assistant — provider dispatch + output validation (design §8.4).
 *
 * `estimate(prompt)` dispatches to the configured provider (from `AI_PROVIDER` env or an
 * explicit override), enforces the 20 s timeout (design §11), and Zod-validates the raw
 * output BEFORE anything is persisted or measured. Failure handling:
 *   - provider error / timeout / missing key → deterministic mock response, logged;
 *   - output present but not schema-conforming → rejected (`INVALID_INPUT`) — malformed
 *     LLM output is never materialized (design §8.4 "validated JSON suggestion").
 *
 * Pure orchestration: providers are injectable so tests can simulate failures and
 * malformed output without network or SDKs.
 */

import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { invalidInput, zodErrors } from '../../shared/errors.js';
import { aiEstimateInputSchema, aiSuggestionSchema } from './dto.js';
import { buildEstimatePrompt } from './prompt-templates.js';
import mockProvider from './providers/mock.provider.js';
import openaiProvider from './providers/openai.provider.js';
import anthropicProvider from './providers/anthropic.provider.js';
import geminiProvider from './providers/gemini.provider.js';

export const AI_PROVIDERS = Object.freeze({
  mock: mockProvider,
  openai: openaiProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
});

/** Reject a provider call that exceeds the budget. */
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`AI provider timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Parse + validate raw provider output. Throws `INVALID_INPUT` when the output is not
 * JSON or does not conform to `aiSuggestionSchema`.
 * @param {string} raw
 */
export function parseSuggestion(raw) {
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch {
    throw invalidInput('AI returned output that is not valid JSON', { raw: String(raw).slice(0, 200) });
  }
  const parsed = aiSuggestionSchema.safeParse(obj);
  if (!parsed.success) {
    throw invalidInput('AI suggestion failed schema validation', { errors: zodErrors(parsed.error) });
  }
  return parsed.data;
}

/**
 * @param {{
 *   providers?: Record<string, { name: string, estimate(args: object): Promise<string> }>,
 *   defaultProvider?: string,
 *   timeoutMs?: number,
 *   log?: (message: string, meta: object) => void,
 * }} [options]
 */
export function createAiService({
  providers = AI_PROVIDERS,
  defaultProvider = env.AI_PROVIDER,
  timeoutMs = env.AI_TIMEOUT_MS,
  log = (message, meta) => logger.warn(message, meta),
} = {}) {
  /**
   * @param {string} prompt 3–2000 chars
   * @param {{ provider?: string }} [options] explicit provider override
   * @returns {Promise<{ suggestion: object, provider: string }>}
   */
  async function estimate(prompt, { provider } = {}) {
    const parsed = aiEstimateInputSchema.safeParse({ prompt });
    if (!parsed.success) {
      throw invalidInput('Invalid AI prompt', { errors: zodErrors(parsed.error) });
    }

    const requested = provider ?? defaultProvider;
    const target = providers[requested] ?? providers[defaultProvider] ?? mockProvider;
    const { system, user } = buildEstimatePrompt(parsed.data.prompt);

    let raw;
    let usedProvider = target.name;
    try {
      raw = await withTimeout(target.estimate({ system, user }), timeoutMs);
    } catch (err) {
      log(`ai:${requested}:fallback:mock`, { reason: err.message });
      raw = await mockProvider.estimate({ system, user });
      usedProvider = 'mock';
    }

    return { suggestion: parseSuggestion(raw), provider: usedProvider };
  }

  return { estimate };
}

/** Process-wide singleton used by the HTTP layer (dispatch driven by `AI_PROVIDER`). */
export const aiService = createAiService();

export const { estimate: estimateFurniture } = aiService;
