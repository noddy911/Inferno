import { describe, it, expect } from 'vitest';
import { settingsSchema, settingsUpdateSchema } from './dto.js';

const validSettings = {
  companyName: 'Spaces & Panels Interiors',
  logo: null,
  gstNumber: '27ABCDE1234F1Z5',
  currency: 'INR',
  taxes: { outputGstRate: 18 },
  profitMargin: 25,
  sheetSizes: [
    { key: '8x4', width: 2440, height: 1220, rate: 0 },
    { key: '9x4', width: 2745, height: 1220, rate: 0 },
  ],
  kerf: 3,
  labourRates: { carpenter: 1200, painter: 900, electrician: 1000, plumber: 1000, helper: 600 },
  manufacturingRates: { cutting: 150, cnc: 60, drilling: 8, assembly: 250, painting: 45, polishing: 20 },
  additionalCharges: { transport: 1500, packaging: 800, installation: 2000, misc: 500 },
  paymentTerms: '50% advance',
  warranty: '5 years',
  quotationNumbering: { prefix: 'QTN', format: '{prefix}-{year}-{seq}', seqPadding: 4, startFrom: 1 },
};

describe('settingsSchema (full config)', () => {
  it('accepts a complete valid settings object', () => {
    const parsed = settingsSchema.parse(validSettings);
    expect(parsed.companyName).toBe('Spaces & Panels Interiors');
    expect(parsed.sheetSizes).toHaveLength(2);
    expect(parsed.quotationNumbering).toMatchObject({ prefix: 'QTN', format: '{prefix}-{year}-{seq}' });
  });

  it('fills per-field defaults for optional values (logo, kerf, sheetSizes)', () => {
    const { logo, sheetSizes, kerf } = settingsSchema.parse({ ...validSettings, logo: undefined, kerf: undefined, sheetSizes: undefined });
    expect(logo).toBeNull();
    expect(kerf).toBe(3); // schema default (DEFAULT_SETTINGS seeds the real singleton)
    expect(sheetSizes).toHaveLength(3); // 8x4/9x4/10x4
  });

  it('requires companyName', () => {
    const rest = { ...validSettings };
    delete rest.companyName;
    expect(() => settingsSchema.parse(rest)).toThrow();
  });

  it.each([
    ['negative kerf', { kerf: -1 }],
    ['gst above 100', { taxes: { outputGstRate: 120 } }],
    ['profitMargin above 100', { profitMargin: 101 }],
    ['empty sheetSizes', { sheetSizes: [] }],
    ['zero-width sheet', { sheetSizes: [{ key: 'x', width: 0, height: 1220 }] }],
    ['unknown currency', { currency: 'USD' }],
    ['negative labour rate', { labourRates: { carpenter: -5 } }],
  ])('rejects %s', (_label, patch) => {
    expect(() => settingsSchema.parse({ ...validSettings, ...patch })).toThrow();
  });

  it('strips unknown keys', () => {
    const parsed = settingsSchema.parse({ ...validSettings, bogus: true, nested: { x: 1 } });
    expect(parsed).not.toHaveProperty('bogus');
    expect(parsed).not.toHaveProperty('nested');
  });
});

describe('settingsUpdateSchema (PUT /settings)', () => {
  it('accepts a single scalar patch', () => {
    const parsed = settingsUpdateSchema.parse({ profitMargin: 30 });
    expect(parsed).toEqual({ profitMargin: 30 });
  });

  it('accepts a partial nested patch without touching siblings', () => {
    const parsed = settingsUpdateSchema.parse({ labourRates: { carpenter: 1500 } });
    expect(parsed).toEqual({ labourRates: { carpenter: 1500 } });
  });

  it('accepts a full quotationNumbering block', () => {
    const parsed = settingsUpdateSchema.parse({
      quotationNumbering: { prefix: 'EST', format: '{prefix}/{year}/{seq}', seqPadding: 3, startFrom: 100 },
    });
    expect(parsed.quotationNumbering).toMatchObject({ prefix: 'EST', seqPadding: 3 });
  });

  it('rejects an empty body (at least one field required)', () => {
    const result = settingsUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('At least one settings field is required');
    }
  });

  it('rejects a body of only unknown keys (stripped → empty)', () => {
    expect(settingsUpdateSchema.safeParse({ bogus: 1 }).success).toBe(false);
  });

  it('rejects negative rates and out-of-range percentages', () => {
    expect(settingsUpdateSchema.safeParse({ kerf: -1 }).success).toBe(false);
    expect(settingsUpdateSchema.safeParse({ profitMargin: 101 }).success).toBe(false);
    expect(settingsUpdateSchema.safeParse({ taxes: { outputGstRate: 150 } }).success).toBe(false);
  });

  it('rejects a partial quotationNumbering (cross-field invariant needs the full block)', () => {
    const result = settingsUpdateSchema.safeParse({ quotationNumbering: { prefix: 'EST' } });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown format token in quotationNumbering', () => {
    const result = settingsUpdateSchema.safeParse({
      quotationNumbering: { prefix: 'EST', format: '{prefix}-{nope}-{seq}', seqPadding: 4, startFrom: 1 },
    });
    expect(result.success).toBe(false);
  });
});
