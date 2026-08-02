import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../../middleware/validate.middleware.js';
import { authenticate, authorize } from '../../../middleware/auth.middleware.js';
import { furnitureInputSchema } from '../../../domain/measurement/dto.js';
import { cutInputSchema } from '../../../domain/optimization/dto.js';
import { costInputSchema } from '../../../domain/costing/dto.js';
import * as CalculationController from '../controllers/calculation.controller.js';

/**
 * @openapi
 * tags:
 *   - name: Calculation
 *     description: Stateless engines for measurement, cutting, and costing (design §7)
 */

const router = Router();

const calculateMeasurementsSchema = z.object({
  items: z.array(furnitureInputSchema).min(1).max(200),
  boardThickness: z.number().positive().optional(),
});

/**
 * @openapi
 * /measurements/calculate:
 *   post:
 *     tags: [Calculation]
 *     summary: Stateless measurements calculate
 *     description: Resolve a list of furniture items into panel sizes, edge bandings, hardware counts, and areas.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               boardThickness: { type: number, default: 18 }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [category, width, height, depth]
 *                   properties:
 *                     category: { type: string, enum: [wardrobe, kitchen, tv-unit, bed, dining, vanity, shoe-rack, loft, study-table, office-table] }
 *                     width: { type: number }
 *                     height: { type: number }
 *                     depth: { type: number }
 *                     shelves: { type: integer, default: 0 }
 *                     drawers: { type: integer, default: 0 }
 *                     shutters: { type: integer, default: 0 }
 *                     quantity: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: Calculations completed
 */
router.post(
  '/measurements/calculate',
  authenticate,
  authorize('admin', 'designer'),
  validate({ body: calculateMeasurementsSchema }),
  CalculationController.calculateMeasurementsHandler
);

/**
 * @openapi
 * /cutting/calculate:
 *   post:
 *     tags: [Calculation]
 *     summary: Stateless panel nesting optimization
 *     description: Run the shelf-based 2D FFD nesting algorithm on a batch of panels.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [panels, sheetKey]
 *             properties:
 *               sheetKey: { type: string, example: "8x4" }
 *               kerf: { type: number, default: 3 }
 *               panels:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [w, d]
 *                   properties:
 *                     w: { type: number }
 *                     d: { type: number }
 *                     label: { type: string }
 *     responses:
 *       200:
 *         description: Optimization completed
 */
router.post(
  '/cutting/calculate',
  authenticate,
  authorize('admin', 'designer'),
  validate({ body: cutInputSchema }),
  CalculationController.calculateCuttingHandler
);

/**
 * @openapi
 * /cost-estimation/calculate:
 *   post:
 *     tags: [Calculation]
 *     summary: Stateless pricing & costing breakdown
 *     description: Compute the cost breakdown and cost-plus pricing dynamically.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cost breakdown completed
 */
router.post(
  '/cost-estimation/calculate',
  authenticate,
  authorize('admin', 'designer', 'sales'),
  validate({ body: costInputSchema }),
  CalculationController.calculateCostingHandler
);

export default router;
