import { describe, it, expect } from 'vitest';
import {
  aggregateSales,
  aggregateProfit,
  aggregateLabour,
  aggregateMaterial,
  aggregateClient,
  aggregateProject,
  monthKey,
  monthLabel,
  monthsInRange,
} from './report.aggregators.js';

/** Module 4 reference quotation row (paise). */
const row = (overrides = {}) => ({
  quotationId: 'q1',
  quotationNumber: 'QTN-2026-0001',
  projectId: 'p1',
  clientId: 'c1',
  status: 'sent',
  issuedAt: new Date('2026-08-15T00:00:00Z'),
  summary: { subtotalPaise: 4242510, discountPaise: 0, taxablePaise: 4242510, gstPaise: 763652, totalPaise: 5006162 },
  totals: { totalCostPaise: 3394008, marginBasePaise: 4242510, profitPaise: 848502 },
  costs: {
    materialPaise: 2142000,
    manufacturingPaise: 348400,
    labourPaise: 690000,
    additionalPaise: 213608,
    labourByTradePaise: { carpenter: 480000, painter: 90000, helper: 120000 },
  },
  ...overrides,
});

const boqRow = (overrides = {}) => ({
  date: new Date('2026-08-10T00:00:00Z'),
  materialId: 'BD-PLY-18',
  materialName: 'Plywood 18mm',
  category: 'board',
  type: 'plywood',
  unit: 'sheet',
  quantity: 6,
  wasteQty: 1,
  totalQty: 7,
  ratePaise: 280000,
  amountPaise: 1960000,
  ...overrides,
});

describe('month helpers', () => {
  it('derives UTC month keys and labels', () => {
    expect(monthKey(new Date('2026-08-31T23:59:00Z'))).toBe('2026-08');
    expect(monthLabel('2026-08')).toBe('Aug 2026');
  });

  it('enumerates every month in a closed range', () => {
    expect(monthsInRange(new Date('2026-07-01'), new Date('2026-09-01'))).toEqual([
      '2026-07',
      '2026-08',
      '2026-09',
    ]);
    expect(monthsInRange(new Date('2026-07-01'), undefined)).toBeNull();
  });
});

