import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import { DomainError } from '../../../shared/errors.js';
import { Quotation } from '../../persistence/mongoose/models/quotation.model.js';
import { Boq } from '../../persistence/mongoose/models/boq.model.js';
import { buildReport } from './report.service.js';
import { reportToBuffer } from './report-exporter.js';

let mongo;
let uri;

const p1 = new mongoose.Types.ObjectId();
const p2 = new mongoose.Types.ObjectId();
const c1 = new mongoose.Types.ObjectId();
const c2 = new mongoose.Types.ObjectId();

/** Module 4 reference quotation, as persisted (rupees). */
const quotationDoc = (overrides = {}) => ({
  quotationNumber: 'QTN-2026-0001',
  projectId: p1,
  clientId: c1,
  status: 'sent',
  summary: { subtotal: 42425.1, discountType: null, discountValue: 0, discount: 0, taxable: 42425.1, gstRate: 18, gst: 7636.52, total: 50061.62 },
  totals: { totalCost: 33940.08, profit: 8485.02, profitPercent: 25, marginBase: 42425.1 },
  costs: {
    material: 21420,
    manufacturing: 3484,
    labour: 6900,
    additional: 2136.08,
    labourByTrade: { carpenter: 4800, painter: 900, helper: 1200 },
  },
  paymentTerms: '',
  warranty: '',
  notes: '',
  signatureUrl: null,
  issuedAt: new Date('2026-08-15T00:00:00Z'),
  validUntil: new Date('2026-09-14T00:00:00Z'),
  revisionOf: null,
  rooms: [],
  ...overrides,
});

