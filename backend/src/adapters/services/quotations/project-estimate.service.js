import { getSettings } from '../settings/settings.service.js';
import { Project } from '../../persistence/mongoose/models/project.model.js';
import { Client } from '../../persistence/mongoose/models/client.model.js';
import { Room } from '../../persistence/mongoose/models/room.model.js';
import { Furniture } from '../../persistence/mongoose/models/furniture.model.js';
import { Material } from '../../persistence/mongoose/models/material.model.js';
import { loadRecipes } from '../../../domain/measurement/recipes.js';
import { measureItems, measureFurnitureItem } from '../../../domain/measurement/measure.service.js';
import { cutPanels } from '../../../domain/optimization/cut.service.js';
import { estimateCost, deriveLabourDays } from '../../../domain/costing/cost.service.js';
import { invalidInput, notFound } from '../../../shared/errors.js';

const sqmToSqft = (sqm) => sqm * 10.76391;
const mmToRft = (mm) => mm / 304.8;

/**
 * Run the project-wide estimation pipeline (measure → cut → cost → price).
 * @param {string} projectId
 * @returns {Promise<{
 *   project: object,
 *   client: object,
 *   estimate: import('../../../domain/costing/dto.js').CostEstimate,
 *   materialLines: object[],
 *   rooms: { roomId: string, name: string, roomTotalPaise: number }[]
 * }>}
 */
