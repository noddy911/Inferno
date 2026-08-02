/**
 * Safe evaluator for the constrained formula grammar used by construction recipes.
 *
 * Grammar: decimal numbers, identifiers, `+ - * / ( )`, and the functions `ceil()` / `floor()`.
 * Recipes are validated against this grammar at load time (recipe.schema.js), and the
 * evaluator re-validates identifiers against the supplied context — so it never uses
 * `eval()` or any function other than ceil/floor.
 */

import { invalidInput } from './errors.js';

/**
 * Evaluate a formula string against a numeric context.
 * @param {string} formula
 * @param {Record<string, number>} context identifier → value
 * @returns {number}
 */
export function evaluateFormula(formula, context) {
  const src = formula.trim();
  if (!src) throw invalidInput('Formula is empty');
  let pos = 0;

  const skipWs = () => {
    while (pos < src.length && /\s/.test(src[pos])) pos += 1;
  };
  const parsePrimary = () => {
    skipWs();
    const ch = src[pos];
    if (ch === undefined) throw invalidInput(`Formula "${formula}" ends unexpectedly`);

    if (ch === '(') {
      pos += 1;
      const value = parseAdditive();
      skipWs();
      if (src[pos] !== ')') throw invalidInput(`Unbalanced parentheses in formula "${formula}"`);
      pos += 1;
      return value;
    }

    if (/[0-9.]/.test(ch)) {
      const start = pos;
      while (pos < src.length && /[0-9.]/.test(src[pos])) pos += 1;
      const num = Number(src.slice(start, pos));
      if (!Number.isFinite(num)) throw invalidInput(`Invalid number in formula "${formula}"`);
      return num;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      const start = pos;
      while (pos < src.length && /[a-zA-Z0-9_]/.test(src[pos])) pos += 1;
      const word = src.slice(start, pos);

      if (word === 'ceil' || word === 'floor') {
        skipWs();
        if (src[pos] !== '(') throw invalidInput(`"${word}(" expected in formula "${formula}"`);
        pos += 1;
        const arg = parseAdditive();
        skipWs();
        if (src[pos] !== ')') throw invalidInput(`Unbalanced "${word}" call in formula "${formula}"`);
        pos += 1;
        return word === 'ceil' ? Math.ceil(arg) : Math.floor(arg);
      }

      const value = context[word];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw invalidInput(`Unknown token "${word}" in formula "${formula}"`);
      }
      return value;
    }

    throw invalidInput(`Unexpected character "${ch}" in formula "${formula}"`);
  };

  const parseTerm = () => {
    let value = parsePrimary();
    for (;;) {
      skipWs();
      const ch = src[pos];
      if (ch === '*') {
        pos += 1;
        value *= parsePrimary();
      } else if (ch === '/') {
        pos += 1;
        const divisor = parsePrimary();
        if (divisor === 0) throw invalidInput(`Division by zero in formula "${formula}"`);
        value /= divisor;
      } else {
        return value;
      }
    }
  };

  const parseAdditive = () => {
    let value = parseTerm();
    for (;;) {
      skipWs();
      const ch = src[pos];
      if (ch === '+') {
        pos += 1;
        value += parseTerm();
      } else if (ch === '-') {
        pos += 1;
        value -= parseTerm();
      } else {
        return value;
      }
    }
  };

  const result = parseAdditive();
  skipWs();
  if (pos !== src.length) {
    throw invalidInput(`Unexpected trailing characters in formula "${formula}"`);
  }
  if (!Number.isFinite(result)) throw invalidInput(`Formula "${formula}" produced a non-finite value`);
  return result;
}
