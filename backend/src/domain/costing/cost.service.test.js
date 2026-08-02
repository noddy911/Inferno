import { describe, it, expect } from 'vitest';
import { estimateCost, computeCost, deriveLabourDays } from './cost.service.js';
import { computePricing } from './pricing.service.js';
import { toMajor } from '../../shared/money.js';
import { DomainError } from '../../shared/errors.js';

/** A realistic single-project estimate (all values in the default rate catalogue). */
const baseInput = {
  materialLines: [
    { key: 'BD-PLY-18', label: 'Plywood 18mm', category: 'board', type: 'plywood', unit: 'sheet', quantity: 6, rate: 2800 },
    { key: 'HW-HINGE', label: 'Hinges', category: 'hardware', unit: 'pc', quantity: 12, rate: 85 },
    { key: 'FN-LAM', label: 'Laminate', category: 'finish', unit: 'sqft', quantity: 30, rate: 120 },
  ],
  manufacturingQuantities: { cutting: 6, cnc: 0, drilling: 48, assembly: 1, painting: 30, polishing: 30 },
  labourDays: { carpenter: 3, painter: 1, electrician: 0, plumber: 0, helper: 4 },
  additionalCharges: [
    { key: 'transport', label: 'Transport', type: 'flat', value: 1500 },
    { key: 'installation', label: 'Installation', type: 'percent', value: 2 },
  ],
  profitMargin: 25,
  outputGstRate: 18,
};

describe('computeCost — four components', () => {
  const result = computeCost(baseInput);

  it('resolves every material line (qty × rate) in paise', () => {
    expect(result.lines.material).toHaveLength(3);
    const ply = result.lines.material.find((l) => l.key === 'BD-PLY-18');
    expect(ply).toMatchObject({ quantity: 6, ratePaise: 280000, amountPaise: 1680000 });
    expect(result.lines.material.find((l) => l.key === 'HW-HINGE').amountPaise).toBe(102000);
    expect(result.lines.material.find((l) => l.key === 'FN-LAM').amountPaise).toBe(360000);
  });

  it('includes only non-zero manufacturing operations', () => {
    expect(result.lines.manufacturing.map((l) => l.key)).toEqual([
      'cutting',
      'drilling',
      'assembly',
      'painting',
      'polishing',
    ]);
    expect(result.lines.manufacturing.find((l) => l.key === 'cutting').amountPaise).toBe(90000);
    expect(result.lines.manufacturing.find((l) => l.key === 'drilling').amountPaise).toBe(38400);
    expect(result.lines.manufacturing.find((l) => l.key === 'assembly').amountPaise).toBe(25000);
    expect(result.lines.manufacturing.find((l) => l.key === 'painting').amountPaise).toBe(135000);
    expect(result.lines.manufacturing.find((l) => l.key === 'polishing').amountPaise).toBe(60000);
  });

  it('includes only non-zero labour trades', () => {
    expect(result.lines.labour.map((l) => l.key)).toEqual(['carpenter', 'painter', 'helper']);
    expect(result.lines.labour.find((l) => l.key === 'carpenter').amountPaise).toBe(360000);
    expect(result.lines.labour.find((l) => l.key === 'helper').amountPaise).toBe(240000);
  });

  it('applies flat and percent additional charges', () => {
    expect(result.lines.additional).toHaveLength(2);
    const transport = result.lines.additional.find((l) => l.key === 'transport');
    expect(transport.amountPaise).toBe(150000);
    const install = result.lines.additional.find((l) => l.key === 'installation');
    expect(install.type).toBe('percent');
    expect(install.basePaise).toBe(3180400); // production subtotal
    expect(install.amountPaise).toBe(63608); // 2%
  });

  it('sums all four components into totalCost', () => {
    expect(result.totals).toEqual({
      materialPaise: 2142000,
      manufacturingPaise: 348400,
      labourPaise: 690000,
      additionalPaise: 213608, // 150000 flat + 63608 (2% of production subtotal)
      costPaise: 3394008,
    });
  });
});

