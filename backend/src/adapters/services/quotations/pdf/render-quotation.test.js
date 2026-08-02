import { describe, it, expect } from 'vitest';
import { loadImage, quotationToPdfBuffer } from './render-quotation.js';

/** Minimal QuotationResult (paise) with the fields the PDF templates read. */
const baseQuotation = {
  quotationNumber: 'QTN-2026-0001',
  status: 'draft',
  projectId: 'p1',
  clientId: 'c1',
  issuedAt: new Date('2026-08-01T00:00:00Z'),
  validUntil: new Date('2026-08-31T00:00:00Z'),
  summary: {
    subtotalPaise: 4242510,
    discountType: null,
    discountValue: 0,
    discountPaise: 0,
    taxablePaise: 4242510,
    outputGstRatePercent: 18,
    gstPaise: 763652,
    totalPaise: 5006162,
  },
  totals: {
    totalCostPaise: 3394008,
    marginBasePaise: 4242510,
    profitPaise: 848502,
    profitPercent: 25,
    profitMarginPercent: 25,
  },
  rooms: [{ roomId: 'r1', name: 'Master Bedroom', roomTotalPaise: 3500000 }],
  items: [
    { materialId: 'BD-PLY-18', name: 'Plywood 18mm', category: 'board', type: 'plywood', unit: 'sheet', quantity: 6, wasteQty: 1, totalQty: 7, rate: 2800, amountPaise: 1960000 },
    { materialId: 'HW-HNG-01', name: 'Soft-Close Hinge', category: 'hardware', type: 'hinge', unit: 'pc', quantity: 12, wasteQty: 0, totalQty: 12, rate: 85, amountPaise: 102000 },
  ],
  paymentTerms: '50% advance, 30% on material dispatch, 20% on completion',
  warranty: '5 years against manufacturing defects',
  notes: 'Prices valid for 30 days.',
  signatureUrl: null,
};

const opts = {
  company: { companyName: 'Spaces & Panels Interiors', gstNumber: '27ABCDE1234F1Z5' },
  client: { name: 'Acme Interiors', address: '12 MG Road, Mumbai', phone: '+91 98765 43210' },
  project: { projectName: 'Villa Panvel', siteAddress: 'Plot 12, Sector 4, Panvel' },
};

describe('quotationToPdfBuffer', () => {
  it('produces a valid PDF buffer', async () => {
    const buf = await quotationToPdfBuffer(baseQuotation, opts);
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
    expect(buf.toString('latin1').trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('accepts Buffer logo/signature and still renders', async () => {
    const buf = await quotationToPdfBuffer(baseQuotation, {
      ...opts,
      logo: Buffer.from('fake-png-logo'),
      signature: Buffer.from('fake-png-signature'),
    });
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('renders an empty quotation (no items) without throwing', async () => {
    const empty = {
      ...baseQuotation,
      items: [],
      summary: { ...baseQuotation.summary, subtotalPaise: 0, taxablePaise: 0, gstPaise: 0, totalPaise: 0 },
      totals: { ...baseQuotation.totals, totalCostPaise: 0, marginBasePaise: 0, profitPaise: 0 },
    };
    const buf = await quotationToPdfBuffer(empty, opts);
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  });
});

describe('renderQuotationDocument — multi-page', () => {
  it('breaks onto a second page for a long BOQ', async () => {
    const many = {
      ...baseQuotation,
      items: Array.from({ length: 60 }, (_, i) => ({
        materialId: `M-${i + 1}`,
        name: `Material ${i + 1}`,
        category: 'board',
        type: 'plywood',
        unit: 'sheet',
        quantity: 1,
        wasteQty: 0,
        totalQty: 1,
        rate: 100,
        amountPaise: 10000,
      })),
    };
    const buf = await quotationToPdfBuffer(many, opts);
    // Each PDF page object is serialized as "/Type /Page"; count them.
    const pageCount = (buf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length;
    expect(pageCount).toBeGreaterThan(1);
  });
});

describe('loadImage — best-effort', () => {
  it('returns null for null, empty and unreadable values instead of throwing', async () => {
    expect(await loadImage(null)).toBeNull();
    expect(await loadImage('')).toBeNull();
    expect(await loadImage('   ')).toBeNull();
    expect(await loadImage('Z:/definitely/not/a/real/logo.png')).toBeNull();
  });

  it('passes Buffers through untouched', async () => {
    const b = Buffer.from('png');
    expect(await loadImage(b)).toBe(b);
  });
});
