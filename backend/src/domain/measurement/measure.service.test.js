import { describe, it, expect } from 'vitest';
import { loadRecipes } from './recipes.js';
import { measureFurnitureItem, measureItems } from './measure.service.js';
import { DomainError } from '../../shared/errors.js';

/** Real code-bundled recipes as the engine config. */
const config = { recipes: loadRecipes() };

describe('measureFurnitureItem — wardrobe', () => {
  const item = {
    category: 'wardrobe',
    width: 2400,
    height: 2400,
    depth: 600,
    shelves: 4,
    drawers: 2,
    shutters: 4,
    quantity: 1,
  };

  const result = measureFurnitureItem(item, config);

  it('resolves all 7 recipe panels with correct counts and dims', () => {
    const byName = Object.fromEntries(result.panels.map((p) => [p.name, p]));
    expect(result.panels).toHaveLength(7);

    expect(byName.side.count).toBe(2);
    expect(byName.side.w).toBe(2400);
    expect(byName.side.d).toBe(600);

    expect(byName.shelf.count).toBe(4);
    expect(byName.shelf.w).toBe(2364); // width - 2×18

    expect(byName.shutter.count).toBe(4);
    expect(byName.shutter.w).toBe(2400);
    expect(byName.shutter.d).toBe(600); // width/shutters
    expect(byName.shutter.faces).toBe(2);

    expect(byName.back.count).toBe(1);
    expect(byName.back.faces).toBe(0); // backboard is never finished
    expect(byName.back.materialType).toBe('backBoard');
  });

  it('derives hardware counts from shelves/drawers/shutters', () => {
    expect(result.hardware).toEqual({
      hinges: 12, // shutters × 3
      channels: 4, // drawers × 2
      handles: 6, // shutters + drawers
      locks: 4, // shutters
      connectors: 0,
    });
  });

  it('computes edge band, finish, area and volume correctly', () => {
    expect(result.edgeBandM).toBeCloseTo(83.568, 3); // Σ 2(w+d)×count for banded panels
    expect(result.area).toBeCloseTo(27.2304, 3);
    expect(result.materialArea).toBeCloseTo(27.2304, 3);
    expect(result.finishArea).toBeCloseTo(27.2304, 3);
    expect(result.paintArea).toBe(result.laminateArea);
    expect(result.laminateArea).toBe(result.finishArea);
    expect(result.volume).toBeCloseTo(0.4040064, 5);
  });
});

describe('measureFurnitureItem — quantity multiplier', () => {
  const base = {
    category: 'wardrobe',
    width: 2400,
    height: 2400,
    depth: 600,
    shelves: 4,
    drawers: 2,
    shutters: 4,
  };

  it('scales panels, hardware and areas by quantity', () => {
    const one = measureFurnitureItem({ ...base, quantity: 1 }, config);
    const three = measureFurnitureItem({ ...base, quantity: 3 }, config);

    expect(three.panels.find((p) => p.name === 'side').count).toBe(6);
    expect(three.hardware.hinges).toBe(one.hardware.hinges * 3);
    expect(three.area).toBeCloseTo(one.area * 3, 5);
    expect(three.volume).toBeCloseTo(one.volume * 3, 4);
  });
});

describe('measureFurnitureItem — kitchen sub-assemblies', () => {
  const item = {
    category: 'kitchen',
    width: 3600, // → ceil(3600/600) = 6 modules
    height: 720,
    depth: 450,
    shelves: 1, // per-module counts
    drawers: 1,
    shutters: 0,
    quantity: 1,
  };

  const result = measureFurnitureItem(item, config);

  it('scales sub-assembly panels by the module count', () => {
    expect(result.panels).toHaveLength(13); // 7 base + 5 wall + 1 countertop

    const doors = result.panels.filter((p) => p.name === 'moduleDoor');
    expect(doors).toHaveLength(1);
    expect(doors[0].count).toBe(12); // 2/module × 6 modules
    expect(doors[0].assembly).toBe('baseCabinet');

    const countertop = result.panels.find((p) => p.name === 'countertop');
    expect(countertop.assembly).toBe('countertop');
    expect(countertop.w).toBe(3600);
    expect(countertop.count).toBe(1);
    expect(countertop.materialType).toBe('countertop');
  });

  it('aggregates hardware across sub-assemblies', () => {
    expect(result.hardware).toEqual({
      hinges: 60, // base 6/module + wall 4/module → ×6
      channels: 12, // base drawers ×2 ×6
      handles: 30, // base 3 + wall 2 → ×6
      locks: 0,
      connectors: 18, // base 2 + wall 1 → ×6
    });
  });

  it('excludes countertop from material/finish areas', () => {
    expect(result.materialArea).toBeCloseTo(25.77456, 4); // board + backBoard only
    expect(result.area).toBeCloseTo(27.93456, 4); // + countertop 2.16
    expect(result.finishArea).toBeCloseTo(25.46352, 4); // countertop is not finished
  });
});

describe('measureFurnitureItem — validation', () => {
  it('rejects unknown category with a DomainError', () => {
    try {
      measureFurnitureItem({ category: 'yacht', width: 1000, height: 1000, depth: 500, quantity: 1 }, config);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('UNSUPPORTED_CATEGORY');
    }
  });

  it('rejects a known category with no recipe registered', () => {
    const empty = { recipes: new Map() };
    try {
      measureFurnitureItem({ category: 'bed', width: 1800, height: 450, depth: 2000, quantity: 1 }, empty);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('MISSING_RECIPE');
    }
  });

  it('rejects zero/negative dimensions', () => {
    expect(() =>
      measureFurnitureItem({ category: 'bed', width: 0, height: 450, depth: 2000, quantity: 1 }, config)
    ).toThrow();
  });

  it('rejects invalid count types', () => {
    expect(() =>
      measureFurnitureItem({ category: 'bed', width: 1800, height: 450, depth: 2000, shelves: -1, quantity: 1 }, config)
    ).toThrow();
  });
});

describe('measureFurnitureItem — config plumbing', () => {
  it('exposes the board thickness as the thk formula token', () => {
    const recipe = {
      category: 'bed',
      panels: [
        { name: 'deck', count: 1, w: 'width-2*thk', d: 'depth', thickness: 18, material: 'board' },
      ],
      hardware: { hinges: 0, channels: 0, handles: 0, locks: 0, connectors: 0 },
      edgeBand: [],
      finish: 'exterior',
    };
    const result = measureFurnitureItem(
      { category: 'bed', width: 1800, height: 450, depth: 2000, quantity: 1 },
      { recipes: { bed: recipe }, boardThickness: 25 }
    );
    expect(result.panels[0].w).toBe(1750); // 1800 − 2×25
  });
});

describe('measureItems — batch totals', () => {
  it('sums areas, volume and hardware across items', () => {
    const { items, totals } = measureItems(
      [
        { category: 'wardrobe', width: 2400, height: 2400, depth: 600, shelves: 4, drawers: 2, shutters: 4, quantity: 1 },
        { category: 'tv-unit', width: 2400, height: 450, depth: 400, shelves: 2, drawers: 0, shutters: 2, quantity: 2 },
      ],
      config
    );

    expect(items).toHaveLength(2);
    expect(totals.area).toBeCloseTo(items[0].area + items[1].area, 5);
    expect(totals.volume).toBeCloseTo(items[0].volume + items[1].volume, 6);
    expect(totals.hardware.hinges).toBe(items[0].hardware.hinges + items[1].hardware.hinges);
    expect(totals.hardware).toHaveProperty('channels');
  });

  it('rejects an empty batch', () => {
    expect(() => measureItems([], config)).toThrow();
  });
});
