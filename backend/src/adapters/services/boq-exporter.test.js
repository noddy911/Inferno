import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { buildBoq } from '../../domain/boq/boq.service.js';
import { buildBoqWorkbook, boqToBuffer } from './boq-exporter.js';

const boq = buildBoq({
  items: [
    { materialId: 'BD-PLY-18', name: 'Plywood 18mm', category: 'board', type: 'plywood', unit: 'sheet', quantity: 6, wasteQty: 1, rate: 2800 },
    { materialId: 'HW-HINGE', name: 'Hinges', category: 'hardware', type: 'hinge', unit: 'pc', quantity: 12, wasteQty: 0, rate: 85 },
    { materialId: 'FN-LAM', name: 'Laminate', category: 'finish', type: 'laminate', unit: 'sqft', quantity: 30, wasteQty: 2.25, rate: 120 },
  ],
});

/** Row layout: 1 title, 2 date, 3 blank, 4 header, 5.. items, last totals. */
const itemRow = (wb, i) => wb.worksheets[0].getRow(4 + i);

describe('boq-exporter — workbook rows match items', () => {
  it('renders a header row and one data row per grouped item', () => {
    const wb = buildBoqWorkbook(boq);
    const ws = wb.worksheets[0];

    expect(ws.getRow(4).getCell(2).value).toBe('Material');
    expect(ws.getRow(4).getCell(6).value).toBe('Quantity');
    expect(ws.getRow(4).getCell(10).value).toBe('Amount (₹)');

    expect(boq.items).toHaveLength(3);
    expect(boq.items.map((l) => l.name)).toEqual(['Plywood 18mm', 'Laminate', 'Hinges']); // sorted board→finish→hardware
    expect(itemRow(wb, 1).getCell(2).value).toBe('Plywood 18mm');
    expect(itemRow(wb, 1).getCell(1).value).toBe(1);
    expect(itemRow(wb, 1).getCell(6).value).toBe(6); // quantity
    expect(itemRow(wb, 1).getCell(7).value).toBe(1); // wasteQty
    expect(itemRow(wb, 1).getCell(8).value).toBe(7); // totalQty = 6 + 1
    expect(itemRow(wb, 2).getCell(2).value).toBe('Laminate');
    expect(itemRow(wb, 2).getCell(7).value).toBe(2.25);
    expect(itemRow(wb, 2).getCell(8).value).toBe(32.25);
    expect(itemRow(wb, 2).getCell(10).value).toBe(3870);
    expect(itemRow(wb, 3).getCell(2).value).toBe('Hinges');
    expect(itemRow(wb, 3).getCell(10).value).toBe(1020);
  });

  it('writes a TOTAL row with the sum of amounts', () => {
    const wb = buildBoqWorkbook(boq);
    const ws = wb.worksheets[0];
    const totalRow = ws.lastRow;
    expect(totalRow.getCell(2).value).toBe('TOTAL');
    // 7×2800 + 12×85 + 32.25×120 = 19600 + 1020 + 3870 = 24490
    expect(totalRow.getCell(10).value).toBeCloseTo(24490, 2);
  });

  it('produces a valid xlsx buffer that round-trips', async () => {
    const buffer = await boqToBuffer(boq);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);

    const loaded = new ExcelJS.Workbook();
    await loaded.xlsx.load(buffer);
    const ws = loaded.worksheets[0];
    expect(ws.getRow(4).getCell(2).value).toBe('Material');
    expect(ws.lastRow.getCell(2).value).toBe('TOTAL');
  });
});

describe('boq-exporter — empty BOQ', () => {
  it('still produces a valid workbook with headers, a no-data note, and zero totals', async () => {
    const empty = buildBoq({ items: [] });
    expect(empty.empty).toBe(true);

    const wb = buildBoqWorkbook(empty);
    const ws = wb.worksheets[0];
    expect(ws.getRow(4).getCell(2).value).toBe('Material');
    expect(ws.getRow(5).getCell(2).value).toBe('No data');
    expect(ws.lastRow.getCell(2).value).toBe('TOTAL');
    expect(ws.lastRow.getCell(10).value).toBe(0);

    const buffer = await boqToBuffer(empty);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
