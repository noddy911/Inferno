/**
 * Operational error carrying an HTTP status code and optional field errors.
 * Used across controllers/services and handled by the centralized error middleware.
 */
export class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} [statusCode]
   * @param {string[]} [errors]
   */
  constructor(message, statusCode = 500, errors = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
  }
}

export const badRequest = (message, errors = []) => new AppError(message, 400, errors);
export const unauthorized = (message = 'Unauthorized') => new AppError(message, 401);
export const forbidden = (message = 'Forbidden') => new AppError(message, 403);
export const notFound = (message = 'Resource not found') => new AppError(message, 404);
export const conflict = (message) => new AppError(message, 409);

export default AppError;
