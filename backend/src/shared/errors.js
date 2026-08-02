/**
 * Domain-level errors.
 *
 * Domain code (domain/) throws DomainError instances carrying a stable machine code.
 * Adapters (http/) map the code to an HTTP status via the existing AppError middleware.
 * Domain never throws AppError — AppError lives in the auth module's utils.
 */

/**
 * @typedef {'INVALID_INPUT' | 'INVALID_RECIPE' | 'MISSING_RECIPE' | 'UNSUPPORTED_CATEGORY'
 *   | 'PANEL_EXCEEDS_SHEET' | 'PRICING_BOUNDS' | 'BOQ_RATE_CONFLICT'
 *   | 'NOT_FOUND' | 'INVALID_STATE' | 'AI_UNAVAILABLE'} DomainErrorCode
 */

export class DomainError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {*} [details]
   */
  constructor(message, code = 'INVALID_INPUT', details = null) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
    this.isDomain = true;
  }
}

/** @param {string} message @param {*} [details] */
export const invalidInput = (message, details) => new DomainError(message, 'INVALID_INPUT', details);

/** @param {string} message @param {*} [details] */
export const invalidRecipe = (message, details) => new DomainError(message, 'INVALID_RECIPE', details);

/** @param {string} category */
export const unsupportedCategory = (category) =>
  new DomainError(`Unsupported furniture category: ${category}`, 'UNSUPPORTED_CATEGORY', { category });

/** @param {string} category */
export const missingRecipe = (category) =>
  new DomainError(`No construction recipe registered for category: ${category}`, 'MISSING_RECIPE', {
    category,
  });

/** @param {string} panel @param {{width:number,height:number}} sheet */
export const panelExceedsSheet = (panel, sheet) =>
  new DomainError(
    `Panel "${panel}" does not fit any orientation on sheet ${sheet.width}×${sheet.height}mm. ` +
      'It must be split in the design; panels are never auto-split.',
    'PANEL_EXCEEDS_SHEET',
    { panel, sheet }
  );

/** @param {string} message @param {*} [details] */
export const pricingBounds = (message, details) => new DomainError(message, 'PRICING_BOUNDS', details);

/**
 * @param {string} materialId
 * @param {number[]} rates
 * @param {Array<object|undefined>} [sources] per-line provenance (projectId/roomId/
 *   furnitureId/panel) for debugging and the frontend error panel
 */
export const boqRateConflict = (materialId, rates, sources = []) =>
  new DomainError(
    `Material "${materialId}" resolved to different rates (${rates.join(', ')}). ` +
      'A material must have one price; the same SKU cannot carry two rates in one BOQ. ' +
      'Fix the conflicting material price at the source and regenerate.',
    'BOQ_RATE_CONFLICT',
    { materialId, rates, sources: sources.filter(Boolean) }
  );

/** @param {string} message */
export const notFound = (message) => new DomainError(message, 'NOT_FOUND');

/** @param {string} message @param {*} [details] */
export const invalidState = (message, details) => new DomainError(message, 'INVALID_STATE', details);

/** @param {string} message @param {*} [details] */
export const aiUnavailable = (message, details) => new DomainError(message, 'AI_UNAVAILABLE', details);

/**
 * Map a ZodError into "path: message" strings for the `errors`/`details` payloads
 * (matches the HTTP `validate` middleware's shape). Pure — takes any error with an
 * `issues` array (ZodError) and returns strings.
 * @param {{ issues: Array<{ path: (string|number)[], message: string }> }} error
 * @returns {string[]}
 */
export const zodErrors = (error) =>
  error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);

export default DomainError;
