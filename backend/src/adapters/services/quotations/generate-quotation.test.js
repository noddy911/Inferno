import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { logger } from '../../../config/logger.js';
import { DEFAULT_SETTINGS } from '../../persistence/mongoose/models/settings.model.js';
import { Quotation } from '../../persistence/mongoose/models/quotation.model.js';
import { Boq } from '../../persistence/mongoose/models/boq.model.js';
import { Counter } from '../../persistence/mongoose/models/counter.model.js';
import { generateQuotation } from './generate-quotation.js';

let replSet;
let uri;

/** Reference pricing from Module 4 (cost 3,394,008; 25% margin; 18% GST). */
const estimate = {
  currency: 'INR',
  lines: {
    material: [],
    manufacturing: [],
    labour: [
      { key: 'carpenter', label: 'Carpenter', unit: 'day', quantity: 4, ratePaise: 120000, amountPaise: 480000 },
      { key: 'painter', label: 'Painter', unit: 'day', quantity: 1, ratePaise: 90000, amountPaise: 90000 },
      { key: 'helper', label: 'Helper', unit: 'day', quantity: 2, ratePaise: 60000, amountPaise: 120000 },
    ],
    additional: [],
  },
  totals: {
    materialPaise: 2142000,
    manufacturingPaise: 348400,
    labourPaise: 690000,
    additionalPaise: 213608,
    costPaise: 3394008,
  },
  pricing: {
    profitMarginPercent: 25,
    marginBasePaise: 4242510,
    discount: null,
    taxablePaise: 4242510,
    outputGstRatePercent: 18,
    gstPaise: 763652,
    totalPaise: 5006162,
    profitPaise: 848502,
    profitPercent: 25,
  },
};

const materialLines = [
  { materialId: 'BD-PLY-18', name: 'Plywood 18mm', category: 'board', type: 'plywood', unit: 'sheet', quantity: 6, wasteQty: 1, rate: 2800 },
  { materialId: 'HW-HNG-01', name: 'Soft-Close Hinge', category: 'hardware', type: 'hinge', unit: 'pc', quantity: 12, wasteQty: 0, rate: 85 },
];

const projectId = new mongoose.Types.ObjectId().toString(); // domain input is a string; persistence casts to ObjectId
const clientId = new mongoose.Types.ObjectId().toString();
const ISSUED_AT = new Date('2026-08-01T00:00:00Z');

