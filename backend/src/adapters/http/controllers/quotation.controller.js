import { success, created } from '../../../utils/api-response.js';
import { Quotation } from '../../persistence/mongoose/models/quotation.model.js';
import { Boq } from '../../persistence/mongoose/models/boq.model.js';
import { Project } from '../../persistence/mongoose/models/project.model.js';
import { Client } from '../../persistence/mongoose/models/client.model.js';
import { getSettings } from '../../services/settings/settings.service.js';
import { calculateProjectEstimate } from '../../services/quotations/project-estimate.service.js';
import { generateQuotation } from '../../services/quotations/generate-quotation.js';
import { quotationToPdfBuffer } from '../../services/quotations/pdf/render-quotation.js';
import { nextQuotationNumber } from '../../persistence/repositories/quotation-number.repository.js';
import { createQuotationWithBoq } from '../../persistence/repositories/quotation.repository.js';
import { assertMutable, assertTransition, buildQuotation } from '../../../domain/quotation/quotation.service.js';
import { notFound, invalidState, invalidInput } from '../../../shared/errors.js';

/**
 * POST /quotations/generate — Generate quotation and BOQ from a project.
 */
export async function generateQuotationHandler(req, res) {
  const { projectId, discount, paymentTerms, warranty, notes, validUntilDays } = req.validated.body;

  const { estimate, materialLines, rooms, project, client } = await calculateProjectEstimate(projectId, { discount });
  const settings = await getSettings();

  const config = {
    paymentTerms: paymentTerms ?? settings.paymentTerms ?? '',
    warranty: warranty ?? settings.warranty ?? '',
    notes: notes ?? 'Prices valid for 30 days.',
    validUntilDays: validUntilDays ?? 30,
    issuedAt: new Date(),
  };

  const result = await generateQuotation({
    projectId,
    clientId: project.clientId.toString(),
    estimate,
    materialLines,
    rooms,
    config,
    settings,
    client,
    project,
  });

  const saved = await Quotation.findById(result.quotationId).lean();
  return created(res, 'Quotation generated successfully', {
    ...saved,
    id: saved._id.toString(),
  });
}

/**
 * GET /quotations — List/Filter quotations.
 */
export async function listQuotationsHandler(req, res) {
  const page = req.query.page ? parseInt(req.query.page, 10) : 1;
  const pageSize = req.query.pageSize ? parseInt(req.query.pageSize, 10) : 20;
  const { status, clientId, projectId, from, to } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (clientId) filter.clientId = clientId;
  if (projectId) filter.projectId = projectId;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const items = await Quotation.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  const total = await Quotation.countDocuments(filter);

  const formattedItems = items.map((item) => ({
    ...item,
    id: item._id.toString(),
  }));

  return success(res, 'Quotations retrieved successfully', {
    items: formattedItems,
    total,
    page,
    pageSize,
  });
}

export async function getQuotationByIdHandler(req, res) {
  const quotation = await Quotation.findById(req.params.id).lean();
  if (!quotation) throw notFound('Quotation not found');

  return success(res, 'Quotation retrieved successfully', {
    ...quotation,
    id: quotation._id.toString(),
  });
}

/**
 * PUT /quotations/:id — Update status/fields (recalc only while draft).
 */
