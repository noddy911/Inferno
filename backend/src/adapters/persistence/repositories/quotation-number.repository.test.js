import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { DEFAULT_SETTINGS } from '../mongoose/models/settings.model.js';
import { nextQuotationNumber } from './quotation-number.repository.js';

let mongo;
let uri;

const DEFAULT_NUMBERING = DEFAULT_SETTINGS.quotationNumbering;
const DATE = new Date('2026-08-01T00:00:00Z');

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  uri = mongo.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('nextQuotationNumber — sequence', () => {
  it('issues QTN-YYYY-NNNN from the Settings default, starting at startFrom', async () => {
    const first = await nextQuotationNumber(DEFAULT_NUMBERING, DATE);
    expect(first).toMatchObject({ number: 'QTN-2026-0001', seq: 1, key: 'quotation:QTN:2026' });

    const second = await nextQuotationNumber(DEFAULT_NUMBERING, DATE);
    expect(second).toMatchObject({ number: 'QTN-2026-0002', seq: 2 });
  });

  it('honours a custom prefix, format, padding and startFrom', async () => {
    const cfg = { prefix: 'EST', format: '{prefix}/{year}/{seq}', seqPadding: 3, startFrom: 5 };
    const first = await nextQuotationNumber(cfg, DATE);
    expect(first.number).toBe('EST/2026/005');
    const second = await nextQuotationNumber(cfg, DATE);
    expect(second.number).toBe('EST/2026/006');
  });

  it('resets the sequence per year (fresh counter key)', async () => {
    const jan2027 = await nextQuotationNumber(DEFAULT_NUMBERING, new Date('2027-01-15'));
    expect(jan2027).toMatchObject({ number: 'QTN-2027-0001', key: 'quotation:QTN:2027' });
  });
});

describe('nextQuotationNumber — concurrency', () => {
  it('never duplicates a number under parallel requests', async () => {
    // Fresh prefix → fresh counter key, so the parallel batch starts from a clean sequence.
    const cfg = { ...DEFAULT_NUMBERING, prefix: 'CUR' };
    const results = await Promise.all(
      Array.from({ length: 25 }, () => nextQuotationNumber(cfg, DATE))
    );
    const numbers = results.map((r) => r.number);
    expect(new Set(numbers).size).toBe(25);
    expect(new Set(results.map((r) => r.seq)).size).toBe(25);
    // Sequence is dense and in range: 25 consecutive numbers issued atomically.
    expect(Math.min(...results.map((r) => r.seq))).toBe(1);
  });
});
