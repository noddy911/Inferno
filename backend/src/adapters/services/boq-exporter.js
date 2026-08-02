/**
 * BOQ → Excel export (ExcelJS). Thin adapter: takes a domain `BoqResult` and renders a
 * workbook. Money columns use the display rupees (`amount`, 2 dp); the domain paise is
 * authoritative and this layer never re-rounds.
 *
 * An empty BOQ still produces a valid workbook — headers + a "no data" note + zero totals
 * row (design §10).
 */

import ExcelJS from 'exceljs';

export const BOQ_COLUMNS = [
  { header: '#', key: 'index', width: 5 },
  { header: 'Material', key: 'name', width: 30 },
  { header: 'Category', key: 'category', width: 14 },
  { header: 'Type', key: 'type', width: 14 },
  { header: 'Unit', key: 'unit', width: 8 },
  { header: 'Quantity', key: 'quantity', width: 10 },
  { header: 'Waste Qty', key: 'wasteQty', width: 10 },
  { header: 'Total Qty', key: 'totalQty', width: 10 },
  { header: 'Rate (₹)', key: 'rate', width: 12 },
  { header: 'Amount (₹)', key: 'amount', width: 14 },
];

const MONEY_FORMAT = '#,##0.00';
const QTY_FORMAT = '0.####';

/**
 * @param {import('../../domain/boq/dto.js').BoqResult} boq
 * @param {{ title?: string }} [opts]
 * @returns {ExcelJS.Workbook}
 */
export function buildBoqWorkbook(boq, opts = {}) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('BOQ');

  const title = opts.title ?? `Bill of Quantities (${boq.currency})`;
  ws.addRow([title]).font = { bold: true, size: 14 };
  ws.addRow([`Generated ${new Date().toISOString().slice(0, 10)}`]);
  ws.addRow([]);

  const headerRow = ws.addRow(BOQ_COLUMNS.map((c) => c.header));
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    cell.border = { bottom: { style: 'thin' } };
  });

  if (boq.items.length === 0) {
    ws.addRow(['', '', '', '', '', '', '', '', '', '']).eachCell((cell, col) => {
      if (col === 2) {
        cell.value = 'No data';
        cell.font = { italic: true };
      }
    });
  } else {
    boq.items.forEach((item, i) => {
      ws.addRow([
        i + 1,
        item.name,
        item.category ?? '',
        item.type ?? '',
        item.unit,
        item.quantity,
        item.wasteQty,
        item.totalQty,
        item.rate,
        item.amount,
      ]);
    });
  }

  const totalsRow = ws.addRow([
    '',
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    boq.totals.amount,
  ]);
  totalsRow.font = { bold: true };
  totalsRow.eachCell((cell) => {
    cell.border = { top: { style: 'thin' } };
  });

  BOQ_COLUMNS.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width;
  });
  // Money + quantity cells (values start on row 4: title, date, blank, header).
  for (let r = 4; r <= ws.rowCount; r += 1) {
    const qtyCells = [6, 7, 8];
    qtyCells.forEach((c) => {
      const cell = ws.getCell(r, c);
      if (typeof cell.value === 'number') cell.numFmt = QTY_FORMAT;
    });
    for (const c of [9, 10]) {
      const cell = ws.getCell(r, c);
      if (typeof cell.value === 'number') cell.numFmt = MONEY_FORMAT;
    }
  }

  ws.getColumn(1).alignment = { horizontal: 'center' };
  return wb;
}

/**
 * Render a BOQ workbook to a Buffer.
 * @param {import('../../domain/boq/dto.js').BoqResult} boq
 * @param {{ title?: string }} [opts]
 * @returns {Promise<Buffer>}
 */
export async function boqToBuffer(boq, opts = {}) {
  return buildBoqWorkbook(boq, opts).xlsx.writeBuffer();
}
