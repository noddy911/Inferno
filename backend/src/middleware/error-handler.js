import mongoose from 'mongoose';
import { logger } from '../config/logger.js';
import { DomainError } from '../shared/errors.js';

/**
 * HTTP status for each domain error code (design §10). Validation-ish codes → 400;
 * state/data conflicts → 409; missing resources → 404; external dependency → 502.
 * Codes missing from this map default to 400.
 */
export const DOMAIN_STATUS = {
  INVALID_INPUT: 400,
  INVALID_RECIPE: 400,
  MISSING_RECIPE: 400,
  UNSUPPORTED_CATEGORY: 400,
  PANEL_EXCEEDS_SHEET: 400,
  PRICING_BOUNDS: 400,
  BOQ_RATE_CONFLICT: 409,
  NOT_FOUND: 404,
  INVALID_STATE: 409,
  AI_UNAVAILABLE: 502,
};

/**
 * Centralized error handler. Never exposes stack traces to clients.
 * Domain errors (engines) become a structured payload the frontend can display:
 * `{ success, code, message, details, errors }`. Non-domain errors fall back to the
 * legacy `{ success, message, errors }` envelope.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Domain errors (pure engines) — carry a machine code + structured details.
  if (err instanceof DomainError || err.isDomain) {
    const statusCode = DOMAIN_STATUS[err.code] ?? 400;
    const details = err.details ?? undefined;
    logger.warn(`domain:${err.code} ${req.method} ${req.originalUrl}`, {
      code: err.code,
      message: err.message,
      details,
    });
    return res.status(statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(details ? { details } : {}),
      errors: [],
    });
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];

  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => e.message);
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = 'Invalid request parameter';
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'A record with that value already exists';
  }

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl}`, { error: err.message, stack: err.stack });
  } else {
    logger.warn(`${statusCode} ${req.method} ${req.originalUrl}: ${message}`);
  }

  res.status(statusCode).json({ success: false, message, errors });
}

export default errorHandler;
