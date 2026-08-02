/**
 * Quotation totals — cost/profit info (left) and the priced summary (right):
 * subtotal → discount → taxable → GST → total. All values are read from the frozen
 * snapshot (no recomputation).
 */

import { CONTENT_X, CONTENT_WIDTH, money } from '../format.js';

const RIGHT_X = CONTENT_X + CONTENT_WIDTH;
const BLOCK_W = 210;
const BLOCK_X = RIGHT_X - BLOCK_W;

function line(doc, label, value, { bold = false, accent = false } = {}) {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9.5);
  doc.fillColor(accent ? '#0f766e' : '#111827');
  doc.text(label, BLOCK_X, doc.y);
  doc.text(value, RIGHT_X, doc.y, { align: 'right', width: BLOCK_W });
  doc.moveDown(0.4);
}

export function renderTotals(ctx) {
  const { doc, quotation } = ctx;
  const { summary, totals } = quotation;

  // Left: cost + profit (design §4.2 totals snapshot).
  const infoX = CONTENT_X;
  const infoY = Math.max(doc.y, 40);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text('Cost & Profit', infoX, infoY);
  doc.font('Helvetica').fontSize(9.5).fillColor('#374151');
  doc.text(`Total cost: ${money(totals.totalCostPaise)}`, infoX, doc.y);
  doc.text(`Profit: ${money(totals.profitPaise)} (${totals.profitPercent.toFixed(2)}%)`, infoX, doc.y);
  doc.text(`Margin base: ${money(totals.marginBasePaise)}`, infoX, doc.y);

  // Right: priced summary.
  const sumY = Math.max(doc.y, infoY);
  doc.y = sumY;
  line(doc, 'Subtotal', money(summary.subtotalPaise));
  if (summary.discountPaise > 0) {
    const label =
      summary.discountType === 'percent'
        ? `Discount (${summary.discountValue}%)`
        : `Discount (${money(summary.discountValue)})`;
    line(doc, label, `− ${money(summary.discountPaise)}`);
  }
  line(doc, 'Taxable', money(summary.taxablePaise));
  line(doc, `GST (${summary.outputGstRatePercent}%)`, money(summary.gstPaise));
  doc.moveDown(0.3);
  doc.moveTo(BLOCK_X, doc.y).lineTo(RIGHT_X, doc.y).lineWidth(0.75).strokeColor('#0f766e').stroke();
  doc.moveDown(0.4);
  line(doc, 'GRAND TOTAL', money(summary.totalPaise), { bold: true, accent: true });

  doc.moveDown(1);
}
