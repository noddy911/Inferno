import { notFound } from '../utils/AppError.js';

/** 404 handler for unmatched routes. */
export function notFoundHandler(req, res, next) {
  next(notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

export default notFoundHandler;
