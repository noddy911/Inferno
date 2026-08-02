import { describe, it, expect } from 'vitest';
import { buildBoq } from './boq.service.js';
import { DomainError } from '../../shared/errors.js';
import { toMajor } from '../../shared/money.js';

/** Material lines as the costing engine / adapter would feed them (waste from cutting). */
const baseLines = [
  {
    materialId: 'BD-PLY-18',
    name: 'Plywood 18mm',
    category: 'board',
    type: 'plywood',
    unit: 'sheet',
    quantity: 6,
    wasteQty: 1,
    rate: 2800,
  },
  {
    materialId: 'BD-PLY-18',
    name: 'Plywood 18mm',
    category: 'board',
    type: 'plywood',
    unit: 'sheet',
    quantity: 4,
    wasteQty: 0.5,
    rate: 2800,
  },
  {
    materialId: 'HW-HINGE',
    name: 'Hinges',
    category: 'hardware',
    type: 'hinge',
    unit: 'pc',
    quantity: 12,
    wasteQty: 0,
    rate: 85,
  },
  {
    materialId: 'FN-LAM',
    name: 'Laminate',
    category: 'finish',
    type: 'laminate',
    unit: 'sqft',
    quantity: 30,
    wasteQty: 2.25,
    rate: 120,
  },
  {
    materialId: 'CT-GRAN',
    name: 'Granite countertop',
    category: 'countertop',
    type: 'granite',
    unit: 'rft',
    quantity: 10,
    wasteQty: 0.2,
    rate: 450,
  },
];

describe('buildBoq — grouping & pricing', () => {
  const result = buildBoq({ items: baseLines });

  it('groups duplicate materials into one line and sums quantity + wasteQty', () => {
    expect(result.items).toHaveLength(4);
    const ply = result.items.find((l) => l.materialId === 'BD-PLY-18');
    expect(ply).toMatchObject({
      quantity: 10, // 6 + 4
      wasteQty: 1.5, // 1 + 0.5
      totalQty: 11.5, // quantity + wasteQty
      unit: 'sheet',
      rate: 2800,
    });
    expect(ply.ratePaise).toBe(280000);
  });

  it('prices each line as totalQty × rate in integer paise', () => {
    const byId = Object.fromEntries(result.items.map((l) => [l.materialId, l]));
    expect(byId['BD-PLY-18'].amountPaise).toBe(3220000); // 11.5 × 280000
    expect(byId['HW-HINGE'].amountPaise).toBe(102000); // 12 × 8500
    expect(byId['FN-LAM'].amountPaise).toBe(387000); // 32.25 × 12000
    expect(byId['CT-GRAN'].amountPaise).toBe(459000); // 10.2 × 45000
  });

  it('sums the whole BOQ exactly in paise', () => {
    const expectedPaise = 3220000 + 102000 + 387000 + 459000;
    expect(result.totals.amountPaise).toBe(expectedPaise);
    expect(result.totals.amount).toBeCloseTo(toMajor(expectedPaise), 2);
    expect(result.totals.lineCount).toBe(4);
    expect(result.empty).toBe(false);
    expect(result.notes).toEqual([]);
  });

  it('sorts lines by category → type → name', () => {
    expect(result.items.map((l) => l.materialId)).toEqual([
      'BD-PLY-18', // board
      'CT-GRAN', // countertop
      'FN-LAM', // finish
      'HW-HINGE', // hardware
    ]);
  });

  it('echoes the currency', () => {
    expect(buildBoq({ items: baseLines, currency: 'INR' }).currency).toBe('INR');
  });
});

