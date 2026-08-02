/**
 * Anthropic provider — thin SDK adapter. `@anthropic-ai/sdk` is `import()`ed lazily so
 * the app runs on `mock` without it (design §15). Missing `ANTHROPIC_API_KEY` or an
 * uninstalled SDK throws → the AI service falls back to mock with a log.
 */

import { env } from '../../../config/env.js';

export default {
  name: 'anthropic',
  /**
   * @param {{ system: string, user: string, model?: string }} args
   * @returns {Promise<string>} raw completion text
   */
  async estimate({ system, user, model }) {
    if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: model ?? env.ANTHROPIC_MODEL ?? 'claude-sonnet-5',
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: user }],
    });
    return message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');
  },
};
