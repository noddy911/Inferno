import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { validate } from '../../../middleware/validate.middleware.js';
import { authenticate, authorize } from '../../../middleware/auth.middleware.js';
import * as BoqController from '../controllers/boq.controller.js';

/**
 * @openapi
 * tags:
 *   - name: BOQ
 *     description: Bill of Quantities endpoints (design §7)
 */

const router = Router();

const generateBoqSchema = z.object({
  projectId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid Project ID',
  }),
});

const getBoqSchema = z.object({
  id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid BOQ ID',
  }),
});

/**
 * @openapi
 * /boq/generate:
 *   post:
 *     tags: [BOQ]
 *     summary: Generate BOQ
 *     description: Compile furniture list of a project into grouped, optimized material items. (Admin/Designer/Sales only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId]
 *             properties:
 *               projectId: { type: string, example: "6a6f2b00a4c906d7583f07ba" }
 *     responses:
 *       201:
 *         description: BOQ generated successfully
 */
router.post(
  '/boq/generate',
  authenticate,
  authorize('admin', 'designer', 'sales'),
  validate({ body: generateBoqSchema }),
  BoqController.generateBoqHandler
);

/**
 * @openapi
 * /boq/{id}:
 *   get:
 *     tags: [BOQ]
 *     summary: Fetch BOQ details
 *     description: Retrieve details of a generated BOQ document. (Admin/Designer/Sales only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: BOQ details retrieved
 */
router.get(
  '/boq/:id',
  authenticate,
  authorize('admin', 'designer', 'sales'),
  validate({ params: getBoqSchema }),
  BoqController.getBoqByIdHandler
);

/**
 * @openapi
 * /boq/{id}/export:
 *   get:
 *     tags: [BOQ]
 *     summary: Export BOQ spreadsheet
 *     description: Download BOQ items as an Excel file. (Admin/Designer/Sales only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: format
 *         required: true
 *         schema: { type: string, enum: [xlsx] }
 *     responses:
 *       200:
 *         description: Binary Excel file stream
 */
router.get(
  '/boq/:id/export',
  authenticate,
  authorize('admin', 'designer', 'sales'),
  validate({ params: getBoqSchema }),
  BoqController.exportBoqHandler
);

export default router;