describe('buildBoq — rounding & precision', () => {
  it('rounds a fractional rate once (2-dp rate, exact paise)', () => {
    const { items } = buildBoq({
      items: [
        { materialId: 'M1', name: 'Edge band', category: 'finish', type: 'laminates', unit: 'rft', quantity: 3, wasteQty: 1, rate: 63.08 },
      ],
    });
    expect(items[0].totalQty).toBe(4);
    expect(items[0].amountPaise).toBe(25232); // round(4 × 6308)
    expect(items[0].amount).toBeCloseTo(252.32, 2);
  });

  it('handles fractional sqft quantities without quantity rounding', () => {
    const { items } = buildBoq({
      items: [
        { materialId: 'M2', name: 'Acrylic', category: 'finish', type: 'acrylic', unit: 'sqft', quantity: 30.5, wasteQty: 1.25, rate: 120 },
      ],
    });
    expect(items[0].totalQty).toBe(31.75); // exact decimal, not rounded
    expect(items[0].amountPaise).toBe(381000); // 31.75 × 12000
  });

  it('keeps a zero-total line (qty 0, waste 0) transparently', () => {
    const { items, totals } = buildBoq({
      items: [
        { materialId: 'Z', name: 'Zero item', category: 'other', type: 'glass', unit: 'pc', quantity: 0, wasteQty: 0, rate: 99 },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0].totalQty).toBe(0);
    expect(items[0].amountPaise).toBe(0);
    expect(totals.amountPaise).toBe(0);
  });
});

describe('buildBoq — invariants', () => {
  it('rejects the same material with two different rates', () => {
    try {
      buildBoq({
        items: [
          { materialId: 'X', name: 'Ply', category: 'board', unit: 'sheet', quantity: 1, rate: 2800 },
          { materialId: 'X', name: 'Ply', category: 'board', unit: 'sheet', quantity: 1, rate: 2900 },
        ],
      });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('BOQ_RATE_CONFLICT');
      expect(err.details.materialId).toBe('X');
      expect(err.details.rates).toEqual([2800, 2900]);
      expect(err.details.sources).toEqual([]);
    }
  });

  it('carries per-line source context in the conflict details for debugging', () => {
    try {
      buildBoq({
        items: [
          {
            materialId: 'BD-PLY-18',
            name: 'Plywood 18mm',
            category: 'board',
            type: 'plywood',
            unit: 'sheet',
            quantity: 6,
            rate: 2050,
            source: {
              projectId: 'p1',
              roomId: 'r1',
              furnitureId: 'f1',
              panel: 'Wardrobe shelf',
            },
          },
          {
            materialId: 'BD-PLY-18',
            name: 'Plywood 18mm',
            category: 'board',
            type: 'plywood',
            unit: 'sheet',
            quantity: 2,
            rate: 2200,
            source: {
              projectId: 'p1',
              roomId: 'r2',
              furnitureId: 'f2',
              panel: 'Kitchen drawer box',
            },
          },
        ],
      });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err.code).toBe('BOQ_RATE_CONFLICT');
      expect(err.details.materialId).toBe('BD-PLY-18');
      expect(err.details.rates).toEqual([2050, 2200]);
      expect(err.details.sources).toEqual([
        { projectId: 'p1', roomId: 'r1', furnitureId: 'f1', panel: 'Wardrobe shelf' },
        { projectId: 'p1', roomId: 'r2', furnitureId: 'f2', panel: 'Kitchen drawer box' },
      ]);
    }
  });

  it('does not leak diagnostic `source` metadata into output lines', () => {
    const { items } = buildBoq({
      items: [
        { materialId: 'M', name: 'Ply', category: 'board', unit: 'sheet', quantity: 2, rate: 10, source: { roomId: 'r1', panel: 'Side' } },
      ],
    });
    expect(items[0]).not.toHaveProperty('source');
  });

  it('returns a zero-total BOQ with an explicit note for empty input (not an error)', () => {
    const result = buildBoq({ items: [] });
    expect(result.items).toEqual([]);
    expect(result.totals).toEqual({ lineCount: 0, amountPaise: 0, amount: 0 });
    expect(result.empty).toBe(true);
    expect(result.notes).toEqual(['No items to include in the BOQ.']);
  });

  it('rejects negative quantities and rates via the schema', () => {
    expect(() =>
      buildBoq({ items: [{ materialId: 'N', name: 'n', unit: 'pc', quantity: -1, rate: 5 }] })
    ).toThrow();
    expect(() =>
      buildBoq({ items: [{ materialId: 'N', name: 'n', unit: 'pc', quantity: 1, rate: -5 }] })
    ).toThrow();
  });

  it('is deterministic: same input → identical output', () => {
    const a = buildBoq({ items: baseLines });
    const b = buildBoq({ items: baseLines });
    expect(a.items).toEqual(b.items);
    expect(a.totals).toEqual(b.totals);
  });
});
