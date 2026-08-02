/**
 * Reports DTOs.
 *
 * Reports are computed on demand from persisted `quotations` + `boq` documents — never
 * stored (design §7, deviation #5). `report.aggregators.js` holds pure functions over
 * normalized row arrays (money in integer paise); the persistence adapter loads + normalizes
 * DB docs into those rows, and the exporter renders the result to Excel.
 *
 * Money is paise in every aggregator; only the exporter converts to display rupees.
 */

import { z } from 'zod';

/**
 * from/to are inclusive Date bounds — on `issuedAt` for quotation reports, on the BOQ
 * `generatedAt` for the material report.
 */
export const reportFiltersSchema = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
  /** `month` buckets into calendar months (empty months in range are filled with zeros). */
  groupBy: z.enum(['month', 'none']).default('month'),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  /** Statuses included; defaults to confirmed business (see DEFAULT_REPORT_STATUSES). */
  statuses: z.array(z.string()).optional(),
});

export const REPORT_TYPES = Object.freeze([
  'sales',
  'profit',
  'labour',
  'material',
  'client',
  'project',
]);

/** Statuses counted by default: issued (sent) + confirmed (accepted), not drafts/revisions. */
export const DEFAULT_REPORT_STATUSES = Object.freeze(['sent', 'accepted']);

/**
 * @typedef {object} QuotationReportRow  (paise; produced by the persistence adapter)
 * @property {string} quotationId
 * @property {string} quotationNumber
 * @property {string} projectId
 * @property {string} clientId
 * @property {string} status
 * @property {Date} issuedAt
 * @property {object} summary
 * @property {number} summary.subtotalPaise
 * @property {number} summary.discountPaise
 * @property {number} summary.taxablePaise
 * @property {number} summary.gstPaise
 * @property {number} summary.totalPaise
 * @property {object} totals
 * @property {number} totals.totalCostPaise
 * @property {number} totals.marginBasePaise
 * @property {number} totals.profitPaise
 * @property {object} costs
 * @property {number} costs.materialPaise
 * @property {number} costs.manufacturingPaise
 * @property {number} costs.labourPaise
 * @property {number} costs.additionalPaise
 * @property {Record<string, number>} costs.labourByTradePaise
 */

/**
 * @typedef {object} BoqReportRow  (paise; one per BOQ line, for the material report)
 * @property {Date} date generatedAt of the BOQ document
 * @property {string} materialId
 * @property {string} materialName
 * @property {string|null} category
 * @property {string|null} type
 * @property {string} unit
 * @property {number} quantity
 * @property {number} wasteQty
 * @property {number} totalQty
 * @property {number} ratePaise
 * @property {number} amountPaise
 */

/**
 * @typedef {object} ReportResult
 * @property {'sales'|'profit'|'labour'|'material'|'client'|'project'} type
 * @property {Date} [from]
 * @property {Date} [to]
 * @property {'month'|'none'} [groupBy] sales only
 * @property {string} [clientId] client report only
 * @property {string} [projectId] project report only
 * @property {object} total per-report totals (paise)
 * @property {object[]} rows per-report detail rows (paise)
 */
