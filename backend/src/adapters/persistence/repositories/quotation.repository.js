/**
 * Quotation persistence — maps the domain paise DTO to the rupee `quotations`/`boq`
 * collections and writes both atomically (design §6: "both succeed or neither").
 *
 * The write takes an optional Mongoose `session` so the orchestration service can wrap it in
 * a multi-document transaction. Without a session (unit tests, single-threaded seeds) it is
 * still correct, just not transactionally atomic.
 */

import { Quotation } from '../mongoose/models/quotation.model.js';
import { Boq } from '../mongoose/models/boq.model.js';

/** Integer paise → clean 2-dp rupee display value. */
const toRupees = (paise) => Number((paise / 100).toFixed(2));

/**
 * Map a domain QuotationResult (paise) to the persisted `quotations` document (rupees).
 * @param {import('../../domain/quotation/dto.js').QuotationResult} q
 * @returns {object}
 */
export function toQuotationDoc(q) {
  const { summary, totals } = q;
  return {
    quotationNumber: q.quotationNumber,
    projectId: q.projectId,
    clientId: q.clientId,
    status: q.status,
    summary: {
      subtotal: toRupees(summary.subtotalPaise),
      discountType: summary.discountType,
      discountValue: summary.discountValue,
      discount: toRupees(summary.discountPaise),
      taxable: toRupees(summary.taxablePaise),
      gstRate: summary.outputGstRatePercent,
      gst: toRupees(summary.gstPaise),
      total: toRupees(summary.totalPaise),
    },
    totals: {
      totalCost: toRupees(totals.totalCostPaise),
      profit: toRupees(totals.profitPaise),
      profitPercent: totals.profitPercent,
      marginBase: toRupees(totals.marginBasePaise),
    },
    rooms: q.rooms.map((r) => ({
      roomId: r.roomId,
      name: r.name,
      roomTotal: toRupees(r.roomTotalPaise),
    })),
    costs: {
      material: toRupees(q.costs?.materialPaise ?? 0),
      manufacturing: toRupees(q.costs?.manufacturingPaise ?? 0),
      labour: toRupees(q.costs?.labourPaise ?? 0),
      additional: toRupees(q.costs?.additionalPaise ?? 0),
      labourByTrade: {
        carpenter: toRupees(q.costs?.labourByTradePaise?.carpenter ?? 0),
        painter: toRupees(q.costs?.labourByTradePaise?.painter ?? 0),
        electrician: toRupees(q.costs?.labourByTradePaise?.electrician ?? 0),
        plumber: toRupees(q.costs?.labourByTradePaise?.plumber ?? 0),
        helper: toRupees(q.costs?.labourByTradePaise?.helper ?? 0),
      },
    },
    paymentTerms: q.paymentTerms,
    warranty: q.warranty,
    notes: q.notes,
    signatureUrl: q.signatureUrl,
    issuedAt: q.issuedAt,
    validUntil: q.validUntil,
    revisionOf: q.revisionOf,
  };
}

/**
 * Map domain quotation items to persisted `boq` items.
 * @param {import('../../domain/quotation/dto.js').QuotationItem[]} items
 * @returns {object[]}
 */
export function toBoqItemsDoc(items) {
  return items.map((it) => ({
    materialId: it.materialId,
    materialName: it.name,
    category: it.category ?? null,
    type: it.type ?? null,
    unit: it.unit,
    quantity: it.quantity,
    wasteQty: it.wasteQty,
    totalQty: it.totalQty,
    rate: it.rate,
    amount: toRupees(it.amountPaise),
  }));
}

/**
 * Persist a quotation + its BOQ atomically.
 * @param {object} args
 * @param {import('../../domain/quotation/dto.js').QuotationResult} args.quotation
 * @param {import('mongoose').ClientSession} [args.session]
 * @returns {Promise<{ quotation: import('mongoose').HydratedDocument, boqId: import('mongoose').Types.ObjectId }>}
 */
export async function createQuotationWithBoq({ quotation, session }) {
  const opts = session ? { session } : {};
  const qDoc = toQuotationDoc(quotation);
  const [saved] = await Quotation.create([qDoc], opts);
  const [savedBoq] = await Boq.create(
    [{ projectId: qDoc.projectId, quotationId: saved._id, items: toBoqItemsDoc(quotation.items) }],
    opts
  );
  return { quotation: saved, boqId: savedBoq._id };
}
