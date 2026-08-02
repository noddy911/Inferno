import { success } from '../../../utils/api-response.js';
import { estimateFurniture } from '../../../domain/ai/ai.service.js';
import { applySuggestion } from '../../services/ai/ai-apply.service.js';

/**
 * Thin controllers — validation happens in middleware, logic lives in services.
 * Express 5 forwards rejected promises to the error middleware automatically.
 */

/** POST /ai/estimate — natural-language prompt → validated furniture suggestion. */
export async function estimate(req, res) {
  const result = await estimateFurniture(req.validated.body.prompt);
  return success(res, 'Estimate generated', result);
}

/** POST /ai/apply — materialize a suggestion into a project (rooms + furniture). */
export async function apply(req, res) {
  const result = await applySuggestion(req.validated.body);
  return success(res, 'Suggestion applied', result);
}
