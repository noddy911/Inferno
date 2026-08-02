import { describe, it, expect } from 'vitest';
import { cutPanels, DEFAULT_SHEET_SIZES } from './cut.service.js';
import { DomainError } from '../../shared/errors.js';

const sheet = '8x4'; // 2440×1220
const kerf = 3;

describe('cutPanels — rotation', () => {
  it('packs tall-thin panels by rotating them 90°', () => {
    const result = cutPanels({
      sheetKey: sheet,
      kerf,
      panels: [
        { label: 'tall-1', w: 100, d: 2400 }, // natural: 100×2400 → exceeds sheet height
        { label: 'tall-2', w: 100, d: 2400 },
      ],
    });

    expect(result.sheetCount).toBe(1);
    const panels = result.layout.flatMap((s) => s.panels);
    expect(panels).toHaveLength(2);
    expect(panels.every((p) => p.rotated)).toBe(true);

    // Rotated they are 2400 wide × 100 tall — both on sheet 0, second on a fresh shelf.
    const [a, b] = panels;
    expect(a).toMatchObject({ x: 0, y: 0, w: 2400, d: 100, rotated: true });
    expect(b).toMatchObject({ x: 0, y: 103, w: 2400, d: 100, rotated: true }); // + kerf below
    expect(result.usedArea).toBeCloseTo(0.48, 4); // 2 × 100×2400 mm²
  });

  it('does not rotate when the natural orientation is optimal', () => {
    const result = cutPanels({
      sheetKey: sheet,
      panels: [{ label: 'flat', w: 2400, d: 100 }],
    });
    const p = result.layout[0].panels[0];
    expect(p.rotated).toBe(false);
    expect(p).toMatchObject({ x: 0, y: 0, w: 2400, d: 100 });
  });
});

describe('cutPanels — kerf', () => {
  it('defaults kerf to 3 mm', () => {
    const result = cutPanels({
      sheetKey: sheet,
      panels: [{ label: 'a', w: 1200, d: 100 }, { label: 'b', w: 1200, d: 100 }],
    });
    // 1200 + 3 + 1200 = 2403 ≤ 2440 → same shelf, b at x=1203
    expect(result.layout[0].panels[1]).toMatchObject({ x: 1203, y: 0 });
  });

  it('applies the kerf between panels (pushes the second sheet open)', () => {
    const result = cutPanels({
      sheetKey: sheet,
      kerf: 3,
      panels: [{ label: 'a', w: 1220, d: 1220 }, { label: 'b', w: 1220, d: 1220 }],
    });
    // 1220 + 3 + 1220 = 2443 > 2440 → b cannot share a's shelf → a second sheet
    expect(result.sheetCount).toBe(2);
    expect(result.layout[0].panels[0]).toMatchObject({ x: 0, y: 0, w: 1220, d: 1220 });
    expect(result.layout[1].panels[0]).toMatchObject({ x: 0, y: 0, w: 1220, d: 1220 });
  });

  it('fits both on one shelf when kerf is zero', () => {
    const result = cutPanels({
      sheetKey: sheet,
      kerf: 0,
      panels: [{ label: 'a', w: 1220, d: 1220 }, { label: 'b', w: 1220, d: 1220 }],
    });
    // 1220 + 0 + 1220 = 2440 → same shelf
    expect(result.sheetCount).toBe(1);
    expect(result.layout[0].panels[1]).toMatchObject({ x: 1220, y: 0 });
  });
});

describe('cutPanels — residual refinement', () => {
  it('re-homes an orphaned small panel into an earlier sheet and frees the extra sheet', () => {
    const result = cutPanels({
      sheetKey: sheet,
      kerf,
      panels: [
        { label: 'A', w: 2000, d: 600 },
        { label: 'B', w: 2000, d: 600 },
        { label: 'C', w: 400, d: 500 },
        { label: 'D', w: 400, d: 500 },
      ],
    });

    // Primary pass leaves D alone on sheet 1; refinement folds it into sheet 0's
    // right-edge strip beside A (x=2003, y=0).
    expect(result.sheetCount).toBe(1);
    const panels = result.layout[0].panels;
    expect(panels).toHaveLength(4);
    const d = panels.find((p) => p.label === 'D');
    expect(d).toMatchObject({ x: 2003, y: 0, w: 400, d: 500, rotated: false });
  });
});

