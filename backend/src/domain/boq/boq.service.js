/**
 * Bill of Quantities Engine — pure domain service.
 *
 * Groups material lines into one line per material and prices them:
 *
 *   totalQty   = Σ quantity + Σ wasteQty
 *   amountPaise = round(totalQty × ratePaise)     // single round-half-up per line
 *
 * The engine never computes waste — the adapter supplies `wasteQty` per line (extra sheets
 * and cut-off scrap from the Material Optimization Engine). It only groups, sums, and
 * prices, so it stays deterministic and reusable from REST, CLI, unit tests, or the AI
 * workflow. Empty input yields a zero-total BOQ with an explicit "no items" note, not an
 * error (design §10).
 */

import { toMajor, toMinor } from '../../shared/money.js';
import { boqRateConflict } from '../../shared/errors.js';
import { boqInputSchema } from './dto.js';

const NO_ITEMS_NOTE = 'No items to include in the BOQ.';

/** @param {import('./dto.js').BoqLineInput} line */
function groupKey(line) {
  return line.materialId;
}

/** @param {string|null} a @param {string|null} b */
const compareNullable = (a, b) => String(a ?? '').localeCompare(String(b ?? ''));

/**
 * @param {import('./dto.js').BoqInput} input
 * @returns {import('./dto.js').BoqResult}
 */
export function buildBoq(input) {
  const parsed = boqInputSchema.parse(input);

  /** @type {Map<string, {line: import('./dto.js').BoqLineInput, rate: number, quantity: number, wasteQty: number}>} */
  const groups = new Map();

  for (const line of parsed.items) {
    const key = groupKey(line);
    const existing = groups.get(key);
    if (existing) {
      if (existing.rate !== line.rate) {
        throw boqRateConflict(key, [existing.rate, line.rate], [
          existing.line.source,
          line.source,
        ]);
      }
      existing.quantity += line.quantity;
      existing.wasteQty += line.wasteQty;
    } else {
      groups.set(key, { line, rate: line.rate, quantity: line.quantity, wasteQty: line.wasteQty });
    }
  }

  /** @type {import('./dto.js').BoqLine[]} */
  const items = [...groups.values()].map(({ line, rate, quantity, wasteQty }) => {
    const totalQty = quantity + wasteQty;
    const ratePaise = toMinor(rate);
    const amountPaise = Math.round(totalQty * ratePaise);
    return {
      materialId: line.materialId,
      name: line.name,
      category: line.category ?? null,
      type: line.type ?? null,
      unit: line.unit,
      quantity,
      wasteQty,
      totalQty,
      rate,
      ratePaise,
      amountPaise,
      amount: toMajor(amountPaise),
    };
  });

  // Stable, human-meaningful ordering: category → type → name.
  items.sort(
    (a, b) =>
      compareNullable(a.category, b.category) ||
      compareNullable(a.type, b.type) ||
      compareNullable(a.name, b.name)
  );

  const amountPaise = items.reduce((s, l) => s + l.amountPaise, 0);
  const empty = items.length === 0;

  return {
    currency: parsed.currency,
    items,
    totals: {
      lineCount: items.length,
      amountPaise,
      amount: toMajor(amountPaise),
    },
    empty,
    notes: empty ? [NO_ITEMS_NOTE] : [],
  };
}
