import { Router } from 'express';
import { validate } from '../../../middleware/validate.middleware.js';
import { authenticate, authorize } from '../../../middleware/auth.middleware.js';
import { materialSchema, materialUpdateSchema } from '../../../domain/materials/dto.js';
import * as MaterialController from '../controllers/material.controller.js';

/**
 * @openapi
 * tags:
 *   - name: Materials
 *     description: Material Master catalog (design §4.1)
 */

const router = Router();

/**
 * @openapi
 * /materials:
 *   get:
 *     tags: [Materials]
 *     summary: List materials
 *     description: Retrieve active materials in the catalog with pagination, filters, and sort options.
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
 *         name: category
 *         schema: { type: string, enum: [board, finish, hardware, countertop, other] }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search query matching name or SKU
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *         description: Field to sort by (e.g. "-purchaseRate" or "name")
 *     responses:
 *       200:
 *         description: List of materials retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/materials', authenticate, MaterialController.listMaterialsHandler);

/**
 * @openapi
 * /materials/{id}:
 *   get:
 *     tags: [Materials]
 *     summary: Get material by ID
 *     description: Retrieve a single active material by its identifier.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Material retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Material not found
 */
router.get('/materials/:id', authenticate, MaterialController.getMaterialByIdHandler);

/**
 * @openapi
 * /materials:
 *   post:
 *     tags: [Materials]
 *     summary: Create material
 *     description: Add a new material to the catalog. (Admin/Designer only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sku, name, category, type, unit, purchaseRate, sellingRate]
 *             properties:
 *               sku: { type: string, example: "BD-PLY-18" }
 *               name: { type: string, example: "18mm BWP Plywood" }
 *               category: { type: string, enum: [board, finish, hardware, countertop, other] }
 *               type: { type: string, example: "plywood" }
 *               brand: { type: string, example: "Greenply" }
 *               thickness: { type: number, example: 18 }
 *               sheetSize:
 *                 type: object
 *                 properties:
 *                   width: { type: number, example: 2440 }
 *                   height: { type: number, example: 1220 }
 *               unit: { type: string, enum: [sqft, sqm, rft, pc, set, sheet] }
 *               purchaseRate: { type: number, example: 2050 }
 *               sellingRate: { type: number, example: 2600 }
 *               gst: { type: number, example: 18 }
 *               supplier: { type: string, example: "Greenply" }
 *     responses:
 *       201:
 *         description: Material created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Material SKU already exists
 */
router.post(
  '/materials',
  authenticate,
  authorize('admin', 'designer'),
  validate({ body: materialSchema }),
  MaterialController.createMaterialHandler
);

/**
 * @openapi
 * /materials/{id}:
 *   put:
 *     tags: [Materials]
 *     summary: Update material
 *     description: Update an existing material in the catalog. (Admin/Designer only)
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
 *         description: Material updated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Material not found
 *       409:
 *         description: Material SKU already exists
 */
router.put(
  '/materials/:id',
  authenticate,
  authorize('admin', 'designer'),
  validate({ body: materialUpdateSchema }),
  MaterialController.updateMaterialHandler
);

/**
 * @openapi
 * /materials/{id}:
 *   delete:
 *     tags: [Materials]
 *     summary: Soft delete material
 *     description: Mark a material as deleted/inactive. (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Material deleted successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Material not found
 */
router.delete(
  '/materials/:id',
  authenticate,
  authorize('admin'),
  MaterialController.deleteMaterialHandler
);

export default router;
