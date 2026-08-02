/**
 * Quotation items table — BOQ snapshot lines rendered via the reusable table helper with
 * automatic page breaks and a repeated header. Money columns use the display `amount`
 * (₹), derived once at snapshot time.
 */

import { CONTENT_X } from '../format.js';
import { drawTable } from '../table.js';

const COLUMNS = [
  { header: '#', width: 22, align: 'center' },
  { header: 'Material', width: 150, align: 'left' },
  { header: 'Unit', width: 38, align: 'center' },
  { header: 'Qty', width: 46, align: 'right', format: 'qty' },
  { header: 'Waste', width: 46, align: 'right', format: 'qty' },
  { header: 'Total Qty', width: 52, align: 'right', format: 'qty' },
  { header: 'Rate', width: 62, align: 'right', format: 'money' },
  { header: 'Amount', width: 88, align: 'right', format: 'money' },
];

export function renderItems(ctx) {
  const { doc, quotation } = ctx;

  doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text('Itemised BOQ', CONTENT_X, doc.y);

  const rows = quotation.items.length
    ? quotation.items.map((it, i) => [
        i + 1,
        it.name,
        it.unit,
        it.quantity,
        it.wasteQty,
        it.totalQty,
        it.rate,
        Number(it.amountPaise / 100),
      ])
    : [[1, 'No data', '', '', '', '', '', 0]];

  doc.y = drawTable(doc, {
    columns: COLUMNS,
    rows,
    startX: CONTENT_X,
    startY: doc.y + 6,
    maxY: doc.page.height - 120, // leave room for totals + terms on the last page
  });

  if (quotation.items.length) {
    doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#6b7280');
    doc.text(`Total: ${quotation.items.length} line item(s)`, CONTENT_X, doc.y + 4);
  }
  doc.moveDown(0.8);
}
