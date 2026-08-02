import { success } from '../../../utils/api-response.js';
import { measureItems } from '../../../domain/measurement/measure.service.js';
import { loadRecipes } from '../../../domain/measurement/recipes.js';
import { cutPanels } from '../../../domain/optimization/cut.service.js';
import { estimateCost } from '../../../domain/costing/cost.service.js';

/**
 * POST /measurements/calculate — Stateless calculation of panel sizes, hardware, and areas.
 */
export async function calculateMeasurementsHandler(req, res) {
  const { items, boardThickness } = req.validated.body;
  
  const recipes = loadRecipes();
  const result = measureItems(items, { recipes, boardThickness });
  
  return success(res, 'Measurements calculated successfully', result);
}

/**
 * POST /cutting/calculate — Stateless 2D cutting layout nesting optimization.
 */
export async function calculateCuttingHandler(req, res) {
  const result = cutPanels(req.validated.body);
  return success(res, 'Cutting layout optimized successfully', result);
}

/**
 * POST /cost-estimation/calculate — Stateless pricing & costing breakdown.
 */
export async function calculateCostingHandler(req, res) {
  const result = estimateCost(req.validated.body);
  return success(res, 'Cost estimation calculated successfully', result);
}