export async function updateQuotationHandler(req, res) {
  const { status, paymentTerms, warranty, notes, discount } = req.validated.body;
  const current = await Quotation.findById(req.params.id);
  if (!current) throw notFound('Quotation not found');

  // Handle status transition
  if (status && status !== current.status) {
    assertTransition(current.status, status);
    
    // Special transition: rejected -> revised (creates a new draft, current becomes revised/superseded)
    if (status === 'revised') {
      current.status = 'revised';
      await current.save();

      // Spawn revised quotation as a new draft
      const settings = await getSettings();
      const { estimate, materialLines, rooms, project, client } = await calculateProjectEstimate(
        current.projectId.toString(),
        { discount }
      );

      const config = {
        paymentTerms: paymentTerms ?? current.paymentTerms,
        warranty: warranty ?? current.warranty,
        notes: notes ?? current.notes,
        validUntilDays: 30,
        revisionOf: current._id.toString(),
        issuedAt: new Date(),
      };

      const result = await generateQuotation({
        projectId: current.projectId.toString(),
        clientId: current.clientId.toString(),
        estimate,
        materialLines,
        rooms,
        config,
        settings,
        client,
        project,
      });

      const savedRevision = await Quotation.findById(result.quotationId).lean();
      return success(res, 'Quotation revised successfully', {
        superseded: current.toObject ? current.toObject() : current,
        revision: {
          ...savedRevision,
          id: savedRevision._id.toString(),
        },
      });
    }

    current.status = status;
  }

  // Handle other field updates (only allowed in draft)
  if (paymentTerms !== undefined || warranty !== undefined || notes !== undefined || discount !== undefined) {
    assertMutable(current.status);
    
    if (paymentTerms !== undefined) current.paymentTerms = paymentTerms;
    if (warranty !== undefined) current.warranty = warranty;
    if (notes !== undefined) current.notes = notes;

    // If discount changed, recalculate
    if (discount !== undefined) {
      const { estimate } = await calculateProjectEstimate(current.projectId.toString(), { discount });
      // update snapshot totals
      const toRupees = (paise) => Number((paise / 100).toFixed(2));
      current.summary = {
        subtotal: toRupees(estimate.pricing.marginBasePaise),
        discountType: estimate.pricing.discount?.type ?? null,
        discountValue: estimate.pricing.discount?.value ?? 0,
        discount: toRupees(estimate.pricing.discount?.amountPaise ?? 0),
        taxable: toRupees(estimate.pricing.taxablePaise),
        gstRate: estimate.pricing.outputGstRatePercent,
        gst: toRupees(estimate.pricing.gstPaise),
        total: toRupees(estimate.pricing.totalPaise),
      };
      current.totals = {
        totalCost: toRupees(estimate.totals.costPaise),
        profit: toRupees(estimate.pricing.profitPaise),
        profitPercent: estimate.pricing.profitPercent,
        marginBase: toRupees(estimate.pricing.marginBasePaise),
      };
    }
  }

  await current.save();
  const updated = current.toObject();
  return success(res, 'Quotation updated successfully', {
    ...updated,
    id: updated._id.toString(),
  });
}

/**
 * DELETE /quotations/:id — Delete a quotation (draft/rejected only).
 */
export async function deleteQuotationHandler(req, res) {
  const current = await Quotation.findById(req.params.id);
  if (!current) throw notFound('Quotation not found');

  if (current.status !== 'draft' && current.status !== 'rejected') {
    throw invalidState(`Only draft or rejected quotations can be deleted; current status is "${current.status}".`);
  }

  // Delete atomic components
  await Boq.deleteMany({ quotationId: current._id });
  await current.deleteOne();

  return success(res, 'Quotation and its BOQ deleted successfully');
}

/**
 * GET /quotations/:id/pdf — Download PDF Kit rendered quotation document.
 */
export async function downloadQuotationPdfHandler(req, res) {
  const quotation = await Quotation.findById(req.params.id).lean();
  if (!quotation) throw notFound('Quotation not found');

  const boqDoc = await Boq.findOne({ quotationId: quotation._id }).lean();
  const project = await Project.findById(quotation.projectId).lean();
  const client = await Client.findById(quotation.clientId).lean();
  const settings = await getSettings();

  // Re-map Mongoose types to PDF expected formats (rupees -> paise structure matches QuotationResult)
  const toPaise = (rupees) => Math.round(rupees * 100);
  const quotationDto = {
    ...quotation,
    summary: {
      subtotalPaise: toPaise(quotation.summary.subtotal),
      discountType: quotation.summary.discountType,
      discountValue: quotation.summary.discountValue,
      discountPaise: toPaise(quotation.summary.discount),
      taxablePaise: toPaise(quotation.summary.taxable),
      outputGstRatePercent: quotation.summary.gstRate,
      gstPaise: toPaise(quotation.summary.gst),
      totalPaise: toPaise(quotation.summary.total),
    },
    items: boqDoc ? boqDoc.items.map((it) => ({
      materialId: it.materialId,
      name: it.materialName,
      category: it.category,
      type: it.type,
      unit: it.unit,
      quantity: it.quantity,
      wasteQty: it.wasteQty,
      totalQty: it.totalQty,
      rate: it.rate,
      amountPaise: toPaise(it.amount),
    })) : [],
  };

  const company = {
    companyName: settings.companyName,
    gstNumber: settings.gstNumber,
    logo: settings.logo,
  };

  const buffer = await quotationToPdfBuffer(quotationDto, {
    company,
    client,
    project,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=Quotation_${quotation.quotationNumber}.pdf`
  );

  return res.send(buffer);
}
