import crypto from 'node:crypto';
import { UserRepository } from '../repositories/user.repository.js';
import {
  signAccessToken,
  createRefreshToken,
  hashToken,
  refreshExpiryDate,
} from '../utils/token.js';
import { badRequest, conflict, unauthorized } from '../utils/AppError.js';
import { sendResetPasswordEmail } from './email.service.js';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

async function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = createRefreshToken();
  user.addRefreshToken(hashToken(refreshToken), refreshExpiryDate());
  await UserRepository.save(user);
  return { accessToken, refreshToken };
}

export const AuthService = {
  async register(data) {
    const existing = await UserRepository.findByEmail(data.email);
    if (existing) throw conflict('An account with this email already exists');

    // Public signup defaults to client unless specified
    const user = await UserRepository.create({ ...data, role: data.role || 'client' });
    const tokens = await issueTokens(user);
    return { user: user.toAuthJSON(), ...tokens };
  },

  async login({ email, password }) {
    const user = await UserRepository.findByEmailWithPassword(email);
    if (!user || !user.isActive) throw unauthorized('Invalid credentials');

    const valid = await user.comparePassword(password);
    if (!valid) throw unauthorized('Invalid credentials');

    const tokens = await issueTokens(user);
    return { user: user.toAuthJSON(), ...tokens };
  },

  async refresh(refreshToken) {
    const tokenHash = hashToken(refreshToken);
    const user = await UserRepository.findByRefreshTokenHash(tokenHash);
    if (!user) throw unauthorized('Invalid refresh token');

    const stored = user.refreshTokens.find((entry) => entry.token === tokenHash);
    if (!stored || stored.expiresAt < new Date()) {
      // A stale/rotated token is being replayed — revoke all sessions for safety.
      user.refreshTokens = [];
      await UserRepository.save(user);
      throw unauthorized('Refresh token expired');
    }

    user.removeRefreshToken(tokenHash);
    const tokens = await issueTokens(user);
    return { user: user.toAuthJSON(), ...tokens };
  },

  async logout(refreshToken) {
    const tokenHash = hashToken(refreshToken);
    const user = await UserRepository.findByRefreshTokenHash(tokenHash);
    if (user) {
      user.removeRefreshToken(tokenHash);
      await UserRepository.save(user);
    }
    return { loggedOut: true };
  },

  async me(userId) {
    const user = await UserRepository.findById(userId);
    if (!user || !user.isActive) throw unauthorized('Account not found or inactive');
    return { user: user.toAuthJSON() };
  },

  async forgotPassword(email) {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      // Do not reveal whether the email exists.
      return { sent: true };
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    user.resetPasswordExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await UserRepository.save(user);
    await sendResetPasswordEmail(user.email, token);
    return { sent: true };
  },

  async resetPassword(token, newPassword) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await UserRepository.findByResetToken(tokenHash);
    if (!user || !user.resetPasswordExpiresAt || user.resetPasswordExpiresAt < new Date()) {
      throw badRequest('Invalid or expired reset token');
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    user.refreshTokens = [];
    await UserRepository.save(user);
    return { reset: true };
  },
};

export default AuthService;
