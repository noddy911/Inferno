import { Router } from 'express';
import { validate } from '../../../middleware/validate.middleware.js';
import { authenticate, authorize } from '../../../middleware/auth.middleware.js';
import { aiEstimateInputSchema, aiApplyInputSchema } from '../../../domain/ai/dto.js';
import * as AiController from '../controllers/ai.controller.js';

/**
 * @openapi
 * tags:
 *   - name: AI Estimation
 *     description: Natural-language furniture estimation (admin + designer, per RBAC §9)
 */

const router = Router();

/**
 * @openapi
 * /ai/estimate:
 *   post:
 *     tags: [AI Estimation]
 *     summary: Turn a natural-language request into a validated furniture suggestion
 *     description: |
 *       Dispatches to the provider configured by `AI_PROVIDER` (default `mock`). Provider
 *       timeouts / missing keys fall back to the deterministic mock, logged. Output is
 *       Zod-validated before it is returned.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt: { type: string, minLength: 3, maxLength: 2000, example: "I need a modular kitchen." }
 *     responses:
 *       200:
 *         description: Estimate generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Estimate generated }
 *                 data:
 *                   type: object
 *                   properties:
 *                     provider: { type: string, enum: [mock, openai, anthropic, gemini] }
 *                     suggestion:
 *                       type: object
 *                       properties:
 *                         summary: { type: string }
 *                         rooms:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name: { type: string }
 *                               width: { type: number }
 *                               length: { type: number }
 *                               height: { type: number }
 *                               furniture: { type: array, items: { type: object } }
 *       400:
 *         description: Invalid prompt or malformed provider output
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (sales/client)
 */
router.post(
  '/ai/estimate',
  authenticate,
  authorize('admin', 'designer'),
  validate({ body: aiEstimateInputSchema }),
  AiController.estimate
);

/**
 * @openapi
 * /ai/apply:
 *   post:
 *     tags: [AI Estimation]
 *     summary: Materialize a suggestion into a project (rooms + furniture)
 *     description: |
 *       Re-validates the suggestion, verifies the project exists, persists Room and
 *       Furniture documents, and (when `measure: true`) runs the measurement engine over
 *       the persisted furniture to seed the cost pipeline.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId, suggestion]
 *             properties:
 *               projectId: { type: string, description: ObjectId of an existing project }
 *               measure: { type: boolean, default: false }
 *               suggestion:
 *                 type: object
 *                 required: [summary, rooms]
 *                 properties:
 *                   summary: { type: string }
 *                   rooms: { type: array, items: { type: object } }
 *     responses:
 *       200:
 *         description: Suggestion applied
 *       400:
 *         description: Invalid suggestion or request
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (sales/client)
 *       404:
 *         description: Project not found
 */
router.post(
  '/ai/apply',
  authenticate,
  authorize('admin', 'designer'),
  validate({ body: aiApplyInputSchema }),
  AiController.apply
);

export default router;
