/**
 * seed-engines — realistic sample data so the Phase 3 calculation pipeline can be
 * exercised end-to-end without the Phase 2 UI (design §13).
 *
 *   npm run seed:engines
 *
 * Idempotent: re-running upserts by natural key and never duplicates rows.
 * `buildSeedData()` is pure (testable); `seedEngines()` connects + persists.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import {
  Client,
  Project,
  Room,
  Furniture,
  Material,
  Settings,
  DEFAULT_SETTINGS,
} from './adapters/persistence/mongoose/models/index.js';

/**
 * Build the full seed fixture set as plain objects (no DB access).
 * @returns {{
 *   clients: object[], projects: object[], rooms: object[], furniture: object[],
 *   materials: object[], settings: object
 * }}
 */
export function buildSeedData() {
  const clients = [
    {
      name: 'Rajesh & Meera Sharma',
      phone: '+91 98200 12345',
      email: 'rajesh.sharma@example.com',
      address: '14 Palm Grove, Andheri West, Mumbai 400058',
      gstNumber: '27AABCS1234F1Z2',
      notes: 'Prefers laminate finishes; budget conscious.',
    },
    {
      name: 'Anita & David Baker',
      phone: '+91 99870 54321',
      email: 'anita.baker@example.com',
      address: '7 Cedar Lane, Koramangala, Bengaluru 560034',
      gstNumber: '29AABCR9876K1Z8',
      notes: 'High-end finishes; quartz countertop preferred.',
    },
  ];

  // Designer reference (created by src/seed.js) — resolved to an id at seed time.
  const projects = [
    {
      key: 'villa-sunlight',
      projectName: 'Villa Sunlight — 3BHK Interior',
      clientEmail: 'rajesh.sharma@example.com',
      designerEmail: 'designer@example.com',
      siteAddress: '14 Palm Grove, Andheri West, Mumbai 400058',
      status: 'design',
      timeline: '2026-09-15T00:00:00.000Z',
      notes: 'Full 3-bedroom interior package.',
    },
    {
      key: 'baker-kitchen',
      projectName: 'The Baker Residence — Modular Kitchen',
      clientEmail: 'anita.baker@example.com',
      designerEmail: 'designer@example.com',
      siteAddress: '7 Cedar Lane, Koramangala, Bengaluru 560034',
      status: 'in-progress',
      timeline: '2026-10-01T00:00:00.000Z',
      notes: 'Modular kitchen with quartz countertop.',
    },
  ];

  const rooms = [
    { projectKey: 'villa-sunlight', key: 'master-bedroom', name: 'Master Bedroom', width: 4000, length: 3600, height: 2900, wallFinish: 'PU', floorFinish: 'Vitrified Tiles', ceilingFinish: 'POP' },
    { projectKey: 'villa-sunlight', key: 'kids-bedroom', name: 'Kids Bedroom', width: 3200, length: 3000, height: 2900, wallFinish: 'Laminate', floorFinish: 'Vitrified Tiles', ceilingFinish: 'POP' },
    { projectKey: 'villa-sunlight', key: 'living-room', name: 'Living Room', width: 5000, length: 4200, height: 2900, wallFinish: 'Emulsion', floorFinish: 'Marble', ceilingFinish: 'POP' },
    { projectKey: 'baker-kitchen', key: 'kitchen', name: 'Modular Kitchen', width: 4200, length: 3200, height: 2900, wallFinish: 'Acrylic Panel', floorFinish: 'Vitrified Tiles', ceilingFinish: 'False Ceiling' },
  ];

  const furniture = [
    // Master bedroom
    { roomKey: 'master-bedroom', name: 'Wardrobe 8ft', category: 'wardrobe', width: 2400, height: 2400, depth: 600, shelves: 4, drawers: 2, shutters: 4, quantity: 1, materialSku: 'BD-PLY-18', finish: 'Laminate' },
    { roomKey: 'master-bedroom', name: 'Queen Bed', category: 'bed', width: 1800, height: 450, depth: 2000, shelves: 0, drawers: 2, shutters: 0, quantity: 1, materialSku: 'BD-PLY-18', finish: 'PU' },
    { roomKey: 'master-bedroom', name: 'Dressing Vanity', category: 'vanity', width: 1200, height: 750, depth: 500, shelves: 1, drawers: 2, shutters: 0, quantity: 1, materialSku: 'BD-PLY-18', finish: 'Laminate' },
    // Kids bedroom
    { roomKey: 'kids-bedroom', name: 'Wardrobe 6.5ft', category: 'wardrobe', width: 2000, height: 2400, depth: 600, shelves: 3, drawers: 2, shutters: 4, quantity: 1, materialSku: 'BD-PLY-18', finish: 'Laminate' },
    { roomKey: 'kids-bedroom', name: 'Study Table', category: 'study-table', width: 1200, height: 750, depth: 600, shelves: 2, drawers: 1, shutters: 0, quantity: 1, materialSku: 'BD-PLY-18', finish: 'Laminate' },
    { roomKey: 'kids-bedroom', name: 'Loft Bed', category: 'loft', width: 900, height: 2000, depth: 1900, shelves: 0, drawers: 0, shutters: 0, quantity: 1, materialSku: 'BD-PLY-18', finish: 'PU' },
    // Living room
    { roomKey: 'living-room', name: 'TV Unit', category: 'tv-unit', width: 2400, height: 450, depth: 400, shelves: 2, drawers: 0, shutters: 2, quantity: 1, materialSku: 'BD-PLY-18', finish: 'Acrylic' },
    { roomKey: 'living-room', name: '6-Seater Dining Table', category: 'dining', width: 1800, height: 760, depth: 900, shelves: 0, drawers: 0, shutters: 0, quantity: 1, materialSku: 'BD-PLY-18', finish: 'Veneer' },
    // Modular kitchen — counts are PER-MODULE (recipe sub-assemblies scale via ceil(width/600))
    { roomKey: 'kitchen', name: 'Kitchen Base Run', category: 'kitchen', width: 3600, height: 720, depth: 450, shelves: 1, drawers: 1, shutters: 0, quantity: 1, materialSku: 'BD-HDHMR-18', finish: 'Acrylic' },
    { roomKey: 'kitchen', name: 'Kitchen Wall Cabinets', category: 'kitchen', width: 3600, height: 720, depth: 350, shelves: 1, drawers: 0, shutters: 0, quantity: 1, materialSku: 'BD-HDHMR-18', finish: 'Acrylic' },
  ];

  const materials = [
    // Boards
    { sku: 'BD-PLY-12', name: '12mm BWP Plywood', category: 'board', type: 'plywood', brand: 'Greenply', thickness: 12, sheetSize: { width: 2440, height: 1220 }, unit: 'sheet', purchaseRate: 1450, sellingRate: 1800, gst: 18, supplier: 'Greenply' },
    { sku: 'BD-PLY-18', name: '18mm BWP Plywood', category: 'board', type: 'plywood', brand: 'Greenply', thickness: 18, sheetSize: { width: 2440, height: 1220 }, unit: 'sheet', purchaseRate: 2050, sellingRate: 2600, gst: 18, supplier: 'Greenply' },
    { sku: 'BD-MDF-18', name: '18mm MDF', category: 'board', type: 'mdf', brand: 'Century', thickness: 18, sheetSize: { width: 2440, height: 1220 }, unit: 'sheet', purchaseRate: 1600, sellingRate: 2100, gst: 18, supplier: 'Century' },
    { sku: 'BD-HDHMR-18', name: '18mm HDHMR Board', category: 'board', type: 'hdhmr', brand: 'Greenply', thickness: 18, sheetSize: { width: 2440, height: 1220 }, unit: 'sheet', purchaseRate: 1750, sellingRate: 2300, gst: 18, supplier: 'Greenply' },
    { sku: 'BD-PAR-18', name: '18mm Particle Board', category: 'board', type: 'particle', brand: 'Century', thickness: 18, sheetSize: { width: 2440, height: 1220 }, unit: 'sheet', purchaseRate: 900, sellingRate: 1200, gst: 18, supplier: 'Century' },
    { sku: 'BD-BACK-3', name: '3mm Back Board (Ply)', category: 'board', type: 'plywood', brand: 'Greenply', thickness: 3, sheetSize: { width: 2440, height: 1220 }, unit: 'sheet', purchaseRate: 320, sellingRate: 450, gst: 18, supplier: 'Greenply' },
    { sku: 'BD-BACK-6', name: '6mm Back Board (Ply)', category: 'board', type: 'plywood', brand: 'Greenply', thickness: 6, sheetSize: { width: 2440, height: 1220 }, unit: 'sheet', purchaseRate: 520, sellingRate: 700, gst: 18, supplier: 'Greenply' },
    // Finishes
    { sku: 'FN-LAM-1', name: 'Laminate 1mm', category: 'finish', type: 'laminate', brand: 'Merino', thickness: 1, unit: 'sqft', purchaseRate: 55, sellingRate: 95, gst: 18, supplier: 'Merino' },
    { sku: 'FN-ACR-1', name: 'Acrylic Panel (18mm faced)', category: 'finish', type: 'acrylic', brand: 'Formica', unit: 'sqft', purchaseRate: 120, sellingRate: 190, gst: 18, supplier: 'Formica' },
    { sku: 'FN-VEN-1', name: 'Veneer', category: 'finish', type: 'veneer', brand: 'Greenply', unit: 'sqft', purchaseRate: 65, sellingRate: 120, gst: 18, supplier: 'Greenply' },
    { sku: 'FN-PU-1', name: 'PU Paint', category: 'finish', type: 'pu', brand: 'Asian', unit: 'sqft', purchaseRate: 30, sellingRate: 60, gst: 18, supplier: 'Asian Paints' },
    { sku: 'FN-DUCO-1', name: 'Duco Paint', category: 'finish', type: 'duco', brand: 'Nippon', unit: 'sqft', purchaseRate: 45, sellingRate: 85, gst: 18, supplier: 'Nippon' },
    { sku: 'FN-MEM-1', name: 'Membrane Finish', category: 'finish', type: 'membrane', brand: 'Wynter', unit: 'sqft', purchaseRate: 70, sellingRate: 130, gst: 18, supplier: 'Wynter' },
    // Hardware
    { sku: 'HW-HNG-01', name: 'Soft-Close Hinge', category: 'hardware', type: 'hinge', brand: 'Hafele', unit: 'pc', purchaseRate: 65, sellingRate: 120, gst: 18, supplier: 'Hafele' },
    { sku: 'HW-CHN-01', name: '3-Fold Drawer Channel', category: 'hardware', type: 'channel', brand: 'Hettich', unit: 'pc', purchaseRate: 90, sellingRate: 160, gst: 18, supplier: 'Hettich' },
    { sku: 'HW-HND-01', name: 'SS Handle', category: 'hardware', type: 'handle', brand: 'Ebco', unit: 'pc', purchaseRate: 55, sellingRate: 110, gst: 18, supplier: 'Ebco' },
    { sku: 'HW-LCK-01', name: 'Aluminium Lock', category: 'hardware', type: 'lock', brand: 'Godrej', unit: 'pc', purchaseRate: 120, sellingRate: 220, gst: 18, supplier: 'Godrej' },
    { sku: 'HW-CON-01', name: 'Connector Bolt', category: 'hardware', type: 'connector', brand: 'Ebco', unit: 'pc', purchaseRate: 12, sellingRate: 25, gst: 18, supplier: 'Ebco' },
    // Countertops
    { sku: 'CT-GRN-01', name: 'Granite 20mm', category: 'countertop', type: 'granite', brand: 'RK Marble', thickness: 20, unit: 'rft', purchaseRate: 900, sellingRate: 1400, gst: 18, supplier: 'RK Marble' },
    { sku: 'CT-QTZ-01', name: 'Quartz 20mm', category: 'countertop', type: 'quartz', brand: 'Caesarstone', thickness: 20, unit: 'rft', purchaseRate: 1500, sellingRate: 2300, gst: 18, supplier: 'Caesarstone' },
    { sku: 'CT-MRB-01', name: 'Marble 20mm', category: 'countertop', type: 'marble', brand: 'RK Marble', thickness: 20, unit: 'rft', purchaseRate: 1100, sellingRate: 1800, gst: 18, supplier: 'RK Marble' },
    // Other
    { sku: 'OT-GLS-01', name: 'Toughened Glass 5mm', category: 'other', type: 'glass', brand: 'Saint-Gobain', thickness: 5, unit: 'sqft', purchaseRate: 90, sellingRate: 150, gst: 18, supplier: 'Saint-Gobain' },
    { sku: 'OT-MIR-01', name: 'Mirror 5mm', category: 'other', type: 'mirror', brand: 'Asahi', thickness: 5, unit: 'sqft', purchaseRate: 60, sellingRate: 110, gst: 18, supplier: 'Asahi' },
  ];

  return { clients, projects, rooms, furniture, materials, settings: DEFAULT_SETTINGS };
}