export async function calculateProjectEstimate(projectId, { discount } = {}) {
  const project = await Project.findById(projectId).lean();
  if (!project) throw notFound(`Project not found: ${projectId}`);

  const client = await Client.findById(project.clientId).lean();
  if (!client) throw notFound(`Client not found: ${project.clientId}`);

  const settings = await getSettings();
  const rooms = await Room.find({ projectId }).lean();

  if (!rooms || rooms.length === 0) {
    // Zero-total fallback for empty projects
    return createEmptyEstimate(project, client, settings);
  }

  const roomIds = rooms.map((r) => r._id);
  const furnitureList = await Furniture.find({ roomId: { $in: roomIds } }).lean();

  if (!furnitureList || furnitureList.length === 0) {
    return createEmptyEstimate(project, client, settings);
  }

  // 1. Preload and map all active materials in the catalog
  const materials = await Material.find({ isActive: true, deletedAt: null }).lean();
  const materialsMap = new Map(materials.map((m) => [m._id.toString(), m]));
  const materialsBySku = new Map(materials.map((m) => [m.sku.toUpperCase(), m]));

  const recipes = loadRecipes();

  // 2. Measure every furniture item
  const measuredItems = [];
  const panelsByBoardSku = new Map(); // Group panels for nesting optimizer
  let totalMaterialAreaSqm = 0;
  let totalFurnitureUnits = 0;
  let totalHinges = 0;
  let totalChannels = 0;
  let totalHandles = 0;
  let totalLocks = 0;
  let totalConnectors = 0;

  for (const item of furnitureList) {
    const boardMaterial = materialsMap.get(item.materialId?.toString());
    if (!boardMaterial) {
      throw invalidInput(`Active board material not found in catalog for furniture: "${item.name}"`);
    }

    // Run measurement engine
    const mResult = measureFurnitureItem(item, {
      recipes,
      boardThickness: boardMaterial.thickness ?? 18,
    });

    measuredItems.push({
      item,
      measurement: mResult,
    });

    totalMaterialAreaSqm += mResult.materialArea;
    totalFurnitureUnits += item.quantity;
    totalHinges += mResult.hardware.hinges;
    totalChannels += mResult.hardware.channels;
    totalHandles += mResult.hardware.handles;
    totalLocks += mResult.hardware.locks;
    totalConnectors += mResult.hardware.connectors;

    // Group board panels by board material SKU
    for (const panel of mResult.panels) {
      if (panel.material === 'board' || panel.material === 'backBoard') {
        const sku = boardMaterial.sku;
        if (!panelsByBoardSku.has(sku)) {
          panelsByBoardSku.set(sku, []);
        }
        panelsByBoardSku.get(sku).push({
          w: panel.w,
          d: panel.d,
          label: panel.name,
        });
      }
    }
  }

  // 3. Run cutting optimizer per board SKU group
  const boardMaterialLines = [];
  let totalSheetsCut = 0;

  for (const [sku, panels] of panelsByBoardSku.entries()) {
    const material = materialsBySku.get(sku);
    // Find matching sheet size in settings
    const sheetKey = settings.sheetSizes.find(
      (s) => s.width === material.sheetSize?.width && s.height === material.sheetSize?.height
    )?.key || '8x4';

    const cutResult = cutPanels({
      panels,
      sheetKey,
      kerf: settings.kerf,
      sheetSizes: settings.sheetSizes,
    });

    totalSheetsCut += cutResult.sheetCount;

    boardMaterialLines.push({
      key: sku,
      label: material.name,
      category: 'board',
      type: material.type,
      unit: 'sheet',
      quantity: cutResult.sheetCount,
      rate: material.purchaseRate,
      wasteQty: cutResult.wasteArea / ((material.sheetSize.width * material.sheetSize.height) / 1_000_000), // waste sheets equivalent
    });
  }

  // 4. Resolve and price other materials (Finishes, Hardware, Countertops, etc.)
  const otherMaterialLines = [];

  // Group finishes
  const finishAreas = new Map(); // finishType -> totalAreaSqm
  for (const m of measuredItems) {
    if (m.item.finish && m.measurement.finishArea > 0) {
      const type = m.item.finish.toLowerCase();
      finishAreas.set(type, (finishAreas.get(type) || 0) + m.measurement.finishArea);
    }
  }

  for (const [finishType, areaSqm] of finishAreas.entries()) {
    // Find active finish material
    const finishMat = materials.find((m) => m.category === 'finish' && m.type === finishType);
    if (finishMat) {
      const qty = finishMat.unit === 'sqft' ? sqmToSqft(areaSqm) : areaSqm;
      otherMaterialLines.push({
        key: finishMat.sku,
        label: finishMat.name,
        category: 'finish',
        type: finishMat.type,
        unit: finishMat.unit,
        quantity: parseFloat(qty.toFixed(4)),
        rate: finishMat.purchaseRate,
      });
    }
  }

  // Resolve hardware
  const hardwareCounts = {
    hinge: totalHinges,
    channel: totalChannels,
    handle: totalHandles,
    lock: totalLocks,
    connector: totalConnectors,
  };

  for (const [hwType, count] of Object.entries(hardwareCounts)) {
    if (count > 0) {
      const hwMat = materials.find((m) => m.category === 'hardware' && m.type === hwType);
      if (hwMat) {
        otherMaterialLines.push({
          key: hwMat.sku,
          label: hwMat.name,
          category: 'hardware',
          type: hwMat.type,
          unit: hwMat.unit,
          quantity: count,
          rate: hwMat.purchaseRate,
        });
      }
    }
  }

  // Resolve countertop (kitchen countertop)
  let totalCountertopMm = 0;
  for (const m of measuredItems) {
    if (m.item.category === 'kitchen') {
      // Countertop panel (1 countertop panel per kitchen module)
      const countertopPanels = m.measurement.panels.filter((p) => p.material === 'countertop');
      for (const p of countertopPanels) {
        totalCountertopMm += p.w * m.item.quantity; // Sum linear mm
      }
    }
  }

  if (totalCountertopMm > 0) {
    const countertopMat = materials.find((m) => m.category === 'countertop');
    if (countertopMat) {
      const rft = mmToRft(totalCountertopMm);
      otherMaterialLines.push({
        key: countertopMat.sku,
        label: countertopMat.name,
        category: 'countertop',
        type: countertopMat.type,
        unit: countertopMat.unit,
        quantity: parseFloat(rft.toFixed(2)),
        rate: countertopMat.purchaseRate,
      });
    }
  }

  const allMaterialLines = [...boardMaterialLines, ...otherMaterialLines];

  // 5. Build manufacturing quantities
  // drilling count: 2 holes per hinge, 4 holes per channel
  const drillingCount = totalHinges * 2 + totalChannels * 4;
  // paint/polishing: finish areas
  let totalPaintSqm = 0;
  let totalPolishSqm = 0;
  for (const m of measuredItems) {
    if (m.item.finish?.toLowerCase() === 'pu' || m.item.finish?.toLowerCase() === 'duco') {
      totalPaintSqm += m.measurement.finishArea;
    } else if (m.item.finish?.toLowerCase() === 'veneer') {
      totalPolishSqm += m.measurement.finishArea;
    }
  }

  const manufacturingQuantities = {
    cutting: totalSheetsCut,
    cnc: 0,
    drilling: drillingCount,
    assembly: totalFurnitureUnits,
    painting: parseFloat(sqmToSqft(totalPaintSqm).toFixed(2)),
    polishing: parseFloat(sqmToSqft(totalPolishSqm).toFixed(2)),
  };

  // 6. Compute labour days
  const labourDays = deriveLabourDays({
    materialAreaSqm: totalMaterialAreaSqm,
    furnitureUnits: totalFurnitureUnits,
  });

  // 7. Assemble costing additional charges
  const additionalCharges = [];
  if (settings.additionalCharges) {
    for (const [key, val] of Object.entries(settings.additionalCharges)) {
      if (val > 0) {
        additionalCharges.push({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          type: 'flat',
          value: val,
        });
      }
    }
  }

  // 8. Run Cost Engine
  const estimateInput = {
    materialLines: allMaterialLines.map((l) => ({
      key: l.key,
      label: l.label,
      category: l.category,
      type: l.type,
      unit: l.unit,
      quantity: l.quantity,
      rate: l.rate,
    })),
    manufacturingRates: settings.manufacturingRates,
    manufacturingQuantities,
    labourRates: settings.labourRates,
    labourDays,
    additionalCharges,
    profitMargin: settings.profitMargin,
    outputGstRate: settings.taxes?.outputGstRate ?? 18,
    discount,
  };

  const estimate = estimateCost(estimateInput);

  // 9. Calculate room-wise breakdown (pro-rata distribution by room's material area ratio)
  const roomsBreakdown = rooms.map((room) => {
    // Sum material area for this room
    let roomAreaSqm = 0;
    const roomFurniture = furnitureList.filter((f) => f.roomId.toString() === room._id.toString());
    
    for (const item of roomFurniture) {
      const boardMaterial = materialsMap.get(item.materialId?.toString());
      const mResult = measureFurnitureItem(item, {
        recipes,
        boardThickness: boardMaterial?.thickness ?? 18,
      });
      roomAreaSqm += mResult.materialArea;
    }

    const ratio = totalMaterialAreaSqm > 0 ? roomAreaSqm / totalMaterialAreaSqm : 0;
    const roomTotalPaise = Math.round(estimate.pricing.totalPaise * ratio);

    return {
      roomId: room._id.toString(),
      name: room.name,
      roomTotalPaise,
    };
  });

  return {
    project,
    client,
    estimate,
    materialLines: allMaterialLines.map((l) => ({
      materialId: l.key,
      name: l.label,
      category: l.category,
      type: l.type,
      unit: l.unit,
      quantity: l.quantity - (l.wasteQty ?? 0),
      wasteQty: l.wasteQty ?? 0,
      totalQty: l.quantity,
      rate: l.rate,
    })),
    rooms: roomsBreakdown,
  };
}

function createEmptyEstimate(project, client, settings) {
  const profitMargin = settings.profitMargin ?? 25;
  const outputGstRate = settings.taxes?.outputGstRate ?? 18;
  const estimate = {
    currency: 'INR',
    lines: { material: [], manufacturing: [], labour: [], additional: [] },
    totals: { materialPaise: 0, manufacturingPaise: 0, labourPaise: 0, additionalPaise: 0, costPaise: 0 },
    pricing: {
      profitMarginPercent: profitMargin,
      marginBasePaise: 0,
      discount: null,
      taxablePaise: 0,
      outputGstRatePercent: outputGstRate,
      gstPaise: 0,
      totalPaise: 0,
      profitPaise: 0,
      profitPercent: 0,
    },
  };
  return {
    project,
    client,
    estimate,
    materialLines: [],
    rooms: [],
  };
}
