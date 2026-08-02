import { ApiError } from '@/services/api-client';

/**
 * Human-readable message from a thrown error.
 * @param {unknown} err
 * @param {string} fallback
 * @returns {string}
 */
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