/** @param {object} doc @param {string[]} keys */
function pick(doc, keys) {
  const out = {};
  for (const key of keys) out[key] = doc[key];
  return out;
}

/**
 * Persist the seed set. Idempotent by natural key; re-runs update existing rows.
 * @param {{ mongoUri?: string }} [options]
 */
export async function seedEngines({ mongoUri } = {}) {
  const uri = mongoUri ?? process.env.MONGODB_URI;
  if (!uri) throw new Error('seed-engines: MONGODB_URI is required');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  const data = buildSeedData();

  // Resolve users for the designer ref (created by src/seed.js); null when absent.
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  const byEmail = new Map(users.map((u) => [u.email, u._id]));

  const counts = {
    clients: 0,
    projects: 0,
    rooms: 0,
    furniture: 0,
    materials: 0,
    settings: 0,
  };

  for (const client of data.clients) {
    await Client.findOneAndUpdate({ email: client.email }, { $set: client }, { upsert: true });
    counts.clients += 1;
  }

  /** @type {Map<string, import('mongoose').Types.ObjectId>} */
  const projectIds = new Map();
  for (const project of data.projects) {
    const client = await Client.findOne({ email: project.clientEmail });
    const clientId = client ? client._id : null;
    const designerId = byEmail.get(project.designerEmail) ?? null;
    const doc = {
      ...pick(project, ['projectName', 'siteAddress', 'status', 'timeline', 'notes']),
      clientId,
      designerId,
    };
    await Project.findOneAndUpdate({ projectName: project.projectName }, { $set: doc }, { upsert: true });
    const saved = await Project.findOne({ projectName: project.projectName });
    projectIds.set(project.key, saved._id);
    counts.projects += 1;
  }

  /** @type {Map<string, import('mongoose').Types.ObjectId>} */
  const roomIds = new Map();
  for (const room of data.rooms) {
    const projectId = projectIds.get(room.projectKey);
    const doc = pick(room, ['name', 'width', 'length', 'height', 'wallFinish', 'floorFinish', 'ceilingFinish']);
    await Room.findOneAndUpdate(
      { projectId, name: room.name },
      { $set: { ...doc, projectId } },
      { upsert: true }
    );
    const saved = await Room.findOne({ projectId, name: room.name });
    roomIds.set(room.key, saved._id);
    counts.rooms += 1;
  }

  for (const material of data.materials) {
    await Material.findOneAndUpdate({ sku: material.sku }, { $set: material }, { upsert: true });
    counts.materials += 1;
  }
  const materialBySku = new Map(
    (await Material.find({})).map((m) => [m.sku, m._id])
  );

  for (const item of data.furniture) {
    const roomId = roomIds.get(item.roomKey);
    const materialId = materialBySku.get(item.materialSku) ?? null;
    const doc = {
      ...pick(item, ['name', 'category', 'width', 'height', 'depth', 'shelves', 'drawers', 'shutters', 'quantity', 'finish']),
      roomId,
      materialId,
    };
    await Furniture.findOneAndUpdate(
      { roomId, name: item.name },
      { $set: doc },
      { upsert: true }
    );
    counts.furniture += 1;
  }

  await Settings.findOneAndUpdate({ _id: 'company' }, { $set: data.settings }, { upsert: true });
  counts.settings = 1;

  await mongoose.disconnect();
  return counts;
}

// CLI entry: `npm run seed:engines`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedEngines()
    .then((counts) => {
      console.log('[seed-engines] done:', counts);
    })
    .catch((err) => {
      console.error(`[seed-engines] failed: ${err.message}`);
      process.exit(1);
    });
}
