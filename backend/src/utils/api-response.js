/**
 * Consistent API envelope: { success, message, data }.
 * Errors are handled by the centralized error middleware.
 */

/**
 * Send a success response.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {*} [data]
 * @param {number} [statusCode]
 */
export function success(res, message, data = null, statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

/**
 * Send a 201 Created response.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {*} [data]
 */
export function created(res, message, data = null) {
  return success(res, message, data, 201);
}

export default { success, created };