describe('aggregateSales', () => {
  const rows = [
    row({ issuedAt: new Date('2026-08-01T00:00:00Z') }),
    row({ quotationId: 'q2', issuedAt: new Date('2026-08-20T00:00:00Z') }),
    row({ quotationId: 'q3', status: 'draft', issuedAt: new Date('2026-08-25T00:00:00Z') }),
    row({ quotationId: 'q4', issuedAt: new Date('2026-09-05T00:00:00Z') }),
  ];

  it('totals revenue/GST/count over confirmed quotations only', () => {
    const r = aggregateSales(rows);
    expect(r.total).toMatchObject({ count: 3, revenuePaise: 3 * 5006162, gstPaise: 3 * 763652 });
    expect(r.total.avgOrderValuePaise).toBe(5006162);
  });

  it('buckets by month, excluding drafts', () => {
    const r = aggregateSales(rows);
    const byPeriod = Object.fromEntries(r.rows.map((b) => [b.period, b]));
    expect(byPeriod['2026-08']).toMatchObject({ count: 2, revenuePaise: 2 * 5006162 });
    expect(byPeriod['2026-09']).toMatchObject({ count: 1, revenuePaise: 5006162 });
  });

  it('fills empty months in a closed range with zeros', () => {
    const r = aggregateSales(rows, { from: new Date('2026-06-01'), to: new Date('2026-09-30') });
    expect(r.rows.map((b) => b.period)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09']);
    expect(r.rows[0]).toMatchObject({ count: 0, revenuePaise: 0, gstPaise: 0 });
  });

  it('supports groupBy none (single total, no buckets)', () => {
    const r = aggregateSales(rows, { groupBy: 'none' });
    expect(r.rows).toEqual([]);
    expect(r.total.count).toBe(3);
  });
});

describe('aggregateProfit', () => {
  it('sums cost/revenue/profit and derives margin %', () => {
    const rows = [
      row(),
      row({ quotationId: 'q2', totals: { totalCostPaise: 1000000, marginBasePaise: 1250000, profitPaise: 250000 }, summary: { ...row().summary, totalPaise: 1475000 } }),
    ];
    const r = aggregateProfit(rows);
    expect(r.total).toMatchObject({
      quotations: 2,
      costPaise: 3394008 + 1000000,
      profitPaise: 848502 + 250000,
    });
    expect(r.total.revenuePaise).toBe(5006162 + 1475000);
    expect(r.total.profitMarginPercent).toBeCloseTo(
      (848502 + 250000) / (3394008 + 1000000) * 100,
      2
    );
  });

  it('returns zero margin on zero cost (empty/zero rows)', () => {
    expect(aggregateProfit([]).total).toMatchObject({ quotations: 0, costPaise: 0, profitPaise: 0, profitMarginPercent: 0 });
  });
});

describe('aggregateLabour', () => {
  it('totals labour and breaks down per trade, sorted by amount desc', () => {
    const rows = [row(), row({ quotationId: 'q2', costs: { labourByTradePaise: { carpenter: 100000, painter: 50000 } } })];
    const r = aggregateLabour(rows);
    expect(r.total.labourPaise).toBe(690000 + 150000);
    expect(r.total.quotations).toBe(2);
    expect(r.rows).toEqual([
      { trade: 'carpenter', amountPaise: 580000 },
      { trade: 'painter', amountPaise: 140000 },
      { trade: 'helper', amountPaise: 120000 },
    ]);
  });

  it('returns zero totals on empty input', () => {
    const r = aggregateLabour([]);
    expect(r.total).toMatchObject({ labourPaise: 0, quotations: 0 });
    expect(r.rows).toEqual([]);
  });
});

describe('aggregateMaterial', () => {
  it('groups BOQ lines by material, summing qty/waste/amount, sorted by spend desc', () => {
    const rows = [
      boqRow({ materialId: 'HW-HNG-01', materialName: 'Soft-Close Hinge', category: 'hardware', unit: 'pc', quantity: 12, wasteQty: 0, totalQty: 12, ratePaise: 8500, amountPaise: 102000 }),
      boqRow({ materialId: 'BD-PLY-18', materialName: 'Plywood 18mm', quantity: 6, wasteQty: 1, totalQty: 7, amountPaise: 1960000 }),
      boqRow({ materialId: 'BD-PLY-18', materialName: 'Plywood 18mm', quantity: 3, wasteQty: 0, totalQty: 3, amountPaise: 840000 }),
    ];
    const r = aggregateMaterial(rows);
    expect(r.total).toMatchObject({ lineItems: 2, amountPaise: 1960000 + 840000 + 102000 });
    expect(r.rows[0]).toMatchObject({ materialId: 'BD-PLY-18', quantity: 9, wasteQty: 1, totalQty: 10, amountPaise: 2800000, quotations: 2 });
    expect(r.rows[1]).toMatchObject({ materialId: 'HW-HNG-01', quantity: 12 });
  });

  it('filters by generatedAt range', () => {
    const rows = [
      boqRow({ date: new Date('2026-07-01T00:00:00Z') }),
      boqRow({ date: new Date('2026-08-01T00:00:00Z') }),
    ];
    const r = aggregateMaterial(rows, { from: new Date('2026-08-01T00:00:00Z'), to: new Date('2026-08-31T00:00:00Z') });
    expect(r.total.amountPaise).toBe(1960000);
  });
});

describe('aggregateClient / aggregateProject', () => {
  const rows = [
    row(),
    row({ quotationId: 'q2', projectId: 'p2', issuedAt: new Date('2026-09-01T00:00:00Z') }),
    row({ quotationId: 'q3', status: 'draft', issuedAt: new Date('2026-09-10T00:00:00Z') }),
  ];

  it('client report filters by clientId and lists quotations newest first', () => {
    const r = aggregateClient(rows, { clientId: 'c1' });
    expect(r.total).toMatchObject({ count: 2, revenuePaise: 2 * 5006162 });
    expect(r.rows.map((x) => x.quotationId)).toEqual(['q2', 'q1']);
    expect(r.rows[0]).toMatchObject({ quotationNumber: 'QTN-2026-0001', status: 'sent', totalPaise: 5006162 });
  });

  it('project report filters by projectId', () => {
    const r = aggregateProject(rows, { projectId: 'p2' });
    expect(r.total.count).toBe(1);
    expect(r.rows[0].quotationId).toBe('q2');
  });

  it('empty rows → zero totals, not an error', () => {
    expect(aggregateClient([], { clientId: 'c1' }).total).toMatchObject({ count: 0, revenuePaise: 0 });
    expect(aggregateProject([], { projectId: 'p1' }).total).toMatchObject({ count: 0, revenuePaise: 0 });
  });
});
