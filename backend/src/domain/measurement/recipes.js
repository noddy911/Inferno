/**
 * Loads and validates the code-bundled furniture recipes.
 *
 * Recipes are versioned JSON in ./recipes/ (one file per category). They are read once
 * and cached. The loader is the only module that touches the recipe files; the
 * measurement engine receives the parsed recipe map as config input and stays pure.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { recipeSchema, FURNITURE_CATEGORIES } from './recipe.schema.js';
import { invalidRecipe } from '../../shared/errors.js';

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const RECIPES_DIR = path.join(THIS_DIR, 'recipes');

/** @type {Map<string, import('./recipe.schema.js').FurnitureRecipe> | null} */
let cache = null;

/**
 * Parse + validate one raw recipe object (used by the loader and by tests).
 * @param {unknown} raw
 * @returns {import('./recipe.schema.js').FurnitureRecipe}
 */
export function validateRecipe(raw) {
  /** @type {import('./recipe.schema.js').FurnitureRecipe} */
  let recipe;
  try {
    recipe = recipeSchema.parse(raw);
  } catch (err) {
    throw invalidRecipe(`Invalid recipe: ${err.message}`);
  }

  const checkEdgeBand = (panelNames, edgeBand, scopeLabel) => {
    for (const name of edgeBand) {
      if (!panelNames.has(name)) {
        throw invalidRecipe(
          `edgeBand references unknown panel "${name}" ${scopeLabel}`,
          { scopeLabel, name }
        );
      }
    }
  };

  const topLevelNames = new Set(recipe.panels.map((p) => p.name));
  checkEdgeBand(topLevelNames, recipe.edgeBand, `in recipe "${recipe.category}"`);

  for (const sub of recipe.subAssemblies ?? []) {
    const subNames = new Set(sub.panels.map((p) => p.name));
    checkEdgeBand(subNames, sub.edgeBand, `in sub-assembly "${sub.name}" of "${recipe.category}"`);
  }

  return recipe;
}

/**
 * Load all recipe files and return a Map keyed by category.
 * Throws if any recipe is invalid or a category is missing.
 * @returns {Map<string, import('./recipe.schema.js').FurnitureRecipe>}
 */
export function loadRecipes() {
  if (cache) return cache;

  const files = readdirSync(RECIPES_DIR).filter((f) => f.endsWith('.json')).sort();
  const recipes = new Map();

  for (const file of files) {
    const raw = JSON.parse(readFileSync(path.join(RECIPES_DIR, file), 'utf8'));
    const recipe = validateRecipe(raw);
    if (recipes.has(recipe.category)) {
      throw invalidRecipe(`Duplicate recipe category "${recipe.category}" in ${file}`);
    }
    recipes.set(recipe.category, recipe);
  }

  for (const category of FURNITURE_CATEGORIES) {
    if (!recipes.has(category)) {
      throw invalidRecipe(`Missing recipe file for category "${category}"`, { category });
    }
  }

  cache = recipes;
  return recipes;
}

/**
 * Get one recipe by category (loads all on first call).
 * @param {string} category
 * @returns {import('./recipe.schema.js').FurnitureRecipe}
 */
export function getRecipe(category) {
  const recipes = loadRecipes();
  const recipe = recipes.get(category);
  if (!recipe) throw invalidRecipe(`Unknown recipe category: "${category}"`, { category });
  return recipe;
}

// Allow the loader to run standalone for debugging: `node src/domain/measurement/recipes.js`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const recipes = loadRecipes();
  console.log(`Loaded ${recipes.size} recipes:`);
  for (const [category, recipe] of recipes) {
    const sub = recipe.subAssemblies?.length ? ` (${recipe.subAssemblies.length} sub-assemblies)` : '';
    console.log(`  - ${category}: ${recipe.panels.length} panels${sub}`);
  }
}
