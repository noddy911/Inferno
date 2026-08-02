/**
 * Settings DTOs — the single-company configuration surface (design §4.4).
 *
 * This is the source of truth for the *validated config shape* shared by REST, the
 * read-through cache, CLI scripts and tests. The Mongoose model mirrors it for
 * persistence; engines consume the config as plain objects.
 *
 * Money/rates are stored as numbers (₹), not paise — rates feed the costing adapter
 * which converts to minor units internally. All numeric rates are ≥ 0; percentages
 * (gst, profitMargin) are 0–100.
 */

import { z } from 'zod';
import { quotationNumberingSchema } from '../quotation/dto.js';

const taxesShape = z.object({
  outputGstRate: z.number().min(0).max(100),
});

const sheetSizeSchema = z.object({
  key: z.string().trim().min(1).max(10),
  width: z.number().min(1),
  height: z.number().min(1),
  rate: z.number().min(0).default(0),
});

const labourRatesShape = z.object({
  carpenter: z.number().min(0),
  painter: z.number().min(0),
  electrician: z.number().min(0),
  plumber: z.number().min(0),
  helper: z.number().min(0),
});

const manufacturingRatesShape = z.object({
  cutting: z.number().min(0),
  cnc: z.number().min(0),
  drilling: z.number().min(0),
  assembly: z.number().min(0),
  painting: z.number().min(0),
  polishing: z.number().min(0),
});

const additionalChargesShape = z.object({
  transport: z.number().min(0),
  packaging: z.number().min(0),
  installation: z.number().min(0),
  misc: z.number().min(0),
});

const DEFAULT_SHEET_SIZES = [
  { key: '8x4', width: 2440, height: 1220, rate: 0 },
  { key: '9x4', width: 2745, height: 1220, rate: 0 },
  { key: '10x4', width: 3050, height: 1220, rate: 0 },
];

/**
 * Full validated company settings (every field present, with defaults where sensible).
 * Validates a complete config object; `parse({})` yields the default singleton.
 */
export const settingsSchema = z.object({
  companyName: z.string().trim().min(1).max(120),
  logo: z.string().nullable().default(null),
  gstNumber: z.string().trim().max(20).default(''),
  currency: z.enum(['INR']).default('INR'),
  taxes: taxesShape.default({ outputGstRate: 18 }),
  profitMargin: z.number().min(0).max(100).default(25),
  sheetSizes: z.array(sheetSizeSchema).min(1).default(DEFAULT_SHEET_SIZES),
  kerf: z.number().min(0).default(3),
  labourRates: labourRatesShape.default({ carpenter: 0, painter: 0, electrician: 0, plumber: 0, helper: 0 }),
  manufacturingRates: manufacturingRatesShape.default({
    cutting: 0, cnc: 0, drilling: 0, assembly: 0, painting: 0, polishing: 0,
  }),
  additionalCharges: additionalChargesShape.default({ transport: 0, packaging: 0, installation: 0, misc: 0 }),
  paymentTerms: z.string().default(''),
  warranty: z.string().default(''),
  quotationNumbering: quotationNumberingSchema.default({
    prefix: 'QTN',
    format: '{prefix}-{year}-{seq}',
    seqPadding: 4,
    startFrom: 1,
  }),
});

/**
 * Partial update surface for `PUT /settings`. Every field is optional and nested
 * objects accept partial patches (e.g. `{ labourRates: { carpenter: 1500 } }`). At
 * least one top-level key is required — an empty body is rejected. Unknown keys are
 * stripped (zod default), never persisted.
 */
export const settingsUpdateSchema = z
  .object({
    companyName: z.string().trim().min(1).max(120).optional(),
    logo: z.string().nullable().optional(),
    gstNumber: z.string().trim().max(20).optional(),
    currency: z.enum(['INR']).optional(),
    taxes: taxesShape.partial().optional(),
    profitMargin: z.number().min(0).max(100).optional(),
    sheetSizes: z.array(sheetSizeSchema).min(1).optional(),
    kerf: z.number().min(0).optional(),
    labourRates: labourRatesShape.partial().optional(),
    manufacturingRates: manufacturingRatesShape.partial().optional(),
    additionalCharges: additionalChargesShape.partial().optional(),
    paymentTerms: z.string().optional(),
    warranty: z.string().optional(),
    // Full object required when present: numbering has cross-field invariants
    // (format must include {seq}, tokens must be known) validated by the shared schema.
    quotationNumbering: quotationNumberingSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one settings field is required',
    path: ['body'],
  });

/**
 * @typedef {z.infer<typeof settingsSchema>} CompanySettings
 * @typedef {z.infer<typeof settingsUpdateSchema>} CompanySettingsUpdate
 */
