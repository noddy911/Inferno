import { Router } from 'express';
import { validate } from '../../../middleware/validate.middleware.js';
import { authenticate, authorize } from '../../../middleware/auth.middleware.js';
import { settingsUpdateSchema } from '../../../domain/settings/dto.js';
import * as SettingsController from '../controllers/settings.controller.js';

/**
 * @openapi
 * tags:
 *   - name: Settings
 *     description: Single-company configuration consumed by every engine
 */

const router = Router();

/**
 * @openapi
 * /settings:
 *   get:
 *     tags: [Settings]
 *     summary: Get company settings (single-company singleton)
 *     description: Any authenticated role may read. Response is the full validated config.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Settings retrieved }
 *                 data:
 *                   type: object
 *                   properties:
 *                     companyName: { type: string }
 *                     gstNumber: { type: string }
 *                     currency: { type: string, enum: [INR] }
 *                     profitMargin: { type: number }
 *                     kerf: { type: number }
 *                     paymentTerms: { type: string }
 *                     warranty: { type: string }
 *       401:
 *         description: Authentication required
 */
router.get('/settings', authenticate, SettingsController.getSettingsHandler);

/**
 * @openapi
 * /settings:
 *   put:
 *     tags: [Settings]
 *     summary: Update company settings (admin only)
 *     description: |
 *       Partial update — at least one field required. Nested objects accept partial
 *       patches (e.g. `{ "labourRates": { "carpenter": 1500 } }`); sibling fields are
 *       preserved. Invalidates the read-through cache.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               companyName: { type: string, minLength: 1, maxLength: 120 }
 *               logo: { type: string, nullable: true }
 *               gstNumber: { type: string, maxLength: 20 }
 *               currency: { type: string, enum: [INR] }
 *               profitMargin: { type: number, minimum: 0, maximum: 100 }
 *               kerf: { type: number, minimum: 0 }
 *               labourRates:
 *                 type: object
 *                 properties:
 *                   carpenter: { type: number, minimum: 0 }
 *                   painter: { type: number, minimum: 0 }
 *                   electrician: { type: number, minimum: 0 }
 *                   plumber: { type: number, minimum: 0 }
 *                   helper: { type: number, minimum: 0 }
 *               paymentTerms: { type: string }
 *               warranty: { type: string }
 *     responses:
 *       200:
 *         description: Settings updated
 *       400:
 *         description: Validation failed (empty body, negative rates, unknown keys)
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (non-admin)
 */
router.put(
  '/settings',
  authenticate,
  authorize('admin'),
  validate({ body: settingsUpdateSchema }),
  SettingsController.updateSettingsHandler
);

export default router;
