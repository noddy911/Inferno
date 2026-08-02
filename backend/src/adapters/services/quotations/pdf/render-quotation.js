/**
 * Quotation PDF renderer (PDFKit).
 *
 * Composes the modular templates (header → items → totals → terms → footer) into one A4
 * document. Templates are plain `(ctx) => void` functions, so reordering or adding a section
 * (e.g. a transport/delivery block) never touches the others.
 *
 * Images (company logo, signature) are loaded best-effort: a missing or unreadable image is
 * skipped rather than breaking the PDF. `quotationToPdfBuffer` resolves a Buffer ready to
 * stream/download.
 */

import PDFDocument from 'pdfkit';
import { readFile } from 'node:fs/promises';
import { renderHeader } from './templates/header.js';
import { renderItems } from './templates/items.js';
import { renderTotals } from './templates/totals.js';
import { renderTerms } from './templates/terms.js';
import { renderFooter } from './templates/footer.js';

/**
 * Load an image from a Buffer, local path, or http(s) URL. Returns null when unavailable.
 * @param {Buffer|string|null|undefined} value
 * @returns {Promise<Buffer|null>}
 */
export async function loadImage(value) {
  if (value == null) return null;
  if (Buffer.isBuffer(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    if (/^https?:\/\//i.test(value)) {
      const res = await fetch(value);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return buf.length > 0 ? buf : null;
    }
    return await readFile(value);
  } catch {
    return null; // images are decorative — never fail the quotation for a bad logo
  }
}

/**
 * Build a PDFDocument (not yet ended) from a quotation + company context.
 * @param {import('../../../domain/quotation/dto.js').QuotationResult} quotation
 * @param {object} [opts]
 * @param {object} [opts.company] { companyName, gstNumber }
 * @param {object} [opts.client] { name, address, phone }
 * @param {object} [opts.project] { projectName, siteAddress }
 * @param {Buffer|null} [opts.logo]
 * @param {Buffer|null} [opts.signature]
 * @returns {import('pdfkit').PDFDocument}
 */
export function renderQuotationDocument(quotation, opts = {}) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 48,
    bufferPages: true,
    info: {
      Title: `Quotation ${quotation.quotationNumber ?? ''}`.trim(),
      Author: opts.company?.companyName ?? 'Interiors',
      Subject: 'Interior estimation quotation',
      Keywords: 'quotation, interior, estimation',
    },
  });

  const ctx = {
    doc,
    quotation,
    company: opts.company ?? {},
    client: opts.client ?? {},
    project: opts.project ?? {},
    logo: opts.logo ?? null,
    signature: opts.signature ?? null,
  };

  renderHeader(ctx);
  renderItems(ctx);
  renderTotals(ctx);
  renderTerms(ctx);
  renderFooter(ctx);
  return doc;
}

/**
 * Render a quotation to a PDF Buffer.
 * @param {import('../../../domain/quotation/dto.js').QuotationResult} quotation
 * @param {object} [opts] same as renderQuotationDocument + `logo`/`signature` overrides
 * @returns {Promise<Buffer>}
 */
export async function quotationToPdfBuffer(quotation, opts = {}) {
  const logo = await loadImage(opts.logo ?? opts.company?.logo);
  const signature = await loadImage(opts.signature ?? quotation.signatureUrl);
  const doc = renderQuotationDocument(quotation, { ...opts, logo, signature });

  const chunks = [];
  return new Promise((resolve, reject) => {
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}
