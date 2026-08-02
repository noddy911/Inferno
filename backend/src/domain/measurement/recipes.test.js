import { describe, it, expect } from 'vitest';
import { loadRecipes, validateRecipe } from './recipes.js';
import { FURNITURE_CATEGORIES, isValidFormula, FORMULA_TOKENS } from './recipe.schema.js';

describe('isValidFormula', () => {
  it('accepts dimension formulas and arithmetic', () => {
    expect(isValidFormula('width-36', FORMULA_TOKENS)).toBe(true);
    expect(isValidFormula('width/shutters', FORMULA_TOKENS)).toBe(true);
    expect(isValidFormula('ceil(width/600)', FORMULA_TOKENS)).toBe(true);
    expect(isValidFormula('0', FORMULA_TOKENS)).toBe(true);
  });

  it('rejects unknown identifiers', () => {
    expect(isValidFormula('widht-36', FORMULA_TOKENS)).toBe(false);
  });

  it('rejects operators outside the grammar', () => {
    expect(isValidFormula('height^2', FORMULA_TOKENS)).toBe(false);
    expect(isValidFormula('width; drop table', FORMULA_TOKENS)).toBe(false);
  });

  it('rejects empty and non-string input', () => {
    expect(isValidFormula('', FORMULA_TOKENS)).toBe(false);
    expect(isValidFormula('   ', FORMULA_TOKENS)).toBe(false);
    expect(isValidFormula(42, FORMULA_TOKENS)).toBe(false);
    expect(isValidFormula(null, FORMULA_TOKENS)).toBe(false);
  });
});

describe('recipes loader', () => {
  it('loads every furniture category exactly once', () => {
    const recipes = loadRecipes();
    expect(recipes.size).toBe(FURNITURE_CATEGORIES.length);
    for (const category of FURNITURE_CATEGORIES) {
      expect(recipes.has(category)).toBe(true);
    }
  });

  it('kitchen is modeled as sub-assemblies (base + wall + countertop)', () => {
    const kitchen = loadRecipes().get('kitchen');
    expect(kitchen.subAssemblies.map((s) => s.name)).toEqual([
      'baseCabinet',
      'wallCabinet',
      'countertop',
    ]);
    expect(kitchen.panels).toHaveLength(0);
  });

  it('every recipe defines panels or sub-assemblies', () => {
    for (const recipe of loadRecipes().values()) {
      const subCount = recipe.subAssemblies?.length ?? 0;
      expect(recipe.panels.length + subCount).toBeGreaterThan(0);
    }
  });
});

describe('validateRecipe', () => {
  /** Build a plain-object copy of a valid recipe for mutation. */
  const validWardrobe = () => JSON.parse(JSON.stringify(loadRecipes().get('wardrobe')));

  it('accepts a valid wardrobe recipe', () => {
    expect(() => validateRecipe(validWardrobe())).not.toThrow();
  });

  it('rejects a recipe with neither panels nor sub-assemblies', () => {
    expect(() => validateRecipe({ category: 'wardrobe', panels: [], hardware: {}, edgeBand: [] })).toThrow();
  });

  it('rejects an unknown category', () => {
    const bad = validWardrobe();
    bad.category = 'couch';
    expect(() => validateRecipe(bad)).toThrow();
  });

  it('rejects an unknown panel material', () => {
    const bad = validWardrobe();
    bad.panels[0].material = 'bogus';
    expect(() => validateRecipe(bad)).toThrow();
  });

  it('rejects a dimension formula with an unknown token', () => {
    const bad = validWardrobe();
    bad.panels[0].w = 'widht';
    expect(() => validateRecipe(bad)).toThrow();
  });

  it('rejects edgeBand referencing a missing panel', () => {
    const bad = validWardrobe();
    bad.edgeBand = ['does-not-exist'];
    expect(() => validateRecipe(bad)).toThrow();
  });
});
