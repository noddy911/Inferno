/**
 * OpenAI provider — thin SDK adapter. The `openai` package is NOT a hard dependency:
 * it is `import()`ed lazily so the app runs on `mock` without it (design §15). Missing
 * `OPENAI_API_KEY` or an uninstalled SDK throws; the AI service catches and falls back
 * to the mock provider with a log. Output is returned raw; validation happens in
 * `ai.service.js` (never injects prompt output as code).
 */

import { env } from '../../../config/env.js';

export default {
  name: 'openai',
  /**
   * @param {{ system: string, user: string, model?: string }} args
   * @returns {Promise<string>} raw completion text
   */
  async estimate({ system, user, model }) {
    if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: model ?? env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });
    return completion.choices[0]?.message?.content ?? '';
  },
};
