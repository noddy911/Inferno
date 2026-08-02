import { AuthService } from '../services/auth.service.js';
import { success, created } from '../utils/api-response.js';

/**
 * Thin controllers — validation happens in middleware, logic lives in services.
 * Express 5 forwards rejected promises to the error middleware automatically.
 */

export async function register(req, res) {
  const result = await AuthService.register(req.validated.body);
  return created(res, 'Account created successfully', result);
}

export async function login(req, res) {
  const result = await AuthService.login(req.validated.body);
  return success(res, 'Login successful', result);
}

export async function refresh(req, res) {
  const result = await AuthService.refresh(req.validated.body.refreshToken);
  return success(res, 'Tokens refreshed', result);
}

export async function logout(req, res) {
  const result = await AuthService.logout(req.validated.body.refreshToken);
  return success(res, 'Logged out successfully', result);
}

export async function forgotPassword(req, res) {
  const result = await AuthService.forgotPassword(req.validated.body.email);
  return success(res, 'If that email exists, a reset link has been sent', result);
}

export async function resetPassword(req, res) {
  const { token, password } = req.validated.body;
  const result = await AuthService.resetPassword(token, password);
  return success(res, 'Password reset successfully', result);
}

export async function me(req, res) {
  const result = await AuthService.me(req.user.id);
  return success(res, 'Authenticated user', result);
}

export default {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  me,
};
