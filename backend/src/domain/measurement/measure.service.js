/**
 * Measurement Engine (pure domain service).
 *
 * Resolves a furniture item against its construction recipe into concrete panels,
 * hardware counts, edge banding, and finish/area/volume figures. The recipe formulas
 * are evaluated by the safe recursive-descent parser in shared/formula.js — never eval.
 *
 * The engine is stateless: it receives the parsed recipe map as config (see dto.js),
 * so it can be driven by REST endpoints, CLI scripts, unit tests, or the AI assistant.
 */

import { evaluateFormula } from '../../shared/formula.js';
import { unsupportedCategory, missingRecipe } from '../../shared/errors.js';
import { FURNITURE_CATEGORIES } from './recipe.schema.js';
import { furnitureInputSchema, measureInputSchema } from './dto.js';

/** Materials that get finished (paint/laminate) and are cut from sheet stock. */
const FINISH_MATERIALS = new Set(['board', 'backBoard']);
const HARDWARE_KEYS = ['hinges', 'channels', 'handles', 'locks', 'connectors'];

const round = (value, dp) => {
  const f = 10 ** dp;
  return Math.round((value + Number.EPSILON) * f) / f;
};

/**
 * Resolve a count field to an integer. Recipe counts may be a literal number
 * (JSON `"count": 2`) or a formula string (`"shutters*3"`).
 */
const resolveCount = (value, context) =>
  typeof value === 'number' ? value : Math.round(evaluateFormula(value, context));

/**
 * Pick a recipe from config, accepting a Map (loadRecipes()) or a plain object.
 * @param {unknown} recipes
 * @param {string} category
 * @returns {import('./recipe.schema.js').FurnitureRecipe}
 */
function getRecipeFromConfig(recipes, category) {
  if (recipes instanceof Map) return recipes.get(category);
  if (recipes && typeof recipes === 'object') return recipes[category];
  return undefined;
}

/**
 * Measure one furniture item.
 * @param {import('./dto.js').FurnitureInput} item
 * @param {import('./dto.js').MeasureConfig} [config]
 * @returns {import('./dto.js').MeasurementResult}
 */
export function measureFurnitureItem(item, config = {}) {
  // Validate input at the domain boundary — adapters may pre-validate, but the engine
  // must stay safe when driven from tests or CLI scripts directly.
  const input = furnitureInputSchema.parse(item);
  if (!FURNITURE_CATEGORIES.includes(input.category)) {
    throw unsupportedCategory(input.category);
  }
  const recipe = getRecipeFromConfig(config.recipes, input.category);
  if (!recipe) throw missingRecipe(input.category);

  const boardThickness = config.boardThickness ?? 18;
  const context = {
    width: input.width,
    height: input.height,
    depth: input.depth,
    shelves: input.shelves,
    drawers: input.drawers,
    shutters: input.shutters,
    quantity: input.quantity,
    thk: boardThickness,
  };

  /** @type {import('./dto.js').MeasuredPanel[]} */
  const panels = [];
  const hardware = { hinges: 0, channels: 0, handles: 0, locks: 0, connectors: 0 };
  let edgeBandMm = 0;
  let finishSqm = 0;
  let materialSqm = 0;
  let areaSqm = 0;
  let volumeM3 = 0;

  /**
   * Resolve one scope (the top-level recipe or one sub-assembly) into panels.
   * `multiplier` folds in quantity and, for sub-assemblies, the module count.
   */
  const resolveScope = (scopePanels, edgeBandNames, multiplier, assembly) => {
    const edgeBand = new Set(edgeBandNames);
    for (const p of scopePanels) {
      const count = resolveCount(p.count, context);
      const w = evaluateFormula(p.w, context);
      const d = evaluateFormula(p.d, context);
      const total = count * multiplier;
      const areaPerPiece = (w * d) / 1_000_000;
      const totalArea = areaPerPiece * total;

      areaSqm += totalArea;
      if (FINISH_MATERIALS.has(p.material)) {
        materialSqm += totalArea;
        finishSqm += areaPerPiece * p.faces * total;
      }
      volumeM3 += ((w * d * p.thickness) / 1_000_000_000) * total;
      if (edgeBand.has(p.name)) edgeBandMm += 2 * (w + d) * total;

      panels.push({
        assembly,
        name: p.name,
        w: round(w, 2),
        d: round(d, 2),
        thickness: p.thickness,
        materialType: p.material,
        faces: p.faces,
        count: total,
        areaPerPiece: round(areaPerPiece, 6),
        totalArea: round(totalArea, 6),
      });
    }
  };

  // Top-level panels: every panel is per-unit, scaled by quantity.
  resolveScope(recipe.panels, recipe.edgeBand, input.quantity, 'main');

  // Sub-assemblies (e.g. kitchen modules): each module's panels are scaled by
  // (module count × quantity).
  for (const sub of recipe.subAssemblies ?? []) {
    const subCount = resolveCount(sub.count, context);
    const multiplier = subCount * input.quantity;
    resolveScope(sub.panels, sub.edgeBand, multiplier, sub.name);

    for (const key of HARDWARE_KEYS) {
      const perModule = resolveCount(sub.hardware[key], context);
      hardware[key] += perModule * multiplier;
    }
  }

  // Top-level hardware: per-unit counts, scaled by quantity.
  for (const key of HARDWARE_KEYS) {
    const perUnit = resolveCount(recipe.hardware[key], context);
    hardware[key] += perUnit * input.quantity;
  }

  return {
    category: input.category,
    quantity: input.quantity,
    input: {
      width: input.width,
      height: input.height,
      depth: input.depth,
      shelves: input.shelves,
      drawers: input.drawers,
      shutters: input.shutters,
    },
    panels,
    edgeBandM: round(edgeBandMm / 1000, 4),
    hardware,
    paintArea: round(finishSqm, 6),
    laminateArea: round(finishSqm, 6),
    finishArea: round(finishSqm, 6),
    materialArea: round(materialSqm, 6),
    area: round(areaSqm, 6),
    volume: round(volumeM3, 6),
  };
}

/**
 * Measure a batch of items and sum room/request totals.
 * @param {import('./dto.js').MeasureInput['items']} items
 * @param {import('./dto.js').MeasureConfig} [config]
 * @returns {import('./dto.js').MeasureItemsResult}
 */
export function measureItems(items, config = {}) {
  const input = measureInputSchema.parse({ items });

  const measuredItems = input.items.map((item) => measureFurnitureItem(item, config));

  const totals = {
    area: 0,
    materialArea: 0,
    volume: 0,
    edgeBandM: 0,
    paintArea: 0,
    laminateArea: 0,
    finishArea: 0,
    hardware: { hinges: 0, channels: 0, handles: 0, locks: 0, connectors: 0 },
  };

  for (const m of measuredItems) {
    totals.area += m.area;
    totals.materialArea += m.materialArea;
    totals.volume += m.volume;
    totals.edgeBandM += m.edgeBandM;
    totals.paintArea += m.paintArea;
    totals.laminateArea += m.laminateArea;
    totals.finishArea += m.finishArea;
    for (const key of HARDWARE_KEYS) totals.hardware[key] += m.hardware[key];
  }

  return { items: measuredItems, totals };
}
