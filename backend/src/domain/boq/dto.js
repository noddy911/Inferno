/**
 * Bill of Quantities (BOQ) DTOs.
 *
 * The engine is pure and stateless: `buildBoq(input)` → grouped line items, one line per
 * material with `totalQty = quantity + wasteQty`, priced at the material's rate. The
 * adapter supplies material lines already resolved to rates and waste quantities (from the
 * cutting engine: extra sheets / cut-off scrap); the engine only groups, sums, and prices —
 * it never computes waste itself.
 *
 * Money is integer paise inside the engine (shared/money.js); `rate`/`amount` are the 2-dp
 * display forms. `totalQty` is exact (decimal) — quantities like sqft legitimately carry
 * fractions, so no rounding happens on quantities, only on the final amount per line.
 */

import { z } from 'zod';

/**
 * Provenance of a line — which project/room/furniture/panel produced it. Purely
 * diagnostic: carried through to `BOQ_RATE_CONFLICT` error details for logging and the
 * frontend error panel. Never part of the BOQ output.
 */
export const boqSourceSchema = z.object({
  projectId: z.string().optional(),
  roomId: z.string().optional(),
  furnitureId: z.string().optional(),
  panel: z.string().optional(), // panel name/label that generated the line
});

/**
 * One material line entering the BOQ. `wasteQty` defaults to 0 so a plain cost breakdown
 * maps directly onto a BOQ. `source` is optional diagnostic provenance (see
 * `boqSourceSchema`).
 */
export const boqLineInputSchema = z.object({
  materialId: z.string().min(1).max(60),
  name: z.string().min(1).max(120),
  category: z.string().max(40).optional(),
  type: z.string().max(60).optional(),
  unit: z.string().min(1).max(20),
  quantity: z.number().nonnegative(),
  wasteQty: z.number().nonnegative().default(0),
  rate: z.number().nonnegative(), // ₹ per unit
  source: boqSourceSchema.optional(),
});

export const boqInputSchema = z.object({
  items: z.array(boqLineInputSchema).default([]),
  currency: z.string().min(3).max(3).default('INR'),
});

/**
 * @typedef {z.infer<typeof boqSourceSchema>} BoqSource
 * @typedef {z.infer<typeof boqLineInputSchema>} BoqLineInput
 * @typedef {z.infer<typeof boqInputSchema>} BoqInput
 */

/**
 * A grouped, priced BOQ line (amounts in paise).
 * @typedef {object} BoqLine
 * @property {string} materialId
 * @property {string} name
 * @property {string|null} category
 * @property {string|null} type
 * @property {string} unit
 * @property {number} quantity useful quantity, exact decimal
 * @property {number} wasteQty waste quantity (cut-off scrap, extra sheets), exact decimal
 * @property {number} totalQty quantity + wasteQty
 * @property {number} rate ₹ per unit (2 dp)
 * @property {number} ratePaise rate in paise
 * @property {number} amount totalQty × rate, ₹ (2 dp)
 * @property {number} amountPaise amount in paise (single round-half-up on the line)
 */

/**
 * @typedef {object} BoqTotals
 * @property {number} lineCount number of grouped lines
 * @property {number} amountPaise Σ line amounts, paise
 * @property {number} amount ₹ (2 dp)
 */

/**
 * @typedef {object} BoqResult
 * @property {string} currency
 * @property {BoqLine[]} items
 * @property {BoqTotals} totals
 * @property {boolean} empty true when the input had no items
 * @property {string[]} notes human notes (e.g. "no items" notice), empty unless needed
 */