describe('estimateCost — cost-plus pricing', () => {
  it('applies margin, GST and returns the full pricing block', () => {
    const { totals, pricing, currency } = estimateCost(baseInput);

    expect(currency).toBe('INR');
    expect(totals.costPaise).toBe(3394008);

    expect(pricing.profitMarginPercent).toBe(25);
    expect(pricing.marginBasePaise).toBe(4242510); // × 1.25
    expect(pricing.taxablePaise).toBe(4242510);
    expect(pricing.gstPaise).toBe(763652); // round-half-up of 763651.8
    expect(pricing.totalPaise).toBe(5006162); // taxable + gst, exact integer sum
    expect(pricing.profitPaise).toBe(848502);
    expect(pricing.profitPercent).toBeCloseTo(25, 4);

    // Single round, no drift: total is exactly taxable + gst.
    expect(pricing.totalPaise).toBe(pricing.taxablePaise + pricing.gstPaise);
    // Boundary formatting round-trips.
    expect(toMajor(pricing.totalPaise)).toBeCloseTo(50061.62, 2);
  });

  it('applies a flat discount before GST', () => {
    const { pricing } = estimateCost({ ...baseInput, discount: { type: 'flat', value: 5000 } });

    expect(pricing.discount).toEqual({ type: 'flat', value: 5000, amountPaise: 500000 });
    expect(pricing.taxablePaise).toBe(4242510 - 500000);
    expect(pricing.gstPaise).toBe(673652); // 18% of discounted taxable, rounded once
    expect(pricing.totalPaise).toBe(pricing.taxablePaise + pricing.gstPaise);
  });

  it('applies a percent discount of marginBase before GST', () => {
    const { pricing } = estimateCost({ ...baseInput, discount: { type: 'percent', value: 10 } });

    expect(pricing.discount.amountPaise).toBe(424251); // 10% of marginBase
    expect(pricing.taxablePaise).toBe(4242510 - 424251);
    expect(pricing.gstPaise).toBe(687287); // round(3818259 × 0.18)
    expect(pricing.totalPaise).toBe(pricing.taxablePaise + pricing.gstPaise);
  });

  it('returns zero totals for an empty estimate (no error)', () => {
    const { totals, pricing } = estimateCost({ materialLines: [] });
    expect(totals.costPaise).toBe(0);
    expect(pricing.totalPaise).toBe(0);
    expect(pricing.profitPercent).toBe(0);
  });
});

describe('pricing — bounds rejected', () => {
  it('rejects a profit margin above 100%', () => {
    try {
      estimateCost({ ...baseInput, profitMargin: 150 });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('PRICING_BOUNDS');
    }
  });

  it('rejects a GST rate above 100%', () => {
    expect(() =>
      computePricing({ totalCostPaise: 1000, profitMarginPercent: 25, outputGstRatePercent: 120 })
    ).toThrowError(DomainError);
  });

  it('rejects a percent discount above 100%', () => {
    try {
      estimateCost({ ...baseInput, discount: { type: 'percent', value: 120 } });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('PRICING_BOUNDS');
    }
  });

  it('rejects a negative discount value via the schema', () => {
    expect(() =>
      estimateCost({ ...baseInput, discount: { type: 'flat', value: -1 } })
    ).toThrow();
  });

  it('rejects a negative material rate via the schema', () => {
    expect(() =>
      estimateCost({ ...baseInput, materialLines: [{ key: 'x', label: 'x', unit: 'pc', quantity: 1, rate: -5 }] })
    ).toThrow();
  });
});

describe('deriveLabourDays', () => {
  it('derives days from board area and furniture units', () => {
    expect(deriveLabourDays({ materialAreaSqm: 60, furnitureUnits: 2 })).toEqual({
      carpenter: 3, // ceil(60/25)
      painter: 2, // ceil(60/50)
      electrician: 1,
      plumber: 0,
      helper: 5, // ceil(3 × 1.5)
    });
  });

  it('returns zero days for no work', () => {
    expect(deriveLabourDays({ materialAreaSqm: 0 })).toEqual({
      carpenter: 0,
      painter: 0,
      electrician: 0,
      plumber: 0,
      helper: 0,
    });
  });
});
