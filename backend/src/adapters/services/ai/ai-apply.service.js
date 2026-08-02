/**
 * AI apply orchestration — materialize a suggestion into a project (design §8.4).
 *
 * Re-validates the input (never trust the client), verifies the project exists, persists
 * rooms + furniture, and optionally runs the measurement engine over the persisted
 * furniture to seed the cost/BOQ pipeline. Full BOQ/quotation generation is Phase 2
 * orchestration (`estimateProject`) — this layer produces the measured estimate that
 * engine consumes.
 */

import { Project } from '../../persistence/mongoose/models/project.model.js';
import { invalidInput, notFound, zodErrors } from '../../../shared/errors.js';
import { aiApplyInputSchema } from '../../../domain/ai/dto.js';
import { measureItems } from '../../../domain/measurement/measure.service.js';
import { loadRecipes } from '../../../domain/measurement/recipes.js';
import { createRoomsWithFurniture } from '../../persistence/repositories/ai.repository.js';

/**
 * @param {import('../../../domain/ai/dto.js').AiApplyInput} input
 * @returns {Promise<{ rooms: object[], totalRooms: number, totalFurniture: number, measurement: object|null }>}
 */
export async function applySuggestion({ projectId, suggestion, measure = false }) {
  const parsed = aiApplyInputSchema.safeParse({ projectId, suggestion, measure });
  if (!parsed.success) {
    throw invalidInput('Invalid AI apply request', { errors: zodErrors(parsed.error) });
  }

  const { projectId: pid, suggestion: sug, measure: wantMeasure } = parsed.data;

  const project = await Project.findById(pid).lean();
  if (!project) throw notFound(`Project not found: ${pid}`);

  const persisted = await createRoomsWithFurniture({ projectId: pid, rooms: sug.rooms });

  let measurement = null;
  if (wantMeasure) {
    const items = sug.rooms.flatMap((room) => room.furniture);
    measurement = measureItems(items, { recipes: loadRecipes() });
  }

  return { ...persisted, measurement };
}
