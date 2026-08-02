/**
 * Zod schema + validation helpers for furniture construction recipes.
 *
 * A recipe describes the panels a standard unit of a furniture category breaks into,
 * expressed as formulas over the input dimensions/counts. Recipes are code-bundled
 * versioned JSON (docs/phase-3-design.md §5.2) validated at load time.
 */

import { z } from 'zod';

export const MATERIAL_TYPES = [
  'board',
  'backBoard',
  'finish',
  'hardware',
  'glass',
  'mirror',
  'aluminium',
  'countertop',
];

export const FURNITURE_CATEGORIES = [
  'wardrobe',
  'kitchen',
  'tv-unit',
  'bed',
  'dining',
  'vanity',
  'shoe-rack',
  'loft',
  'study-table',
  'office-table',
];

/** Tokens usable inside formulas: input dimensions/counts plus math helpers. */
export const FORMULA_TOKENS = [
  'width',
  'height',
  'depth',
  'shelves',
  'drawers',
  'shutters',
  'quantity',
  'thk',
  'ceil',
  'floor',
];

// Formula grammar: digits, + - * / ( ), . and lowercase identifiers only.
const FORMULA_RE = /^[0-9+\-*/()\s.a-z_]+$/i;
const IDENT_RE = /[a-z_][a-z0-9_]*/gi;

/**
 * Validate a formula string against the allowed token set.
 * Rejects unknown identifiers, empty strings, and anything outside the grammar.
 * @param {unknown} formula
 * @param {string[]} allowedTokens
 * @returns {boolean}
 */
export function isValidFormula(formula, allowedTokens) {
  if (typeof formula !== 'string' || !formula.trim()) return false;
  if (!FORMULA_RE.test(formula)) return false;
  const identifiers = formula.match(IDENT_RE) ?? [];
  return identifiers.every((token) => allowedTokens.includes(token.toLowerCase()));
}

const countField = z.union([
  z.number().int().nonnegative(),
  z.string().refine((v) => isValidFormula(v, FORMULA_TOKENS), {
    message: 'count must be a non-negative integer or a formula over input fields',
  }),
]);

const dimensionField = z.string().refine((v) => isValidFormula(v, FORMULA_TOKENS), {
  message: 'must be a formula over width/height/depth and arithmetic',
});

const panelSchema = z.object({
  name: z.string().min(1).max(40),
  count: countField,
  w: dimensionField,
  d: dimensionField,
  thickness: z.number().positive().default(18),
  material: z.enum(MATERIAL_TYPES),
  faces: z.number().int().min(0).max(2).default(1),
});

const hardwareSchema = z.object({
  hinges: countField.default(0),
  channels: countField.default(0),
  handles: countField.default(0),
  locks: countField.default(0),
  connectors: countField.default(0),
});

const subAssemblySchema = z.lazy(() =>
  z.object({
    name: z.string().min(1).max(40),
    count: countField,
    panels: z.array(panelSchema).min(1),
    hardware: hardwareSchema,
    edgeBand: z.array(z.string()),
  })
);

export const recipeSchema = z
  .object({
    category: z.enum(FURNITURE_CATEGORIES),
    displayName: z.string().optional(),
    panels: z.array(panelSchema),
    hardware: hardwareSchema,
    edgeBand: z.array(z.string()),
    finish: z.enum(['exterior', 'full', 'partial']).default('exterior'),
    subAssemblies: z.array(subAssemblySchema).optional(),
  })
  .superRefine((recipe, ctx) => {
    const hasPanels = recipe.panels.length > 0;
    const hasSubAssemblies = (recipe.subAssemblies ?? []).length > 0;
    if (!hasPanels && !hasSubAssemblies) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['panels'],
        message: 'recipe must define panels or sub-assemblies',
      });
    }
  });

/** @typedef {z.infer<typeof recipeSchema>} FurnitureRecipe */
