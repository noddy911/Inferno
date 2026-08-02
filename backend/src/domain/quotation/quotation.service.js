/**
 * Quotation Engine — pure domain service.
 *
 * `buildQuotation(input)` freezes a complete pricing snapshot: summary (subtotal/discount/
 * taxable/GST/total), totals (cost/profit/margin), per-room totals, and the BOQ line items.
 * The snapshot is what the PDF renders and what persists — later material price changes can
 * never alter a generated quotation (design §4.2, §6).
 *
 * The lifecycle state machine lives here too (design §6):
 *   draft → sent → accepted | rejected ; rejected → revised (new doc + new number)
 * Only `draft` is editable; a sent quotation is immutable. Revisions are new documents
 * linked via `revisionOf` — the engine is ready for version history without refactoring.
 */

import { invalidInput, invalidState } from '../../shared/errors.js';
import { quotationInputSchema } from './dto.js';

export const QUOTATION_STATUSES = Object.freeze([
  'draft',
  'sent',
  'accepted',
  'rejected',
  'revised',
]);

/** Allowed one-step transitions (design §6). */
export const STATUS_TRANSITIONS = Object.freeze({
  draft: ['sent'],
  sent: ['accepted', 'rejected'],
  rejected: ['revised'], // old doc marked superseded; the revision is a NEW draft
  accepted: [],
  revised: [],
});

const NO_ITEMS_NOTE = 'No items to include in this quotation.';

/**
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
export function canTransition(from, to) {
  return (STATUS_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Throws `INVALID_STATE` when the transition is not allowed.
 * @param {string} from
 * @param {string} to
 */
export function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw invalidState(`Cannot transition quotation from "${from}" to "${to}".`, {
      from,
      to,
      allowed: STATUS_TRANSITIONS[from] ?? [],
    });
  }
}

/**
 * Only draft quotations may be edited/recalculated.
 * @param {string} status
 */
export function assertMutable(status) {
  if (status !== 'draft') {
    throw invalidState(`Only draft quotations can be edited; current status is "${status}".`, {
      status,
    });
  }
}

/**
 * Build a quotation from the costing pricing block + BOQ items + config.
 * @param {import('./dto.js').QuotationInput} input
 * @returns {import('./dto.js').QuotationResult}
 */
export function buildQuotation(input) {
  const parsed = quotationInputSchema.parse(input);
  const { pricing, config } = parsed;

  // The snapshot must be internally consistent — a mismatched pricing/items input is a bug.
  const taxable = Math.max(0, pricing.marginBasePaise - (pricing.discount?.amountPaise ?? 0));
  if (taxable !== pricing.taxablePaise) {
    throw invalidInput('quotation pricing is inconsistent: taxable ≠ subtotal − discount', {
      subtotalPaise: pricing.marginBasePaise,
      discountPaise: pricing.discount?.amountPaise ?? 0,
      taxablePaise: pricing.taxablePaise,
    });
  }
  if (pricing.totalPaise !== pricing.taxablePaise + pricing.gstPaise) {
    throw invalidInput('quotation pricing is inconsistent: total ≠ taxable + gst', {
      taxablePaise: pricing.taxablePaise,
      gstPaise: pricing.gstPaise,
      totalPaise: pricing.totalPaise,
    });
  }

  const issuedAt = config.issuedAt ?? new Date();
  const validUntil = new Date(issuedAt.getTime() + config.validUntilDays * 24 * 60 * 60 * 1000);
  const empty = parsed.items.length === 0;

  return {
    quotationNumber: null,
    projectId: parsed.projectId,
    clientId: parsed.clientId,
    currency: parsed.currency,
    status: 'draft',
    summary: {
      subtotalPaise: pricing.marginBasePaise,
      discountType: pricing.discount?.type ?? null,
      discountValue: pricing.discount?.value ?? 0,
      discountPaise: pricing.discount?.amountPaise ?? 0,
      taxablePaise: pricing.taxablePaise,
      outputGstRatePercent: pricing.outputGstRatePercent,
      gstPaise: pricing.gstPaise,
      totalPaise: pricing.totalPaise,
    },
    totals: {
      totalCostPaise: parsed.costPaise,
      marginBasePaise: pricing.marginBasePaise,
      profitPaise: pricing.profitPaise,
      profitPercent: pricing.profitPercent,
      profitMarginPercent: pricing.profitMarginPercent,
    },
    rooms: parsed.rooms,
    items: parsed.items,
    costs: parsed.costs,
    paymentTerms: config.paymentTerms,
    warranty: config.warranty,
    notes: empty ? NO_ITEMS_NOTE : config.notes,
    signatureUrl: config.signatureUrl ?? null,
    issuedAt,
    validUntil,
    revisionOf: config.revisionOf ?? null,
    empty,
  };
}
