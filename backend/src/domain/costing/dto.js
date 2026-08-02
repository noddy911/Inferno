/**
 * Cost Estimation Engine DTOs.
 *
 * The engine is pure and stateless: `estimateCost(input)` → full line-item breakdown +
 * cost-plus pricing. All rates/quantities are provided inline; the adapter resolves
 * `materialId` → MaterialPrice DTOs and Settings → rates when the call comes from a
 * persisted project (design §5.4). Money is integer paise inside the engines.
 *
 * Cost components:
 *   1. Material     = Σ(quantity × purchaseRate)  — quantities already in the right unit
 *      (sheets after cutting, sqft for laminate/glass, pc for hardware, rft for countertop).
 *   2. Manufacturing = Σ(operation rate × quantity) — cutting/sheet, CNC/sqft, drilling/hole,
 *      assembly/unit, painting/sqft, polishing/sqft.
 *   3. Labour       = Σ(labour rate/day × days) — carpenter, painter, electrician, plumber, helper.
 *   4. Additional   = flat ₹ or % of (1+2+3) per charge.
 */

import { z } from 'zod';

/** One material line: quantity in the pricing unit × purchase rate. */
export const materialLineSchema = z.object({
  key: z.string().min(1).max(60),
  label: z.string().min(1).max(120),
  category: z.string().max(40).optional(),
  type: z.string().max(60).optional(),
  unit: z.string().min(1).max(20),
  quantity: z.number().nonnegative(),
  rate: z.number().nonnegative(),
});

const rateField = z.number().nonnegative();

/**
 * Default rate catalogue — mirrors the seeded Settings singleton (design §4.4). Used as
 * parent-level schema defaults so a partial/omitted object still yields every key.
 */
export const DEFAULT_MANUFACTURING_RATES = Object.freeze({
  cutting: 150,
  cnc: 60,
  drilling: 8,
  assembly: 250,
  painting: 45,
  polishing: 20,
});

export const DEFAULT_MANUFACTURING_QUANTITIES = Object.freeze({
  cutting: 0,
  cnc: 0,
  drilling: 0,
  assembly: 0,
  painting: 0,
  polishing: 0,
});

export const DEFAULT_LABOUR_RATES = Object.freeze({
  carpenter: 1200,
  painter: 900,
  electrician: 1000,
  plumber: 1000,
  helper: 600,
});

export const DEFAULT_LABOUR_DAYS = Object.freeze({
  carpenter: 0,
  painter: 0,
  electrician: 0,
  plumber: 0,
  helper: 0,
});

export const manufacturingRatesSchema = z.object({
  cutting: rateField.default(150), // ₹ / sheet
  cnc: rateField.default(60), // ₹ / sqft
  drilling: rateField.default(8), // ₹ / hole
  assembly: rateField.default(250), // ₹ / unit
  painting: rateField.default(45), // ₹ / sqft
  polishing: rateField.default(20), // ₹ / sqft
});

export const manufacturingQuantitiesSchema = z.object({
  cutting: z.number().nonnegative().default(0),
  cnc: z.number().nonnegative().default(0),
  drilling: z.number().nonnegative().default(0),
  assembly: z.number().nonnegative().default(0),
  painting: z.number().nonnegative().default(0),
  polishing: z.number().nonnegative().default(0),
});

export const labourRatesSchema = z.object({
  carpenter: rateField.default(1200), // ₹ / day
  painter: rateField.default(900),
  electrician: rateField.default(1000),
  plumber: rateField.default(1000),
  helper: rateField.default(600),
});

export const labourDaysSchema = z.object({
  carpenter: z.number().nonnegative().default(0),
  painter: z.number().nonnegative().default(0),
  electrician: z.number().nonnegative().default(0),
  plumber: z.number().nonnegative().default(0),
  helper: z.number().nonnegative().default(0),
});

/** An additional charge: flat ₹ or % of the production subtotal (material+mfg+labour). */
export const additionalChargeSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  type: z.enum(['flat', 'percent']),
  value: z.number().nonnegative(),
});

/** A discount applied to `marginBase` BEFORE GST. */
export const discountSchema = z.object({
  type: z.enum(['flat', 'percent']),
  value: z.number().nonnegative(),
});

export const costInputSchema = z.object({
  materialLines: z.array(materialLineSchema).default([]),
  manufacturingRates: manufacturingRatesSchema.default(DEFAULT_MANUFACTURING_RATES),
  manufacturingQuantities: manufacturingQuantitiesSchema.default(DEFAULT_MANUFACTURING_QUANTITIES),
  labourRates: labourRatesSchema.default(DEFAULT_LABOUR_RATES),
  labourDays: labourDaysSchema.default(DEFAULT_LABOUR_DAYS),
  additionalCharges: z.array(additionalChargeSchema).default([]),
  profitMargin: z.number().nonnegative().default(25), // percent, bounds enforced in pricing
  outputGstRate: z.number().nonnegative().default(18), // percent, bounds enforced in pricing
  discount: discountSchema.optional(),
});

/**
 * @typedef {z.infer<typeof materialLineSchema>} MaterialLine
 * @typedef {z.infer<typeof manufacturingRatesSchema>} ManufacturingRates
 * @typedef {z.infer<typeof manufacturingQuantitiesSchema>} ManufacturingQuantities
 * @typedef {z.infer<typeof labourRatesSchema>} LabourRates
 * @typedef {z.infer<typeof labourDaysSchema>} LabourDays
 * @typedef {z.infer<typeof additionalChargeSchema>} AdditionalCharge
 * @typedef {z.infer<typeof discountSchema>} Discount
 * @typedef {z.infer<typeof costInputSchema>} CostInput
 */

/**
 * A resolved material line in the output (amounts in paise).
 * @typedef {object} MaterialCostLine
 * @property {string} key
 * @property {string} label
 * @property {string|null} category
 * @property {string|null} type
 * @property {string} unit
 * @property {number} quantity
 * @property {number} ratePaise
 * @property {number} amountPaise
 */

/**
 * @typedef {object} CostLine
 * @property {string} key
 * @property {string} label
 * @property {string} unit
 * @property {number} quantity
 * @property {number} ratePaise
 * @property {number} amountPaise
 */

/**
 * @typedef {object} AdditionalCostLine
 * @property {string} key
 * @property {string} label
 * @property {'flat'|'percent'} type
 * @property {number} value
 * @property {number|null} basePaise production subtotal for % charges, else null
 * @property {number} amountPaise
 */

/**
 * @typedef {object} CostBreakdown
 * @property {{material: MaterialCostLine[], manufacturing: CostLine[], labour: CostLine[], additional: AdditionalCostLine[]}} lines
 * @property {object} totals
 * @property {number} totals.materialPaise
 * @property {number} totals.manufacturingPaise
 * @property {number} totals.labourPaise
 * @property {number} totals.additionalPaise
 * @property {number} totals.costPaise
 */

/**
 * @typedef {object} PricingResult
 * @property {number} profitMarginPercent
 * @property {number} marginBasePaise cost × (1 + margin%)
 * @property {{type:'flat'|'percent', value:number, amountPaise:number}|null} discount
 * @property {number} taxablePaise marginBase − discount
 * @property {number} outputGstRatePercent
 * @property {number} gstPaise taxable × gst%
 * @property {number} totalPaise taxable + gst
 * @property {number} profitPaise marginBase − totalCost
 * @property {number} profitPercent profit as % of totalCost
 */

/**
 * @typedef {object} CostEstimate
 * @property {string} currency
 * @property {CostBreakdown['lines']} lines
 * @property {CostBreakdown['totals']} totals
 * @property {PricingResult} pricing
 */
