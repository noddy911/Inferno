import { describe, it, expect } from 'vitest';
import { DomainError } from '../../shared/errors.js';
import { formatQuotationNumber, quotationCounterKey } from './numbering.service.js';

const DEFAULT = { prefix: 'QTN', format: '{prefix}-{year}-{seq}', seqPadding: 4, startFrom: 1 };
const DATE = new Date('2026-08-01T00:00:00Z');

describe('formatQuotationNumber — default Settings format', () => {
  it('renders QTN-YYYY-NNNN from the default configuration', () => {
    expect(formatQuotationNumber(DEFAULT, 1, DATE)).toBe('QTN-2026-0001');
    expect(formatQuotationNumber(DEFAULT, 42, DATE)).toBe('QTN-2026-0042');
    expect(formatQuotationNumber(DEFAULT, 10000, DATE)).toBe('QTN-2026-10000');
  });

  it('uses the date year, not the current year', () => {
    expect(formatQuotationNumber(DEFAULT, 1, new Date('2027-01-15'))).toBe('QTN-2027-0001');
  });
});

describe('formatQuotationNumber — configurable prefix & format', () => {
  it('swaps the prefix', () => {
    expect(formatQuotationNumber({ ...DEFAULT, prefix: 'EST' }, 7, DATE)).toBe('EST-2026-0007');
  });

  it('supports arbitrary format templates with padding', () => {
    const cfg = { prefix: 'EST', format: '{prefix}/{year}/{seq}', seqPadding: 3, startFrom: 1 };
    expect(formatQuotationNumber(cfg, 7, DATE)).toBe('EST/2026/007');
  });

  it('keeps the same sequence shared across prefixes via scoped counter keys', () => {
    expect(quotationCounterKey('QTN', DATE)).toBe('quotation:QTN:2026');
    expect(quotationCounterKey('EST', DATE)).toBe('quotation:EST:2026');
    expect(quotationCounterKey('QTN', new Date('2027-06-01'))).toBe('quotation:QTN:2027');
  });
});

describe('formatQuotationNumber — invalid configuration rejected', () => {
  it('rejects a format missing the {seq} token', () => {
    expect(() => formatQuotationNumber({ ...DEFAULT, format: '{prefix}-{year}' }, 1, DATE)).toThrow();
  });

  it('rejects a format with an unknown token', () => {
    expect(() =>
      formatQuotationNumber({ ...DEFAULT, format: '{prefix}-{year}-{random}' }, 1, DATE)
    ).toThrow();
  });

  it('rejects an empty / invalid prefix', () => {
    expect(() => formatQuotationNumber({ ...DEFAULT, prefix: '' }, 1, DATE)).toThrow();
    expect(() => formatQuotationNumber({ ...DEFAULT, prefix: 'QT N' }, 1, DATE)).toThrow();
  });

  it('rejects a non-integer or non-positive sequence', () => {
    try {
      formatQuotationNumber(DEFAULT, 0, DATE);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('INVALID_INPUT');
    }
    expect(() => formatQuotationNumber(DEFAULT, 1.5, DATE)).toThrow();
  });
});
