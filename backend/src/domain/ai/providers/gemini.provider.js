/**
 * Gemini provider — thin SDK adapter. `@google/generative-ai` is `import()`ed lazily so
 * the app runs on `mock` without it (design §15). Missing `GEMINI_API_KEY` or an
 * uninstalled SDK throws → the AI service falls back to mock with a log.
 */

import { env } from '../../../config/env.js';

export default {
  name: 'gemini',
  /**
   * @param {{ system: string, user: string, model?: string }} args
   * @returns {Promise<string>} raw completion text
   */
  async estimate({ system, user, model }) {
    if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const client = genAI.getGenerativeModel({ model: model ?? env.GEMINI_MODEL ?? 'gemini-2.0-flash' });
    const result = await client.generateContent({ systemInstruction: system, contents: user });
    return result.response.text();
  },
};
