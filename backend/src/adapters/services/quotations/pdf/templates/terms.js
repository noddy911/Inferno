/**
 * Quotation terms & signature — payment terms, warranty, notes, and the authorised
 * signatory block (with signature image when available). Sectioned so adding a new block is
 * a one-function change.
 */

import { CONTENT_X, CONTENT_WIDTH } from '../format.js';

const RIGHT_X = CONTENT_X + CONTENT_WIDTH;

function section(doc, title, body) {
  if (!body) return;
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(title, CONTENT_X, doc.y);
  doc.font('Helvetica').fontSize(9).fillColor('#4b5563').text(body, CONTENT_X, doc.y, {
    width: CONTENT_WIDTH,
    lineGap: 2,
  });
}

export function renderTerms(ctx) {
  const { doc, quotation } = ctx;
  section(doc, 'Payment Terms', quotation.paymentTerms);
  section(doc, 'Warranty', quotation.warranty);
  section(doc, 'Notes', quotation.notes);

  // Signature block (bottom-right of the content area).
  doc.moveDown(2);
  const signY = Math.max(doc.y, doc.page.height - 130);
  if (ctx.signature) {
    try {
      doc.image(ctx.signature, RIGHT_X - 140, signY - 55, { fit: [140, 50] });
    } catch {
      /* non-fatal */
    }
  }
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#111827');
  doc.text('Authorised Signatory', RIGHT_X, signY, { align: 'right', width: 160 });
  doc.font('Helvetica').fontSize(8.5).fillColor('#6b7280');
  doc.text('This is a computer-generated quotation.', RIGHT_X, doc.y, { align: 'right', width: 160 });
}
