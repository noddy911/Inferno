import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { validate } from '../../../middleware/validate.middleware.js';
import { authenticate, authorize } from '../../../middleware/auth.middleware.js';
import * as ReportController from '../controllers/report.controller.js';

/**
 * @openapi
 * tags:
 *   - name: Reports
 *     description: Financial, material, and labor analytics (design §7)
 */

const router = Router();

const reportParamsSchema = z.object({
  type: z.enum(['sales', 'profit', 'labour', 'material', 'client', 'project']),
});

const reportQuerySchema = z.object({
  from: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .transform((val) => new Date(val))
    .optional(),
  to: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .transform((val) => new Date(val))
    .optional(),
  groupBy: z.enum(['month', 'none']).default('month'),
  clientId: z
    .string()
    .refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: 'Invalid Client ID',
    })
    .optional(),
  projectId: z
    .string()
    .refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: 'Invalid Project ID',
    })
    .optional(),
});

// Role checking helper per report type matrix (design §9)
const authorizeReportRole = (req, res, next) => {
  const { type } = req.params;
  const { role } = req.user;

  if (role === 'admin') return next();

  if (type === 'material' || type === 'project') {
    if (role === 'designer') return next();
  } else if (type === 'sales' || type === 'client') {
    if (role === 'sales') return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Insufficient permissions to view this report type.',
  });
};

/**
 * @openapi
 * /reports/{type}:
 *   get:
 *     tags: [Reports]
 *     summary: Fetch report statistics
 *     description: |
 *       Get computed metrics and detail rows for a report type.
 *       Enforces the RBAC matrix (Admin: all, Designer: material/project, Sales: sales/client).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [sales, profit, labour, material, client, project] }
 *       - in: query
 *         name: from
 *         schema: { type: string }
 *         description: Start date (YYYY-MM-DD or ISO)
 *       - in: query
 *         name: to
 *         schema: { type: string }
 *         description: End date (YYYY-MM-DD or ISO)
 *       - in: query
 *         name: groupBy
 *         schema: { type: string, enum: [month, none] }
 *       - in: query
 *         name: clientId
 *         schema: { type: string }
 *       - in: query
 *         name: projectId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Report computed successfully
 */
router.get(
  '/reports/:type',
  authenticate,
  validate({ params: reportParamsSchema, query: reportQuerySchema }),
  authorizeReportRole,
  ReportController.getReportHandler
);

/**
 * @openapi
 * /reports/{type}/export:
 *   get:
 *     tags: [Reports]
 *     summary: Export report workbook
 *     description: Download report details as an Excel workbook. (RBAC matching report types)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [sales, profit, labour, material, client, project] }
 *       - in: query
 *         name: format
 *         required: true
 *         schema: { type: string, enum: [xlsx] }
 *       - in: query
 *         name: from
 *         schema: { type: string }
 *       - in: query
 *         name: to
 *         schema: { type: string }
 *       - in: query
 *         name: groupBy
 *         schema: { type: string, enum: [month, none] }
 *       - in: query
 *         name: clientId
 *         schema: { type: string }
 *       - in: query
 *         name: projectId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Binary Excel file stream
 */
router.get(
  '/reports/:type/export',
  authenticate,
  validate({ params: reportParamsSchema, query: reportQuerySchema }),
  authorizeReportRole,
  ReportController.exportReportHandler
);

export default router;
