/**
 * Shared JSDoc types for the frontend.
 * Mirrors the backend's API envelope and public user shape.
 */

/**
 * @typedef {'admin'|'designer'|'sales'|'client'} UserRole
 */

/**
 * Public, safe-to-return user representation (matches backend toAuthJSON).
 * @typedef {Object} AuthUser
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {UserRole} role
 * @property {string|null} phone
 * @property {string|null} avatar
 */

/**
 * @typedef {Object} AuthSession
 * @property {AuthUser} user
 * @property {string} accessToken
 * @property {string} refreshToken
 */

/**
 * @typedef {Object} ApiEnvelope
 * @property {boolean} success
 * @property {string} message
 * @property {any} data
 */

export {};
