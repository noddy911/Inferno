/**
 * Atomic quotation-number issuance (design §6).
 *
 * `nextQuotationNumber` uses `findOneAndUpdate({ $inc })` with upsert on a per
 * (prefix, year) counter doc, so even fully concurrent generates receive distinct sequences
 * → distinct numbers. The counter stores the raw 1-based slot (schema default 0); the
 * *displayed* sequence is offset by `startFrom`, so a fresh counter always starts at
 * `startFrom` without mixing `$inc` and `$setOnInsert` on the same path (which Mongo
 * rejects). The unique index on `quotations.quotationNumber` is the second line of defence.
 */

import { Counter } from '../mongoose/models/counter.model.js';
import { quotationNumberingSchema } from '../../../domain/quotation/dto.js';
import { formatQuotationNumber, quotationCounterKey } from '../../../domain/quotation/numbering.service.js';

/**
 * @param {import('../../../domain/quotation/dto.js').QuotationNumbering} numbering
 *   Settings.quotationNumbering
 * @param {Date} [date] year used for the counter key + stamped number
 * @returns {Promise<{ number: string, seq: number, key: string }>}
 */
export async function nextQuotationNumber(numbering, date = new Date()) {
  const parsed = quotationNumberingSchema.parse(numbering);
  const key = quotationCounterKey(parsed.prefix, date);

  const counter = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  // Raw 1-based slot → displayed sequence starts at `startFrom`.
  const seq = counter.seq + parsed.startFrom - 1;
  return { number: formatQuotationNumber(parsed, seq, date), seq, key };
}