describe('cutPanels — waste figures & remaining material', () => {
  it('reports waste and the largest leftover rectangle', () => {
    const result = cutPanels({
      sheetKey: sheet,
      kerf,
      panels: [
        { label: 'A', w: 2000, d: 600 },
        { label: 'B', w: 2000, d: 600 },
        { label: 'C', w: 400, d: 500 },
        { label: 'D', w: 400, d: 500 },
      ],
    });

    // used = 2,800,000 mm²; one sheet = 2,976,800 mm²
    expect(result.sheetCount).toBe(1);
    expect(result.usedArea).toBeCloseTo(2.8, 5);
    expect(result.wasteArea).toBeCloseTo(0.1768, 5);
    expect(result.wastePct).toBeCloseTo(176800 / 2976800 * 100, 3);

    // Largest leftover: full-width 17 mm strip below the last shelf.
    expect(result.remainingMaterial).toEqual({ x: 0, y: 1203, w: 2440, h: 17 });
    expect(result.nextSizeHint).toBeNull(); // waste is well under 35%
  });
});

describe('cutPanels — oversized panels', () => {
  it('rejects a panel that fits neither orientation, naming the panel', () => {
    try {
      cutPanels({
        sheetKey: sheet,
        panels: [{ label: 'oversized-top', w: 3000, d: 1220 }],
      });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('PANEL_EXCEEDS_SHEET');
      expect(err.message).toContain('oversized-top');
      expect(err.details.sheet.width).toBe(2440);
    }
  });
});

describe('cutPanels — next-size hint', () => {
  it('suggests the next sheet size up when waste exceeds 35%', () => {
    const result = cutPanels({
      sheetKey: '8x4',
      panels: [{ label: 'small', w: 600, d: 600 }], // 87.9% waste
    });
    expect(result.wastePct).toBeGreaterThan(35);
    expect(result.nextSizeHint).toEqual({
      sheetKey: '9x4',
      width: 2745,
      height: 1220,
    });
  });

  it('returns no hint for the largest sheet size', () => {
    const result = cutPanels({
      sheetKey: '10x4',
      panels: [{ label: 'small', w: 600, d: 600 }],
    });
    expect(result.nextSizeHint).toBeNull();
  });
});

describe('cutPanels — sheet catalogue', () => {
  it('accepts custom sheet sizes from config', () => {
    const result = cutPanels({
      sheetKey: 'custom',
      panels: [{ label: 'a', w: 1800, d: 900 }],
      sheetSizes: [{ key: 'custom', width: 2000, height: 1000 }],
    });
    expect(result.sheetSize).toEqual({ key: 'custom', width: 2000, height: 1000 });
    expect(result.sheetCount).toBe(1);
  });

  it('rejects an unknown sheet key with a DomainError', () => {
    try {
      cutPanels({ sheetKey: '12x6', panels: [{ label: 'a', w: 500, d: 500 }] });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('INVALID_INPUT');
    }
  });
});

describe('cutPanels — validation', () => {
  it('rejects an empty panel list', () => {
    expect(() => cutPanels({ sheetKey: sheet, panels: [] })).toThrow();
  });

  it('rejects non-positive dimensions', () => {
    expect(() => cutPanels({ sheetKey: sheet, panels: [{ label: 'a', w: 0, d: 500 }] })).toThrow();
    expect(() => cutPanels({ sheetKey: sheet, panels: [{ label: 'a', w: 500, d: -1 }] })).toThrow();
  });

  it('rejects a negative kerf', () => {
    expect(() =>
      cutPanels({ sheetKey: sheet, kerf: -1, panels: [{ label: 'a', w: 500, d: 500 }] })
    ).toThrow();
  });
});

describe('cutPanels — 2000-panel smoke test', () => {
  it('packs 2000 panels deterministically and fast', () => {
    const panels = Array.from({ length: 2000 }, (_, i) => ({
      label: `p${i}`,
      w: 300 + ((i * 137) % 700),
      d: 200 + ((i * 97) % 900),
    }));

    const start = performance.now();
    const result = cutPanels({ sheetKey: sheet, panels });
    const elapsed = performance.now() - start;

    expect(result.sheetCount).toBeGreaterThan(0);
    const placed = result.layout.reduce((n, s) => n + s.panels.length, 0);
    expect(placed).toBe(2000); // every panel placed exactly once
    expect(elapsed).toBeLessThan(5000);
    expect(result.wastePct).toBeGreaterThanOrEqual(0);
  });

  it('ships a stable default sheet catalogue (8x4 / 9x4 / 10x4)', () => {
    expect(DEFAULT_SHEET_SIZES.map((s) => s.key)).toEqual(['8x4', '9x4', '10x4']);
    expect(DEFAULT_SHEET_SIZES[0]).toEqual({ key: '8x4', width: 2440, height: 1220 });
  });
});
