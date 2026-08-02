/**
 * Shared JSDoc types for the backend.
 * Provides editor IntelliSense in place of compile-time typing.
 */

/**
 * @typedef {'admin' | 'designer' | 'sales' | 'client'} UserRole
 */

/**
 * @typedef {Object} UserDoc
 * @property {string} _id
 * @property {string} name
 * @property {string} email
 * @property {string} password
 * @property {UserRole} role
 * @property {string} [phone]
 * @property {string} [avatar]
 * @property {boolean} isActive
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} RefreshTokenDoc
 * @property {string} token
 * @property {string} userId
 * @property {string} expiresAt
 * @property {string} createdAt
 */

/**
 * @typedef {Object} ApiEnvelope
 * @property {boolean} success
 * @property {string} message
 * @property {*} data
 */

export {};
