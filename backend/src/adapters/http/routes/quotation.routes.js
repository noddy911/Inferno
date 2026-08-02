import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { validate } from '../../../middleware/validate.middleware.js';
import { authenticate, authorize } from '../../../middleware/auth.middleware.js';
import { discountSchema } from '../../../domain/costing/dto.js';
import * as QuotationController from '../controllers/quotation.controller.js';

/**
 * @openapi
 * tags:
 *   - name: Quotations
 *     description: Quotation workflows and PDF generation (design §7)
 */

const router = Router();

const generateQuotationSchema = z.object({
  projectId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid Project ID',
  }),
  discount: discountSchema.optional(),
  paymentTerms: z.string().optional(),
  warranty: z.string().optional(),
  notes: z.string().optional(),
  validUntilDays: z.number().int().positive().max(365).optional(),
});

const updateQuotationSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'revised']).optional(),
  paymentTerms: z.string().optional(),
  warranty: z.string().optional(),
  notes: z.string().optional(),
  discount: discountSchema.optional(),
});

const getQuotationSchema = z.object({
  id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid Quotation ID',
  }),
});

/**
 * @openapi
 * /quotations/generate:
 *   post:
 *     tags: [Quotations]
 *     summary: Generate quotation
 *     description: Run the estimation pipeline and persist quotation + BOQ. (Admin/Designer/Sales only)
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
 *               discount:
 *                 type: object
 *                 properties:
 *                   type: { type: string, enum: [flat, percent] }
 *                   value: { type: number }
 *     responses:
 *       201:
 *         description: Quotation generated
 */
router.post(
  '/quotations/generate',
  authenticate,
  authorize('admin', 'designer', 'sales'),
  validate({ body: generateQuotationSchema }),
  QuotationController.generateQuotationHandler
);

/**
 * @openapi
 * /quotations:
 *   get:
 *     tags: [Quotations]
 *     summary: List quotations
 *     description: Search or browse quotations. (Admin/Designer/Sales only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, sent, accepted, rejected, revised] }
 *       - in: query
 *         name: clientId
 *         schema: { type: string }
 *       - in: query
 *         name: projectId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of quotations retrieved
 */
router.get(
  '/quotations',
  authenticate,
  authorize('admin', 'designer', 'sales'),
  QuotationController.listQuotationsHandler
);

/**
 * @openapi
 * /quotations/{id}:
 *   get:
 *     tags: [Quotations]
 *     summary: Get quotation details
 *     description: Fetch details of a single quotation. (Admin/Designer/Sales only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Quotation details retrieved
 */
router.get(
  '/quotations/:id',
  authenticate,
  authorize('admin', 'designer', 'sales'),
  validate({ params: getQuotationSchema }),
  QuotationController.getQuotationByIdHandler
);

/**
 * @openapi
 * /quotations/{id}:
 *   put:
 *     tags: [Quotations]
 *     summary: Update quotation
 *     description: Update status or fields. Recalculation of pricing allowed only in draft status. (Admin/Designer/Sales only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Quotation updated successfully
 */
router.put(
  '/quotations/:id',
  authenticate,
  authorize('admin', 'designer', 'sales'),
  validate({ params: getQuotationSchema, body: updateQuotationSchema }),
  QuotationController.updateQuotationHandler
);

/**
 * @openapi
 * /quotations/{id}:
 *   delete:
 *     tags: [Quotations]
 *     summary: Delete quotation
 *     description: Remove a draft or rejected quotation and its associated BOQ. (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Quotation and BOQ deleted
 */
router.delete(
  '/quotations/:id',
  authenticate,
  authorize('admin'),
  validate({ params: getQuotationSchema }),
  QuotationController.deleteQuotationHandler
);

/**
 * @openapi
 * /quotations/{id}/pdf:
 *   get:
 *     tags: [Quotations]
 *     summary: Download quotation PDF
 *     description: Stream or download the PDF version of a quotation. (Admin/Designer/Sales only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Binary PDF file stream
 */
router.get(
  '/quotations/:id/pdf',
  authenticate,
  authorize('admin', 'designer', 'sales'),
  validate({ params: getQuotationSchema }),
  QuotationController.downloadQuotationPdfHandler
);

export default router;
