/**
 * Measurement Engine DTOs — input/output contracts.
 *
 * The engine is pure and stateless: `measureItems(items, config)` → `{ items, totals }`.
 * Config carries the code-bundled recipe map (from recipes.js) and the default board
 * thickness, so the engine never touches the filesystem or a database.
 *
 * Count semantics:
 * - Top-level items use per-unit counts: `shelves`/`drawers`/`shutters` describe ONE
 *   unit of the furniture, and `quantity` is the number of identical units.
 * - Kitchens use per-module semantics: `shelves`/`drawers` describe ONE module, and the
 *   recipe's `ceil(width/600)` sub-assembly counts scale the module across the run.
 */

import { z } from 'zod';

/**
 * A single furniture item to measure. Dimensions in mm; counts are integers ≥ 0.
 * `category` is a plain string here so the engine can raise the domain-level
 * `UNSUPPORTED_CATEGORY` DomainError for unknown values (adapters pre-validate the enum).
 */
export const furnitureInputSchema = z.object({
  category: z.string().min(1).max(50),
  width: z.number().positive().max(20000),
  height: z.number().positive().max(20000),
  depth: z.number().positive().max(20000),
  shelves: z.number().int().min(0).max(50).default(0),
  drawers: z.number().int().min(0).max(50).default(0),
  shutters: z.number().int().min(0).max(50).default(1),
  quantity: z.number().int().min(1).max(100).default(1),
});

/** Batch input: up to 200 items in one measurement request. */
export const measureInputSchema = z.object({
  items: z.array(furnitureInputSchema).min(1).max(200),
});

/**
 * Engine config. `recipes` may be a Map (from loadRecipes) or a plain object keyed by
 * category; `boardThickness` feeds the `thk` formula token (default 18 mm).
 */
export const measureConfigSchema = z.object({
  recipes: z
    .custom((v) => v instanceof Map || (typeof v === 'object' && v !== null))
    .optional(),
  boardThickness: z.number().positive().optional(),
});

/**
 * @typedef {z.infer<typeof furnitureInputSchema>} FurnitureInput
 * @typedef {z.infer<typeof measureInputSchema>} MeasureInput
 * @typedef {z.infer<typeof measureConfigSchema>} MeasureConfig
 */

/**
 * One resolved panel within a measurement result.
 * `assembly` is 'main' for the top-level recipe or the sub-assembly name (e.g.
 * 'baseCabinet'). `count` already includes the sub-assembly/quantity multiplier.
 * @typedef {object} MeasuredPanel
 * @property {string} assembly
 * @property {string} name
 * @property {number} w width in mm
 * @property {number} d depth in mm
 * @property {number} thickness mm
 * @property {string} materialType from MATERIAL_TYPES
 * @property {number} faces finished faces (0–2)
 * @property {number} count pieces (after multipliers)
 * @property {number} areaPerPiece sqm per piece
 * @property {number} totalArea sqm across all pieces
 */

/**
 * @typedef {object} HardwareCounts
 * @property {number} hinges
 * @property {number} channels
 * @property {number} handles
 * @property {number} locks
 * @property {number} connectors
 */

/**
 * Measurement result for one furniture item (one unit × quantity).
 * @typedef {object} MeasurementResult
 * @property {string} category
 * @property {number} quantity
 * @property {MeasuredPanel[]} panels
 * @property {number} edgeBandM total banded edge in metres
 * @property {HardwareCounts} hardware
 * @property {number} paintArea sqm — finished faces for PU/Duco
 * @property {number} laminateArea sqm — finished faces for laminate
 * @property {number} finishArea sqm — total finished faces (material split happens in costing)
 * @property {number} materialArea sqm — board/backBoard area only
 * @property {number} area sqm — total panel surface area, all materials
 * @property {number} volume m³ — total panel volume
 */

/**
 * @typedef {object} MeasureItemsResult
 * @property {MeasurementResult[]} items
 * @property {object} totals
 * @property {number} totals.area
 * @property {number} totals.materialArea
 * @property {number} totals.volume
 * @property {number} totals.edgeBandM
 * @property {number} totals.paintArea
 * @property {number} totals.laminateArea
 * @property {number} totals.finishArea
 * @property {HardwareCounts} totals.hardware
 */
