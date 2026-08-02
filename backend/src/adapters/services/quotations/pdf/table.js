/**
 * Reusable PDF table renderer (used by the quotation items table; future report PDFs).
 * Handles column layout, alternating row shading, and automatic page breaks with a repeated
 * header row — modular so callers stay declarative.
 */

/**
 * @typedef {object} TableColumn
 * @property {string} header
 * @property {number} width pt
 * @property {'left'|'center'|'right'} [align]
 * @property {string} [format] 'money' | 'qty' | 'text'
 */

const ROW_H = 18;
const PAD_X = 4;

function fmt(value, format) {
  if (format === 'money') return Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (format === 'qty') return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 4 });
  return String(value);
}

/**
 * Draw a table starting at (startX, startY); returns the y below the table.
 * @param {import('pdfkit').PDFDocument} doc
 * @param {object} opts
 * @param {TableColumn[]} opts.columns
 * @param {Array<Array<string|number>>} opts.rows cell values in column order
 * @param {number} opts.startX
 * @param {number} opts.startY
 * @param {number} opts.maxY bottom bound (default: page bottom margin)
 * @param {boolean} [opts.alternateRows=true]
 */
export function drawTable(doc, { columns, rows, startX, startY, maxY = null, alternateRows = true }) {
  const page = doc.page;
  const bottom = maxY ?? page.height - (page.margins.bottom ?? 48);
  let y = startY;
  let pageIndex = doc.bufferedPageRange ? 0 : null;

  const drawHeader = () => {
    doc.font('Helvetica-Bold').fontSize(8.5);
    doc.rect(startX, y, columns.reduce((s, c) => s + c.width, 0), ROW_H)
      .fillColor('#1f2937')
      .fill();
    let x = startX;
    columns.forEach((col) => {
      doc.fillColor('#ffffff');
      doc.text(col.header, x + PAD_X, y + 5.5, { width: col.width - PAD_X * 2, align: col.align ?? 'left' });
      x += col.width;
    });
    doc.fillColor('#000000');
    y += ROW_H;
  };

  drawHeader();

  rows.forEach((row, i) => {
    if (y + ROW_H > bottom) {
      doc.addPage();
      y = page.margins.top ?? 48;
      drawHeader();
      if (pageIndex !== null) pageIndex = 0;
    }
    let x = startX;
    const width = columns.reduce((s, c) => s + c.width, 0);
    if (alternateRows && i % 2 === 1) {
      doc.rect(startX, y, width, ROW_H).fillColor('#f3f4f6').fill();
    }
    doc.font('Helvetica').fontSize(8.5);
    columns.forEach((col, ci) => {
      doc.fillColor('#111827');
      const value = fmt(row[ci], col.format);
      doc.text(value, x + PAD_X, y + 5.5, { width: col.width - PAD_X * 2, align: col.align ?? 'left' });
      x += col.width;
    });
    y += ROW_H;
  });

  // Bottom rule
  doc.moveTo(startX, y).lineTo(startX + columns.reduce((s, c) => s + c.width, 0), y)
    .lineWidth(0.5).strokeColor('#d1d5db').stroke();

  return y;
}
