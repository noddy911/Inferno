/**
 * Cost Estimation Engine — pure domain service.
 *
 * Computes the four cost components (material, manufacturing, labour, additional) as
 * integer-paise line items, sums them into `totalCost`, then applies cost-plus pricing
 * (pricing.service.js). All rates come from Settings via the adapter; the engine stays
 * pure and can be driven by REST endpoints, CLI scripts, unit tests, or the AI assistant.
 */

import { toMinor } from '../../shared/money.js';
import { costInputSchema } from './dto.js';
import { computePricing } from './pricing.service.js';

export const MANUFACTURING_RATE_KEYS = ['cutting', 'cnc', 'drilling', 'assembly', 'painting', 'polishing'];
export const MANUFACTURING_UNITS = {
  cutting: 'sheet',
  cnc: 'sqft',
  drilling: 'hole',
  assembly: 'unit',
  painting: 'sqft',
  polishing: 'sqft',
};
export const MANUFACTURING_LABELS = {
  cutting: 'Cutting',
  cnc: 'CNC routing',
  drilling: 'Drilling',
  assembly: 'Assembly',
  painting: 'Painting',
  polishing: 'Polishing',
};

export const LABOUR_RATE_KEYS = ['carpenter', 'painter', 'electrician', 'plumber', 'helper'];
export const LABOUR_LABELS = {
  carpenter: 'Carpenter',
  painter: 'Painter',
  electrician: 'Electrician',
  plumber: 'Plumber',
  helper: 'Helper',
};

/** @param {import('./dto.js').CostInput} input @returns {import('./dto.js').CostBreakdown} */
export function computeCost(input) {
  const parsed = costInputSchema.parse(input);

  /** @type {import('./dto.js').MaterialCostLine[]} */
  const material = parsed.materialLines.map((l) => ({
    key: l.key,
    label: l.label,
    category: l.category ?? null,
    type: l.type ?? null,
    unit: l.unit,
    quantity: l.quantity,
    ratePaise: toMinor(l.rate),
    amountPaise: Math.round(l.quantity * l.rate * 100),
  }));
  const materialPaise = material.reduce((s, l) => s + l.amountPaise, 0);

  /** @type {import('./dto.js').CostLine[]} */
  const manufacturing = MANUFACTURING_RATE_KEYS.filter(
    (k) => parsed.manufacturingQuantities[k] > 0
  ).map((k) => {
    const qty = parsed.manufacturingQuantities[k];
    const rate = parsed.manufacturingRates[k];
    return {
      key: k,
      label: MANUFACTURING_LABELS[k],
      unit: MANUFACTURING_UNITS[k],
      quantity: qty,
      ratePaise: toMinor(rate),
      amountPaise: Math.round(qty * rate * 100),
    };
  });
  const manufacturingPaise = manufacturing.reduce((s, l) => s + l.amountPaise, 0);

  /** @type {import('./dto.js').CostLine[]} */
  const labour = LABOUR_RATE_KEYS.filter((k) => parsed.labourDays[k] > 0).map((k) => {
    const days = parsed.labourDays[k];
    const rate = parsed.labourRates[k];
    return {
      key: k,
      label: LABOUR_LABELS[k],
      unit: 'day',
      quantity: days,
      ratePaise: toMinor(rate),
      amountPaise: Math.round(days * rate * 100),
    };
  });
  const labourPaise = labour.reduce((s, l) => s + l.amountPaise, 0);

  const productionPaise = materialPaise + manufacturingPaise + labourPaise;

  /** @type {import('./dto.js').AdditionalCostLine[]} */
  const additional = parsed.additionalCharges.map((c) => {
    const amountPaise =
      c.type === 'flat' ? toMinor(c.value) : Math.round((productionPaise * c.value) / 100);
    return {
      key: c.key,
      label: c.label,
      type: c.type,
      value: c.value,
      basePaise: c.type === 'percent' ? productionPaise : null,
      amountPaise,
    };
  });
  const additionalPaise = additional.reduce((s, l) => s + l.amountPaise, 0);

  return {
    lines: { material, manufacturing, labour, additional },
    totals: {
      materialPaise,
      manufacturingPaise,
      labourPaise,
      additionalPaise,
      costPaise: materialPaise + manufacturingPaise + labourPaise + additionalPaise,
    },
  };
}

/**
 * Full estimate: cost breakdown + pricing.
 * @param {import('./dto.js').CostInput} input
 * @returns {import('./dto.js').CostEstimate}
 */
export function estimateCost(input) {
  const parsed = costInputSchema.parse(input);
  const breakdown = computeCost(parsed);
  const pricing = computePricing({
    totalCostPaise: breakdown.totals.costPaise,
    profitMarginPercent: parsed.profitMargin,
    outputGstRatePercent: parsed.outputGstRate,
    discount: parsed.discount,
  });
  return { currency: 'INR', ...breakdown, pricing };
}

/**
 * Simple labour-days heuristic (design §5.4): carpenter ≈ board area / 25 sqm per day,
 * painter ≈ area / 50, helper ≈ 1.5× carpenter, one electrician when any furniture is
 * being installed. The caller may override with explicit `labourDays` — this is a
 * configurable default, not a rule.
 * @param {{materialAreaSqm: number, furnitureUnits?: number}} args
 * @returns {import('./dto.js').LabourDays}
 */
export function deriveLabourDays({ materialAreaSqm, furnitureUnits = 0 }) {
  const area = Math.max(0, materialAreaSqm);
  const carpenter = Math.ceil(area / 25);
  const painter = Math.ceil(area / 50);
  return {
    carpenter,
    painter,
    electrician: furnitureUnits > 0 ? 1 : 0,
    plumber: 0,
    helper: Math.ceil(carpenter * 1.5),
  };
}
