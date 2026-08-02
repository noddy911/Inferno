import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { parseDuration } from './duration.js';

/**
 * Access tokens are short-lived JWTs carrying { sub: userId, role }.
 * Refresh tokens are opaque random strings; only their SHA-256 hash is stored,
 * so a database leak does not expose usable refresh tokens.
 */

/** @param {{ id: string, role: string }} user */
export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

/** @returns {import('jsonwebtoken').JwtPayload} */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

/** Generate a new opaque refresh token. */
export function createRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

/** @param {string} token */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Expiry Date for a fresh refresh token. */
export function refreshExpiryDate() {
  return new Date(Date.now() + parseDuration(env.JWT_REFRESH_EXPIRES_IN));
}
