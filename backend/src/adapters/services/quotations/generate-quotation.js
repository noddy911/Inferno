/**
 * Quotation generation orchestration (design §6).
 *
 *   estimate + material lines + settings  →  BOQ (with conflict logging) → snapshot
 *   → atomic number → persist quotation + BOQ in one transaction → result.
 *
 * The pipeline that *produced* the estimate (measure → cut → cost) runs elsewhere; this
 * seam owns everything a quotation needs that the pure engines cannot: the atomic number,
 * the persisted snapshot, and transactional writes. Runs require a MongoDB replica set
 * (transaction support); pass your own `session` to join an outer transaction.
 */

import mongoose from 'mongoose';
import { logger } from '../../../config/logger.js';
import { DEFAULT_SETTINGS } from '../../persistence/mongoose/models/settings.model.js';
import { buildBoq } from '../../../domain/boq/boq.service.js';
import { buildQuotation } from '../../../domain/quotation/quotation.service.js';
import { nextQuotationNumber } from '../../persistence/repositories/quotation-number.repository.js';
import { createQuotationWithBoq } from '../../persistence/repositories/quotation.repository.js';

const toItems = (boq) =>
  boq.items.map((it) => ({
    materialId: it.materialId,
    name: it.name,
    category: it.category,
    type: it.type,
    unit: it.unit,
    quantity: it.quantity,
    wasteQty: it.wasteQty,
    totalQty: it.totalQty,
    rate: it.rate,
    amountPaise: it.amountPaise,
  }));

/** Cost-component snapshot from the costing engine (paise) — feeds reports (design §7). */
const toCosts = (estimate) => {
  const labourByTradePaise = {};
  for (const line of estimate.lines?.labour ?? []) labourByTradePaise[line.key] = line.amountPaise;
  return {
    materialPaise: estimate.totals?.materialPaise ?? 0,
    manufacturingPaise: estimate.totals?.manufacturingPaise ?? 0,
    labourPaise: estimate.totals?.labourPaise ?? 0,
    additionalPaise: estimate.totals?.additionalPaise ?? 0,
    labourByTradePaise,
  };
};

/**
 * @param {object} args
 * @param {string} args.projectId
 * @param {string} args.clientId
 * @param {import('../../../domain/costing/dto.js').CostEstimate} args.estimate
 *   currency + totals.costPaise + pricing from the costing engine
 * @param {Array<import('../../../domain/boq/dto.js').BoqLineInput>} args.materialLines
 *   resolved material lines (wasteQty + optional `source` provenance)
 * @param {Array<import('../../../domain/quotation/dto.js').RoomTotal>} [args.rooms]
 * @param {object} [args.config] paymentTerms/warranty/notes/validUntilDays/signatureUrl/revisionOf/issuedAt
 * @param {object} [args.settings] DEFAULT_SETTINGS-compatible (quotationNumbering, company)
 * @param {object} [args.client] client display block for the PDF ({name,address,phone})
 * @param {object} [args.project] project display block for the PDF ({projectName,siteAddress})
 * @param {import('mongoose').ClientSession} [args.session] join an outer transaction
 * @returns {Promise<{ quotation: object, boq: object, quotationId: string, boqId: string }>}
 */
export async function generateQuotation(args) {
  const {
    projectId,
    clientId,
    estimate,
    materialLines,
    rooms = [],
    config = {},
    settings = DEFAULT_SETTINGS,
    client = {},
    project = {},
    session,
  } = args;

  const numbering = settings.quotationNumbering ?? DEFAULT_SETTINGS.quotationNumbering;

  // 1. Grouped BOQ — a rate conflict aborts generation and is logged with full context
  //    (project/room/furniture/material/rates travel in the error details).
  let boq;
  try {
    boq = buildBoq({ items: materialLines, currency: estimate.currency });
  } catch (err) {
    if (err.isDomain && err.code === 'BOQ_RATE_CONFLICT') {
      logger.error('BOQ_RATE_CONFLICT — aborting quotation generation', {
        projectId,
        materialId: err.details.materialId,
        rates: err.details.rates,
        sources: err.details.sources,
      });
    }
    throw err;
  }

  // 2. Freeze the pricing snapshot (pure).
  const quotation = buildQuotation({
    projectId,
    clientId,
    currency: estimate.currency,
    pricing: estimate.pricing,
    costPaise: estimate.totals.costPaise,
    items: toItems(boq),
    rooms,
    costs: toCosts(estimate),
    config,
  });

  // 3. Atomic number (unique even under concurrency) + persisted snapshot.
  const { number } = await nextQuotationNumber(numbering, config.issuedAt);
  const numbered = { ...quotation, quotationNumber: number };

  const persist = () => createQuotationWithBoq({ quotation: numbered, session });

  let saved;
  if (session) {
    saved = await persist();
  } else {
    const ts = await mongoose.startSession();
    ts.startTransaction();
    try {
      saved = await createQuotationWithBoq({ quotation: numbered, session: ts });
      await ts.commitTransaction();
    } catch (err) {
      await ts.abortTransaction();
      throw err;
    } finally {
      await ts.endSession();
    }
  }

  const company = { companyName: settings.companyName, gstNumber: settings.gstNumber, logo: settings.logo };
  return {
    quotation: {
      ...numbered,
      id: saved.quotation._id.toString(),
      company,
      client,
      project,
    },
    boq,
    quotationId: saved.quotation._id.toString(),
    boqId: saved.boqId.toString(),
  };
}