const boqDoc = (overrides = {}) => ({
  projectId: p1,
  quotationId: new mongoose.Types.ObjectId(),
  items: [
    { materialId: 'BD-PLY-18', materialName: 'Plywood 18mm', category: 'board', type: 'plywood', unit: 'sheet', quantity: 6, wasteQty: 1, totalQty: 7, rate: 2800, amount: 19600 },
    { materialId: 'HW-HNG-01', materialName: 'Soft-Close Hinge', category: 'hardware', type: 'hinge', unit: 'pc', quantity: 12, wasteQty: 0, totalQty: 12, rate: 85, amount: 1020 },
  ],
  generatedAt: new Date('2026-08-10T00:00:00Z'),
  ...overrides,
});

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  uri = mongo.getUri();
  await mongoose.connect(uri);
  await Promise.all([Quotation.init(), Boq.init()]);

  await Quotation.create([
    quotationDoc(), // qtn-0001 sent Aug (c1, p1)
    quotationDoc({ quotationNumber: 'QTN-2026-0002', issuedAt: new Date('2026-08-20T00:00:00Z') }), // sent Aug
    quotationDoc({ quotationNumber: 'QTN-2026-0003', status: 'draft', clientId: c2, issuedAt: new Date('2026-08-25T00:00:00Z') }), // draft → excluded
    quotationDoc({ quotationNumber: 'QTN-2026-0004', status: 'accepted', projectId: p2, issuedAt: new Date('2026-09-05T00:00:00Z') }), // accepted Sep (p2)
  ]);
  await Boq.create([boqDoc(), boqDoc({ generatedAt: new Date('2026-09-06T00:00:00Z') })]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

const AUG = { from: new Date('2026-08-01T00:00:00Z'), to: new Date('2026-08-31T23:59:59Z') };

describe('buildReport', () => {
  it('sales — monthly buckets over confirmed quotations in range', async () => {
    const r = await buildReport('sales', AUG);
    expect(r.type).toBe('sales');
    expect(r.total).toMatchObject({ count: 2, revenuePaise: 2 * 5006162, gstPaise: 2 * 763652 });
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({ period: '2026-08', count: 2, revenuePaise: 2 * 5006162 });
  });

  it('sales — fills empty months in a closed range with zeros', async () => {
    const r = await buildReport('sales', { from: new Date('2026-06-01T00:00:00Z'), to: new Date('2026-09-30T00:00:00Z') });
    expect(r.rows.map((b) => b.period)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09']);
    expect(r.rows[0]).toMatchObject({ count: 0, revenuePaise: 0 });
  });

  it('profit — sums cost/revenue/profit from the snapshot', async () => {
    const r = await buildReport('profit', AUG);
    expect(r.total).toMatchObject({
      quotations: 2,
      costPaise: 2 * 3394008,
      revenuePaise: 2 * 5006162,
      profitPaise: 2 * 848502,
    });
    expect(r.total.profitMarginPercent).toBeCloseTo((848502 / 3394008) * 100, 2);
  });

  it('labour — totals labour cost + per-trade split', async () => {
    const r = await buildReport('labour', AUG);
    expect(r.total).toMatchObject({ labourPaise: 2 * 690000, quotations: 2 });
    expect(r.rows).toEqual([
      { trade: 'carpenter', amountPaise: 2 * 480000 },
      { trade: 'helper', amountPaise: 2 * 120000 },
      { trade: 'painter', amountPaise: 2 * 90000 },
    ]);
  });

  it('material — aggregates BOQ lines over generatedAt range', async () => {
    const r = await buildReport('material', AUG);
    expect(r.total.lineItems).toBe(2);
    expect(r.rows[0]).toMatchObject({ materialId: 'BD-PLY-18', totalQty: 7, amountPaise: 1960000 });
  });

  it('client — quotations for one client in range', async () => {
    const r = await buildReport('client', { clientId: c1.toString(), ...AUG });
    expect(r.total).toMatchObject({ count: 2, revenuePaise: 2 * 5006162 });
    expect(r.rows).toHaveLength(2);
  });

  it('project — quotations for one project', async () => {
    const r = await buildReport('project', { projectId: p2.toString() });
    expect(r.total.count).toBe(1);
    expect(r.rows[0]).toMatchObject({ status: 'accepted', totalPaise: 5006162 });
  });

  it('empty period → zero totals, not an error', async () => {
    const r = await buildReport('sales', { from: new Date('2020-01-01T00:00:00Z'), to: new Date('2020-01-31T00:00:00Z') });
    expect(r.total).toMatchObject({ count: 0, revenuePaise: 0, gstPaise: 0 });
    expect(r.rows[0]).toMatchObject({ count: 0, revenuePaise: 0 });
  });

  it('rejects an unknown report type with INVALID_INPUT', async () => {
    try {
      await buildReport('spreadsheet', {});
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('INVALID_INPUT');
      expect(err.details.allowed).toContain('sales');
    }
  });
});

describe('reportToBuffer', () => {
  it('produces a valid xlsx workbook with header + totals', async () => {
    const report = await buildReport('sales', AUG);
    const buf = await reportToBuffer(report);
    expect(buf.subarray(0, 2).toString()).toBe('PK');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    expect(ws.getCell(1, 1).value).toBe('Sales Report');
    expect(ws.getCell(4, 1).value).toBe('Period'); // header row
    expect(ws.getCell(4, 3).value).toBe('Revenue (₹)');
    expect(ws.getCell(5, 3).value).toBe(100123.24); // 2 × 50061.62
  });

  it('renders an empty-period report as a valid workbook with zero totals', async () => {
    const report = await buildReport('material', { from: new Date('2020-01-01T00:00:00Z'), to: new Date('2020-01-31T00:00:00Z') });
    const buf = await reportToBuffer(report);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    expect(ws.getCell(1, 1).value).toBe('Material Report');
    // No-data note (row 5 after title/subtitle/blank/header) + zero totals row.
    expect(ws.getCell(5, 1).value).toBe('No data');
    expect(ws.getCell(6, 2).value).toBe('TOTAL');
    expect(ws.getCell(6, 8).value).toBe(0);
  });
});
