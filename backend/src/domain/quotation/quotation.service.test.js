import { describe, it, expect } from 'vitest';
import { DomainError } from '../../shared/errors.js';
import {
  buildQuotation,
  canTransition,
  assertTransition,
  assertMutable,
  STATUS_TRANSITIONS,
} from './quotation.service.js';

/** Reference pricing from Module 4 (cost 3,394,008; 25% margin; 18% GST). */
const noDiscountPricing = {
  profitMarginPercent: 25,
  marginBasePaise: 4242510,
  discount: null,
  taxablePaise: 4242510,
  outputGstRatePercent: 18,
  gstPaise: 763652,
  totalPaise: 5006162,
  profitPaise: 848502,
  profitPercent: 25,
};

const base = {
  projectId: 'p1',
  clientId: 'c1',
  pricing: noDiscountPricing,
  costPaise: 3394008,
  items: [
    { materialId: 'BD-PLY-18', name: 'Plywood 18mm', category: 'board', type: 'plywood', unit: 'sheet', quantity: 6, wasteQty: 1, totalQty: 7, rate: 2800, amountPaise: 1960000 },
    { materialId: 'HW-HNG-01', name: 'Soft-Close Hinge', category: 'hardware', type: 'hinge', unit: 'pc', quantity: 12, wasteQty: 0, totalQty: 12, rate: 85, amountPaise: 102000 },
  ],
  rooms: [
    { roomId: 'r1', name: 'Master Bedroom', roomTotalPaise: 3500000 },
    { roomId: 'r2', name: 'Kitchen', roomTotalPaise: 1506162 },
  ],
  config: {
    paymentTerms: '50% advance, 50% on completion',
    warranty: '5 years against manufacturing defects',
    notes: 'Prices valid for 30 days.',
    validUntilDays: 30,
    issuedAt: new Date('2026-08-01T00:00:00Z'),
  },
};

describe('buildQuotation — pricing snapshot', () => {
  const q = buildQuotation(base);

  it('freezes summary = pricing (subtotal, discount, taxable, gst, total)', () => {
    expect(q.summary).toEqual({
      subtotalPaise: 4242510,
      discountType: null,
      discountValue: 0,
      discountPaise: 0,
      taxablePaise: 4242510,
      outputGstRatePercent: 18,
      gstPaise: 763652,
      totalPaise: 5006162,
    });
  });

  it('freezes totals = cost/profit/margin snapshot', () => {
    expect(q.totals).toEqual({
      totalCostPaise: 3394008,
      marginBasePaise: 4242510,
      profitPaise: 848502,
      profitPercent: 25,
      profitMarginPercent: 25,
    });
  });

  it('keeps rooms, items, terms and meta', () => {
    expect(q.rooms).toHaveLength(2);
    expect(q.items).toHaveLength(2);
    expect(q.paymentTerms).toBe('50% advance, 50% on completion');
    expect(q.warranty).toBe('5 years against manufacturing defects');
    expect(q.notes).toBe('Prices valid for 30 days.');
    expect(q.projectId).toBe('p1');
    expect(q.clientId).toBe('c1');
    expect(q.currency).toBe('INR');
  });

  it('starts as an unnumbered draft with issuedAt/validUntil', () => {
    expect(q.quotationNumber).toBeNull();
    expect(q.status).toBe('draft');
    expect(q.issuedAt.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(q.validUntil.toISOString()).toBe('2026-08-31T00:00:00.000Z');
    expect(q.revisionOf).toBeNull();
    expect(q.empty).toBe(false);
  });

  it('captures a discount in the summary', () => {
    const qd = buildQuotation({
      ...base,
      pricing: {
        ...noDiscountPricing,
        discount: { type: 'flat', value: 5000, amountPaise: 500000 },
        taxablePaise: 3742510,
        gstPaise: 673652,
        totalPaise: 4416162,
      },
    });
    expect(qd.summary).toMatchObject({
      subtotalPaise: 4242510,
      discountType: 'flat',
      discountValue: 5000,
      discountPaise: 500000,
      taxablePaise: 3742510,
      gstPaise: 673652,
      totalPaise: 4416162,
    });
  });
});

describe('buildQuotation — invariants', () => {
  it('rejects internally inconsistent pricing (taxable ≠ subtotal − discount)', () => {
    try {
      buildQuotation({ ...base, pricing: { ...noDiscountPricing, taxablePaise: 999999 } });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('INVALID_INPUT');
    }
  });

  it('rejects total ≠ taxable + gst', () => {
    expect(() =>
      buildQuotation({ ...base, pricing: { ...noDiscountPricing, totalPaise: 1 } })
    ).toThrow(DomainError);
  });

  it('adds a "no items" note and flags an empty quotation (not an error)', () => {
    const q = buildQuotation({ ...base, items: [], rooms: [], costPaise: 0, pricing: { ...noDiscountPricing, marginBasePaise: 0, taxablePaise: 0, gstPaise: 0, totalPaise: 0, profitPaise: 0, profitPercent: 0 } });
    expect(q.empty).toBe(true);
    expect(q.notes).toBe('No items to include in this quotation.');
    expect(q.totals.totalCostPaise).toBe(0);
  });
});

describe('quotation lifecycle', () => {
  it('defines the designed transitions only', () => {
    expect(STATUS_TRANSITIONS).toEqual({
      draft: ['sent'],
      sent: ['accepted', 'rejected'],
      rejected: ['revised'],
      accepted: [],
      revised: [],
    });
    expect(canTransition('draft', 'sent')).toBe(true);
    expect(canTransition('sent', 'accepted')).toBe(true);
    expect(canTransition('sent', 'rejected')).toBe(true);
    expect(canTransition('rejected', 'revised')).toBe(true);
    expect(canTransition('draft', 'accepted')).toBe(false);
    expect(canTransition('accepted', 'sent')).toBe(false);
    expect(canTransition('draft', 'rejected')).toBe(false);
  });

  it('throws INVALID_STATE on an illegal transition, naming the allowed moves', () => {
    try {
      assertTransition('draft', 'accepted');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('INVALID_STATE');
      expect(err.details).toMatchObject({ from: 'draft', to: 'accepted', allowed: ['sent'] });
    }
    expect(() => assertTransition('draft', 'sent')).not.toThrow();
  });

  it('only allows edits on drafts', () => {
    expect(() => assertMutable('draft')).not.toThrow();
    try {
      assertMutable('sent');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('INVALID_STATE');
    }
  });
});

describe('buildQuotation — revision readiness', () => {
  it('carries revisionOf so a revision links back to its source quotation', () => {
    const q = buildQuotation({ ...base, config: { ...base.config, revisionOf: 'old-quote-id' } });
    expect(q.revisionOf).toBe('old-quote-id');
    // A revision is a fresh draft + new number — the engine only links, never reuses a number.
    expect(q.status).toBe('draft');
    expect(q.quotationNumber).toBeNull();
  });
});
