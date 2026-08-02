import { success, created } from '../../../utils/api-response.js';
import { Boq } from '../../persistence/mongoose/models/boq.model.js';
import { calculateProjectEstimate } from '../../services/quotations/project-estimate.service.js';
import { buildBoq } from '../../../domain/boq/boq.service.js';
import { boqToBuffer } from '../../services/boq-exporter.js';
import { notFound } from '../../../shared/errors.js';

/**
 * POST /boq/generate — Generate and persist a BOQ from a project.
 */
export async function generateBoqHandler(req, res) {
  const { projectId } = req.validated.body;

  const { estimate, materialLines } = await calculateProjectEstimate(projectId);
  const boqResult = buildBoq({ items: materialLines, currency: estimate.currency });

  // Map and create BOQ document
  const boqDoc = await Boq.create({
    projectId,
    items: boqResult.items.map((it) => ({
      materialId: it.materialId,
      materialName: it.name,
      category: it.category,
      type: it.type,
      unit: it.unit,
      quantity: it.quantity,
      wasteQty: it.wasteQty,
      totalQty: it.totalQty,
      rate: it.rate,
      amount: it.amount,
    })),
  });

  return created(res, 'BOQ generated successfully', {
    id: boqDoc._id.toString(),
    projectId: boqDoc.projectId,
    generatedAt: boqDoc.generatedAt,
    ...boqResult,
  });
}

/**
 * GET /boq/:id — Fetch details of a saved BOQ.
 */
export async function getBoqByIdHandler(req, res) {
  const boqDoc = await Boq.findById(req.params.id).lean();
  if (!boqDoc) throw notFound('BOQ not found');

  // Convert persisted rupees back to BoqResult DTO format
  const result = {
    currency: 'INR',
    items: boqDoc.items.map((it) => ({
      materialId: it.materialId,
      name: it.materialName,
      category: it.category,
      type: it.type,
      unit: it.unit,
      quantity: it.quantity,
      wasteQty: it.wasteQty,
      totalQty: it.totalQty,
      rate: it.rate,
      amount: it.amount,
    })),
    totals: {
      lineCount: boqDoc.items.length,
      amount: boqDoc.items.reduce((s, it) => s + it.amount, 0),
    },
    empty: boqDoc.items.length === 0,
    notes: boqDoc.items.length === 0 ? ['No items in BOQ'] : [],
  };

  return success(res, 'BOQ retrieved successfully', result);
}

/**
 * GET /boq/:id/export — Export the BOQ as an Excel (.xlsx) file.
 */
export async function exportBoqHandler(req, res) {
  const boqDoc = await Boq.findById(req.params.id).lean();
  if (!boqDoc) throw notFound('BOQ not found');

  const boqResult = {
    currency: 'INR',
    items: boqDoc.items.map((it) => ({
      materialId: it.materialId,
      name: it.materialName,
      category: it.category,
      type: it.type,
      unit: it.unit,
      quantity: it.quantity,
      wasteQty: it.wasteQty,
      totalQty: it.totalQty,
      rate: it.rate,
      amount: it.amount,
    })),
    totals: {
      lineCount: boqDoc.items.length,
      amount: boqDoc.items.reduce((s, it) => s + it.amount, 0),
    },
    empty: boqDoc.items.length === 0,
  };

  const buffer = await boqToBuffer(boqResult, {
    title: `Bill of Quantities — Project ${boqDoc.projectId}`,
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=BOQ_${boqDoc.projectId}.xlsx`
  );

  return res.send(buffer);
}
