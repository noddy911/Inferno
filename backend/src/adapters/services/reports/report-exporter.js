/**
 * Report → Excel export (ExcelJS). Thin adapter: takes a `ReportResult` (paise) and renders
 * a workbook. Money cells use the display rupees (2 dp); the aggregator's paise is
 * authoritative and this layer never re-rounds. An empty report still produces a valid
 * workbook — headers + a "no data" note + a zero totals row (design §10).
 */

import ExcelJS from 'exceljs';

const MONEY_FORMAT = '#,##0.00';
const toRupees = (paise) => Number((paise / 100).toFixed(2));
const dateStr = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const rangeSubtitle = (report) =>
  report.from || report.to
    ? `Period: ${dateStr(report.from ?? '')} → ${dateStr(report.to ?? '')}`
    : 'All time';

const REPORT_TITLES = Object.freeze({
  sales: 'Sales Report',
  profit: 'Profit Report',
  labour: 'Labour Report',
  material: 'Material Report',
  client: 'Client Report',
  project: 'Project Report',
});

/**
 * Shared workbook scaffold: title → subtitle → header → rows (or "No data") → totals row.
 * @param {object} spec
 * @param {string} spec.title
 * @param {string} [spec.subtitle]
 * @param {Array<{header: string, width: number, format?: 'money'|'qty'}>} spec.columns
 * @param {Array<Array<*>>} spec.rows
 * @param {Array<*>|null} [spec.totalsRow]
 */
function tableWorkbook({ title, subtitle, columns, rows, totalsRow }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Report');

  ws.addRow([title]).font = { bold: true, size: 14 };
  if (subtitle) ws.addRow([subtitle]);
  ws.addRow([]);

  const headerRow = ws.addRow(columns.map((c) => c.header));
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    cell.border = { bottom: { style: 'thin' } };
  });

  if (rows.length === 0) {
    ws.addRow(columns.map(() => '')).eachCell((cell, col) => {
      if (col === 1) {
        cell.value = 'No data';
        cell.font = { italic: true };
      }
    });
  } else {
    rows.forEach((row) => ws.addRow(row));
  }

  if (totalsRow) {
    const tr = ws.addRow(totalsRow);
    tr.font = { bold: true };
    tr.eachCell((cell) => {
      cell.border = { top: { style: 'thin' } };
    });
  }

  columns.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width;
  });
  // Number formats (values start on row 4: title, subtitle, blank, header).
  for (let r = 4; r <= ws.rowCount; r += 1) {
    columns.forEach((col, i) => {
      if (!col.format) return;
      const cell = ws.getCell(r, i + 1);
      if (typeof cell.value === 'number') cell.numFmt = col.format === 'money' ? MONEY_FORMAT : '0.####';
    });
  }
  return wb;
}

function salesWorkbook(report) {
  const columns = [
    { header: 'Period', width: 12 },
    { header: 'Quotes', width: 8 },
    { header: 'Revenue (₹)', width: 16, format: 'money' },
    { header: 'GST (₹)', width: 16, format: 'money' },
  ];
  return tableWorkbook({
    title: REPORT_TITLES.sales,
    subtitle: rangeSubtitle(report),
    columns,
    rows: report.rows.map((b) => [b.label, b.count, toRupees(b.revenuePaise), toRupees(b.gstPaise)]),
    totalsRow: ['TOTAL', report.total.count, toRupees(report.total.revenuePaise), toRupees(report.total.gstPaise)],
  });
}

function profitWorkbook(report) {
  const columns = [
    { header: 'Metric', width: 22 },
    { header: 'Value', width: 18 },
  ];
  const rows = [
    ['Quotations', report.total.quotations],
    ['Total cost (₹)', toRupees(report.total.costPaise)],
    ['Revenue (₹)', toRupees(report.total.revenuePaise)],
    ['Profit (₹)', toRupees(report.total.profitPaise)],
    ['Profit margin (%)', report.total.profitMarginPercent],
  ];
  return tableWorkbook({
    title: REPORT_TITLES.profit,
    subtitle: rangeSubtitle(report),
    columns,
    rows,
    totalsRow: null,
  });
}

function labourWorkbook(report) {
  const columns = [
    { header: 'Trade', width: 16 },
    { header: 'Amount (₹)', width: 16, format: 'money' },
  ];
  return tableWorkbook({
    title: REPORT_TITLES.labour,
    subtitle: rangeSubtitle(report),
    columns,
    rows: report.rows.map((r) => [r.trade, toRupees(r.amountPaise)]),
    totalsRow: ['TOTAL', toRupees(report.total.labourPaise)],
  });
}

function materialWorkbook(report) {
  const columns = [
    { header: '#', width: 5 },
    { header: 'Material', width: 30 },
    { header: 'Category', width: 14 },
    { header: 'Unit', width: 8 },
    { header: 'Quantity', width: 10 },
    { header: 'Waste', width: 10 },
    { header: 'Total Qty', width: 10 },
    { header: 'Amount (₹)', width: 16, format: 'money' },
  ];
  return tableWorkbook({
    title: REPORT_TITLES.material,
    subtitle: rangeSubtitle(report),
    columns,
    rows: report.rows.map((r, i) => [
      i + 1,
      r.materialName,
      r.category ?? '',
      r.unit,
      r.quantity,
      r.wasteQty,
      r.totalQty,
      toRupees(r.amountPaise),
    ]),
    totalsRow: ['', 'TOTAL', '', '', '', '', '', toRupees(report.total.amountPaise)],
  });
}

function entityWorkbook(report) {
  const columns = [
    { header: '#', width: 5 },
    { header: 'Quotation #', width: 16 },
    { header: 'Date', width: 12 },
    { header: 'Status', width: 12 },
    { header: 'Total (₹)', width: 16, format: 'money' },
    { header: 'Profit (₹)', width: 16, format: 'money' },
  ];
  return tableWorkbook({
    title: report.type === 'client' ? REPORT_TITLES.client : REPORT_TITLES.project,
    subtitle: rangeSubtitle(report),
    columns,
    rows: report.rows.map((r, i) => [
      i + 1,
      r.quotationNumber,
      dateStr(r.issuedAt),
      r.status,
      toRupees(r.totalPaise),
      toRupees(r.profitPaise),
    ]),
    totalsRow: ['', 'TOTAL', '', '', toRupees(report.total.revenuePaise), toRupees(report.total.profitPaise)],
  });
}

/**
 * @param {import('../../../domain/reports/dto.js').ReportResult} report
 * @param {{ title?: string }} [opts]
 * @returns {ExcelJS.Workbook}
 */
export function buildReportWorkbook(report, opts = {}) {
  const wb = { sales: salesWorkbook, profit: profitWorkbook, labour: labourWorkbook, material: materialWorkbook, client: entityWorkbook, project: entityWorkbook }[report.type]?.(report);
  if (!wb) throw new Error(`Unsupported report type for export: ${report.type}`);
  if (opts.title) wb.worksheets[0].getCell(1, 1).value = opts.title;
  return wb;
}

/**
 * Render a report to an Excel Buffer.
 * @param {import('../../../domain/reports/dto.js').ReportResult} report
 * @param {{ title?: string }} [opts]
 * @returns {Promise<Buffer>}
 */
export async function reportToBuffer(report, opts = {}) {
  return buildReportWorkbook(report, opts).xlsx.writeBuffer();
}
