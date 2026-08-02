/**
 * Quotation footer — "Page X of Y" + company name. Uses PDFKit's buffered pages so the
 * footer is stamped on every page after all content is laid out.
 */

import { CONTENT_X, CONTENT_WIDTH } from '../format.js';

export function renderFooter(ctx) {
  const { doc, company = {} } = ctx;
  if (typeof doc.bufferedPageRange !== 'function') return;

  const range = doc.bufferedPageRange();
  const first = range.start;
  const last = first + range.count - 1;

  for (let i = first; i <= last; i += 1) {
    doc.switchToPage(i);
    const y = doc.page.height - 30;
    doc.font('Helvetica').fontSize(8).fillColor('#9ca3af');
    doc.text(company.companyName || 'Interiors', CONTENT_X, y);
    doc.text(`Page ${i - first + 1} of ${range.count}`, CONTENT_X + CONTENT_WIDTH, y, {
      align: 'right',
    });
  }
}
