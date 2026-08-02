/**
 * Quotation numbering — pure formatter (design §4.2, §6).
 *
 * The number is derived from Settings.quotationNumbering:
 *   format tokens: {prefix} {year} {seq}   (seq zero-padded to seqPadding digits)
 *   default:  QTN-2026-0001  = {prefix}-{year}-{seq}, seqPadding 4, startFrom 1
 *
 * The *sequence* itself comes from an atomic Mongo counter (adapter) so concurrent
 * generates can never collide; this module only formats a given sequence deterministically.
 * The same formatter is reused for revisions — a revision gets a fresh sequence → a fresh
 * number, and the old quotation links to it via `revisionOf`.
 */

import { invalidInput } from '../../shared/errors.js';
import { quotationNumberingSchema } from './dto.js';

export const NUMBERING_TOKENS = Object.freeze(['prefix', 'year', 'seq']);

/**
 * Canonical counter key for a (prefix, year) pair — keeps each sequence independent and
 * resetting per year/prefix.
 * @param {string} prefix
 * @param {Date} [date]
 * @returns {string}
 */
export function quotationCounterKey(prefix, date = new Date()) {
  return `quotation:${prefix}:${date.getFullYear()}`;
}

/**
 * Format a sequence number into a quotation number.
 * @param {import('./dto.js').QuotationNumbering} numbering Settings.quotationNumbering
 * @param {number} seq 1-based sequence (from the atomic counter)
 * @param {Date} [date] which year to stamp
 * @returns {string}
 */
export function formatQuotationNumber(numbering, seq, date = new Date()) {
  const parsed = quotationNumberingSchema.parse(numbering);
  if (!Number.isInteger(seq) || seq < 1) {
    throw invalidInput(`quotation sequence must be a positive integer, got ${seq}`, { seq });
  }
  const tokens = {
    prefix: parsed.prefix,
    year: String(date.getFullYear()),
    seq: String(seq).padStart(parsed.seqPadding, '0'),
  };
  return parsed.format.replace(/\{([a-z]+)\}/g, (_, token) => tokens[token]);
}
