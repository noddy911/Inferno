/**
 * Report data access — loads persisted `quotations`/`boq` docs and normalizes them into the
 * paise rows the pure aggregators consume (`domain/reports/dto.js` typedefs). Rupees → paise
 * here, so aggregators and totals stay in exact integer money.
 */

import { Quotation } from '../mongoose/models/quotation.model.js';
import { Boq } from '../mongoose/models/boq.model.js';

const toPaise = (rupees) => Math.round((rupees ?? 0) * 100);

const TRADES = ['carpenter', 'painter', 'electrician', 'plumber', 'helper'];

/**
 * @param {object} [filters]
 * @param {Date} [filters.from] inclusive issuedAt lower bound
 * @param {Date} [filters.to] inclusive issuedAt upper bound
 * @param {string} [filters.clientId]
 * @param {string} [filters.projectId]
 * @returns {Promise<import('../../domain/reports/dto.js').QuotationReportRow[]>}
 */
export async function loadQuotationRows(filters = {}) {
  const { from, to, clientId, projectId } = filters;
  const query = {};
  if (from || to) {
    query.issuedAt = {};
    if (from) query.issuedAt.$gte = from;
    if (to) query.issuedAt.$lte = to;
  }
  if (clientId) query.clientId = clientId;
  if (projectId) query.projectId = projectId;

  const docs = await Quotation.find(query).sort({ issuedAt: 1 }).lean();
  return docs.map((doc) => {
    const costs = doc.costs ?? {};
    const labourByTradePaise = {};
    for (const trade of TRADES) labourByTradePaise[trade] = toPaise(costs.labourByTrade?.[trade]);
    return {
      quotationId: doc._id.toString(),
      quotationNumber: doc.quotationNumber,
      projectId: doc.projectId.toString(),
      clientId: doc.clientId.toString(),
      status: doc.status,
      issuedAt: doc.issuedAt,
      summary: {
        subtotalPaise: toPaise(doc.summary.subtotal),
        discountPaise: toPaise(doc.summary.discount),
        taxablePaise: toPaise(doc.summary.taxable),
        gstPaise: toPaise(doc.summary.gst),
        totalPaise: toPaise(doc.summary.total),
      },
      totals: {
        totalCostPaise: toPaise(doc.totals.totalCost),
        marginBasePaise: toPaise(doc.totals.marginBase),
        profitPaise: toPaise(doc.totals.profit),
      },
      costs: {
        materialPaise: toPaise(costs.material),
        manufacturingPaise: toPaise(costs.manufacturing),
        labourPaise: toPaise(costs.labour),
        additionalPaise: toPaise(costs.additional),
        labourByTradePaise,
      },
    };
  });
}

/**
 * @param {object} [filters]
 * @param {Date} [filters.from] inclusive generatedAt lower bound
 * @param {Date} [filters.to] inclusive generatedAt upper bound
 * @returns {Promise<import('../../domain/reports/dto.js').BoqReportRow[]>}
 */
export async function loadBoqRows(filters = {}) {
  const { from, to } = filters;
  const query = {};
  if (from || to) {
    query.generatedAt = {};
    if (from) query.generatedAt.$gte = from;
    if (to) query.generatedAt.$lte = to;
  }

  const docs = await Boq.find(query).sort({ generatedAt: 1 }).lean();
  return docs.flatMap((doc) =>
    (doc.items ?? []).map((it) => ({
      date: doc.generatedAt ?? doc.createdAt,
      materialId: it.materialId,
      materialName: it.materialName,
      category: it.category ?? null,
      type: it.type ?? null,
      unit: it.unit,
      quantity: it.quantity,
      wasteQty: it.wasteQty,
      totalQty: it.totalQty,
      ratePaise: toPaise(it.rate),
      amountPaise: toPaise(it.amount),
    }))
  );
}