const args = (overrides = {}) => ({
  projectId,
  clientId,
  estimate,
  materialLines,
  config: {
    paymentTerms: DEFAULT_SETTINGS.paymentTerms,
    warranty: DEFAULT_SETTINGS.warranty,
    notes: 'Prices valid for 30 days.',
    validUntilDays: 30,
    issuedAt: ISSUED_AT,
  },
  settings: DEFAULT_SETTINGS,
  client: { name: 'Acme Interiors', address: '12 MG Road, Mumbai', phone: '+91 98765 43210' },
  project: { projectName: 'Villa Panvel', siteAddress: 'Plot 12, Sector 4, Panvel' },
  ...overrides,
});

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    // Transactions default to a 5ms lock-wait budget; parallel generates need more headroom.
    instanceOpts: [{ args: ['--setParameter', 'maxTransactionLockRequestTimeoutMillis=5000'] }],
  });
  uri = replSet.getUri();
  await mongoose.connect(uri);
  // Pre-create collections + indexes BEFORE any transaction runs: MongoDB refuses writes
  // that trigger catalog changes (auto-create) inside a transaction.
  await Promise.all([Quotation.init(), Boq.init(), Counter.init()]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

describe('generateQuotation — persisted snapshot', () => {
  it('writes quotation + boq with the frozen pricing snapshot', async () => {
    const result = await generateQuotation(args());

    // Domain result (paise) keeps the snapshot and display blocks.
    expect(result.quotation.quotationNumber).toBe('QTN-2026-0001');
    expect(result.quotation.status).toBe('draft');
    expect(result.quotation.issuedAt.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(result.quotation.validUntil.toISOString()).toBe('2026-08-31T00:00:00.000Z');
    expect(result.quotation.summary.totalPaise).toBe(5006162);
    expect(result.quotation.totals.profitPaise).toBe(848502);
    expect(result.boq.items).toHaveLength(2);
    expect(result.quotation.company).toMatchObject({
      companyName: 'Spaces & Panels Interiors',
      gstNumber: '27ABCDE1234F1Z5',
    });
    expect(result.quotation.client).toMatchObject({ name: 'Acme Interiors' });
    expect(result.quotation.project).toMatchObject({ projectName: 'Villa Panvel' });

    // Persisted quotation stores the display-rupee snapshot (never recomputed later).
    const saved = await Quotation.findById(result.quotationId);
    expect(saved).not.toBeNull();
    expect(saved.quotationNumber).toBe('QTN-2026-0001');
    expect(saved.status).toBe('draft');
    expect(saved.summary).toMatchObject({
      subtotal: 42425.1,
      taxable: 42425.1,
      gstRate: 18,
      total: 50061.62,
    });
    expect(saved.summary.gst).toBeCloseTo(7636.52, 2);
    expect(saved.totals).toMatchObject({ totalCost: 33940.08, profit: 8485.02, marginBase: 42425.1 });
    // Cost-component snapshot persisted for reports (labour/material/profit).
    expect(saved.costs).toMatchObject({ material: 21420, manufacturing: 3484, labour: 6900, additional: 2136.08 });
    expect(saved.costs.labourByTrade).toMatchObject({ carpenter: 4800, painter: 900, helper: 1200 });
    expect(saved.paymentTerms).toBe(DEFAULT_SETTINGS.paymentTerms);

    // Persisted boq mirrors the snapshot lines 1:1.
    const boq = await Boq.findOne({ quotationId: result.quotationId });
    expect(boq).not.toBeNull();
    expect(boq.projectId.toString()).toBe(projectId.toString());
    expect(boq.items).toHaveLength(2);
    const [ply, hinge] = boq.items;
    expect(ply).toMatchObject({ materialName: 'Plywood 18mm', totalQty: 7, rate: 2800 });
    expect(ply.amount).toBeCloseTo(19600, 2);
    expect(hinge).toMatchObject({ materialName: 'Soft-Close Hinge', totalQty: 12, rate: 85 });
  });
});

describe('generateQuotation — concurrency', () => {
  it('issues unique numbers under parallel generation', async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => generateQuotation(args()))
    );
    const numbers = results.map((r) => r.quotation.quotationNumber);
    expect(new Set(numbers).size).toBe(10);

    const persisted = await Quotation.find({}).sort({ quotationNumber: 1 });
    expect(persisted).toHaveLength(11); // 1 from the snapshot test + 10 here
  });
});

describe('generateQuotation — BOQ rate conflict', () => {
  it('aborts and logs full context (project/material/rates/sources)', async () => {
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => {});

    let caught;
    try {
      await generateQuotation(
        args({
          projectId: 'p1',
          materialLines: [
            { materialId: 'BD-PLY-18', name: 'Ply', category: 'board', type: 'plywood', unit: 'sheet', quantity: 1, wasteQty: 0, rate: 2800, source: { projectId: 'p1', roomId: 'r1', furnitureId: 'f1', panel: 'side' } },
            { materialId: 'BD-PLY-18', name: 'Ply', category: 'board', type: 'plywood', unit: 'sheet', quantity: 1, wasteQty: 0, rate: 2900, source: { projectId: 'p1', roomId: 'r2', furnitureId: 'f2', panel: 'top' } },
          ],
        })
      );
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(caught.code).toBe('BOQ_RATE_CONFLICT');
    expect(caught.details).toMatchObject({ materialId: 'BD-PLY-18', rates: [2800, 2900] });
    expect(caught.details.sources).toHaveLength(2);
    expect(caught.details.sources[0]).toMatchObject({ projectId: 'p1', roomId: 'r1', furnitureId: 'f1', panel: 'side' });

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('BOQ_RATE_CONFLICT'),
      expect.objectContaining({
        projectId: 'p1',
        materialId: 'BD-PLY-18',
        rates: [2800, 2900],
        sources: expect.any(Array),
      })
    );
    spy.mockRestore();
  });
});
