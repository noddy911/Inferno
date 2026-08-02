/**
 * Quotation DTOs.
 *
 * The quotation is the *snapshotted* output of the estimation pipeline: it freezes the
 * pricing, the per-room totals, and the BOQ line items at generate time, so later material
 * price changes never mutate a historical quotation. `buildQuotation(input)` is pure;
 * numbering (configurable via Settings) and persistence are adapter concerns.
 *
 * Money is integer paise inside the engine. The persistence layer converts to the 2-dp
 * rupee fields of the `quotations` collection at write.
 */

import { z } from 'zod';

/**
 * Configurable quotation numbering (from Settings.quotationNumbering, design §4.4).
 * `format` uses the tokens `{prefix}`, `{year}`, `{seq}` — e.g. `QTN-2026-0001`.
 */
export const quotationNumberingSchema = z
  .object({
    prefix: z.string().trim().min(1).max(10).regex(/^[A-Z0-9-]+$/i),
    format: z.string().trim().min(1).max(60),
    seqPadding: z.number().int().min(1).max(12).default(4),
    startFrom: z.number().int().min(1).default(1),
  })
  .refine((n) => n.format.includes('{seq}'), {
    message: 'format must include the {seq} token (e.g. "{prefix}-{year}-{seq}")',
    path: ['format'],
  })
  .refine((n) => {
    const tokens = [...n.format.matchAll(/\{([a-z]+)\}/g)].map((m) => m[1]);
    return tokens.every((t) => ['prefix', 'year', 'seq'].includes(t));
  }, {
    message: 'format contains an unknown token (allowed: {prefix}, {year}, {seq})',
    path: ['format'],
  });

/** Per-room priced total, for the quotation PDF (no recomputation needed at render). */
export const roomTotalSchema = z.object({
  roomId: z.string().min(1),
  name: z.string().min(1),
  roomTotalPaise: z.number().nonnegative(),
});

export const quotationConfigSchema = z.object({
  paymentTerms: z.string().max(500).default(''),
  warranty: z.string().max(500).default(''),
  notes: z.string().max(2000).default(''),
  validUntilDays: z.number().int().min(1).max(365).default(30),
  signatureUrl: z.string().url().max(500).optional(),
  issuedAt: z.date().optional(), // quoted date; drives the year in the number + validUntil
  revisionOf: z.string().nullable().optional(), // parent quotation for a revision (new doc + new number)
});

/**
 * Pricing block as produced by `domain/costing/pricing.service.js` (all paise).
 */
const pricingInputSchema = z.object({
  profitMarginPercent: z.number().nonnegative(),
  marginBasePaise: z.number().nonnegative(),
  discount: z
    .object({
      type: z.enum(['flat', 'percent']),
      value: z.number().nonnegative(),
      amountPaise: z.number().nonnegative(),
    })
    .nullable()
    .optional(),
  taxablePaise: z.number().nonnegative(),
  outputGstRatePercent: z.number().nonnegative(),
  gstPaise: z.number().nonnegative(),
  totalPaise: z.number().nonnegative(),
  profitPaise: z.number().nonnegative(),
  profitPercent: z.number(),
});

/**
 * Cost breakdown snapshot (paise), carried for reports (design §7 labour/material/profit):
 * the four cost components + the per-trade labour split, frozen at generate time.
 */
export const quotationCostsSchema = z.object({
  materialPaise: z.number().nonnegative().default(0),
  manufacturingPaise: z.number().nonnegative().default(0),
  labourPaise: z.number().nonnegative().default(0),
  additionalPaise: z.number().nonnegative().default(0),
  labourByTradePaise: z.record(z.string(), z.number().nonnegative()).default({}),
});

/** BOQ line snapshot (subset of `domain/boq` output lines). */
export const quotationItemSchema = z.object({
  materialId: z.string().min(1),
  name: z.string().min(1),
  category: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  unit: z.string().min(1),
  quantity: z.number().nonnegative(),
  wasteQty: z.number().nonnegative(),
  totalQty: z.number().nonnegative(),
  rate: z.number().nonnegative(), // ₹ display
  amountPaise: z.number().nonnegative(),
});

export const quotationInputSchema = z.object({
  projectId: z.string().min(1),
  clientId: z.string().min(1),
  currency: z.string().min(3).max(3).default('INR'),
  pricing: pricingInputSchema,
  costPaise: z.number().nonnegative(), // totals.costPaise from the costing engine
  items: z.array(quotationItemSchema).default([]),
  rooms: z.array(roomTotalSchema).default([]),
  costs: quotationCostsSchema.default({}),
  config: quotationConfigSchema.default({}),
});

/**
 * @typedef {z.infer<typeof quotationNumberingSchema>} QuotationNumbering
 * @typedef {z.infer<typeof roomTotalSchema>} RoomTotal
 * @typedef {z.infer<typeof quotationConfigSchema>} QuotationConfig
 * @typedef {z.infer<typeof quotationItemSchema>} QuotationItem
 * @typedef {z.infer<typeof quotationInputSchema>} QuotationInput
 */

/**
 * A built quotation — complete pricing snapshot, ready to number + persist.
 * @typedef {object} QuotationResult
 * @property {string|null} quotationNumber assigned by the numbering adapter; null until then
 * @property {string} projectId
 * @property {string} clientId
 * @property {string} currency
 * @property {string} status always 'draft' on build
 * @property {object} summary
 * @property {number} summary.subtotalPaise pre-discount total (marginBase)
 * @property {'flat'|'percent'|null} summary.discountType
 * @property {number} summary.discountValue
 * @property {number} summary.discountPaise
 * @property {number} summary.taxablePaise
 * @property {number} summary.outputGstRatePercent
 * @property {number} summary.gstPaise
 * @property {number} summary.totalPaise
 * @property {object} totals
 * @property {number} totals.totalCostPaise
 * @property {number} totals.marginBasePaise
 * @property {number} totals.profitPaise
 * @property {number} totals.profitPercent
 * @property {number} totals.profitMarginPercent
 * @property {RoomTotal[]} rooms
 * @property {QuotationItem[]} items snapshotted BOQ lines
 * @property {object} costs cost-component snapshot (material/manufacturing/labour/
 *   additional + per-trade labour split, all paise) — feeds the reports engine
 * @property {string} paymentTerms
 * @property {string} warranty
 * @property {string} notes
 * @property {string|null} signatureUrl
 * @property {Date} issuedAt
 * @property {Date} validUntil
 * @property {string|null} revisionOf
 * @property {boolean} empty true when the estimate had no items (zero-total quotation)
 */
